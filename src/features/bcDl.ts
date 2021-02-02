import { AxiosResponse } from 'axios'
import { Command, Opts } from 'decline-ts'
import { apply } from 'fp-ts'
import { flow, pipe } from 'fp-ts/function'
import { JSDOM } from 'jsdom'

import { AlbumMetadata } from '../models/AlbumMetadata'
import { Dir, File, FileOrDir } from '../models/FileOrDir'
import { Validation } from '../models/Validation'
import { Either, Future, List, Maybe, NonEmptyArray, Tuple } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'
import { TagsUtils } from '../utils/TagsUtils'

export type HttpGet = (url: string) => Future<AxiosResponse<string>>
export type HttpGetBuffer = (url: string) => Future<AxiosResponse<Buffer>>
export type ExecYoutubeDl = (url: string) => Future<void>

type Args = {
  readonly musicLibraryDir: Dir
  readonly url: string
  readonly genre: string
}

type FileWithTrack = Tuple<File, AlbumMetadata.Track>

const musicLibraryDirMetavar = 'music library dir'

const cmd = Command({ name: 'bc-dl', header: 'youtube-dl for Bandcamp, with mp3 tags' })(
  pipe(
    apply.sequenceT(Opts.opts)(
      Opts.argument()(musicLibraryDirMetavar),
      Opts.argument()('url'),
      Opts.argument()('genre'),
    ),
    Opts.map(([musicLibraryDir, url, genre]) => ({
      musicLibraryDir,
      url,
      genre,
    })),
  ),
)

export const bcDl = (
  argv: List<string>,
  httpGet: HttpGet,
  httpGetBuffer: HttpGetBuffer,
  execYoutubeDl: ExecYoutubeDl,
): Future<void> =>
  pipe(
    Future.Do,
    Future.bind('args', () => parseCommand(argv)),
    Future.bind('metadata', ({ args }) => getMetadata(httpGet)(args)),
    Future.bind('albumDir', ({ args, metadata }) =>
      ensureAlbumDirectory(args.musicLibraryDir, metadata),
    ),
    // Future.bind('initialCwd', () => Future.fromIOEither(FsUtils.cwd())),
    Future.do(({ albumDir }) => Future.fromIOEither(FsUtils.chdir(albumDir))),
    Future.do(({ args }) => execYoutubeDl(args.url)),
    Future.bind('mp3files', ({ albumDir }) => getMp3Files(albumDir)),
    Future.bind('cover', ({ metadata }) => downloadCover(httpGetBuffer)(metadata.coverUrl)),
    Future.chain(({ mp3files, metadata, cover }) => writeMp3TagsToFiles(mp3files, metadata, cover)),
  )

const parseCommand = (argv: List<string>): Future<Args> =>
  pipe(
    cmd,
    Command.parse(argv),
    Either.mapLeft(Error),
    Future.fromEither,
    Future.chain(args =>
      pipe(
        FsUtils.cwd(),
        Future.fromIOEither,
        Future.map(
          (cwd): Args => ({
            ...args,
            musicLibraryDir: pipe(cwd, Dir.joinDir(args.musicLibraryDir)),
          }),
        ),
      ),
    ),
  )

export const getMetadata = (httpGet: HttpGet) => ({
  url,
  genre,
}: Pick<Args, 'url' | 'genre'>): Future<AlbumMetadata> =>
  pipe(
    httpGet(url),
    Future.chain(({ data }) =>
      pipe(
        new JSDOM(data).window.document,
        AlbumMetadata.fromDocument(genre),
        Either.mapLeft(e =>
          Error(s`Errors while parsing AlbumMetadata:\n${pipe(e, StringUtils.mkString('\n'))}`),
        ),
        Future.fromEither,
      ),
    ),
  )

const ensureAlbumDirectory = (musicLibraryDir: Dir, metadata: AlbumMetadata): Future<Dir> => {
  const albumDir = pipe(
    musicLibraryDir,
    Dir.joinDir(
      metadata.artist,
      s`[${metadata.year}] ${metadata.album}${metadata.isEp ? ' (EP)' : ''}`,
    ),
  )
  return pipe(
    FsUtils.exists(albumDir),
    Future.chain(dirExists =>
      dirExists
        ? Future.left(
            Error(s`Album directory already exists, this might be an error: ${albumDir.path}`),
          )
        : FsUtils.mkdir(albumDir, { recursive: true }),
    ),
    Future.map(() => albumDir),
  )
}

const downloadCover = (httpGetBuffer: HttpGetBuffer) => (coverUrl: string): Future<Buffer> =>
  pipe(
    httpGetBuffer(coverUrl),
    Future.map(res => res.data),
  )

const writeMp3TagsToFiles = (
  mp3Files: NonEmptyArray<File>,
  metadata: AlbumMetadata,
  cover: Buffer,
): Future<void> =>
  pipe(
    zipMp3FilesWithMetadata(mp3Files, metadata.tracks),
    Future.chain(flow(List.map(writeMp3TagsToFile(metadata, cover)), Future.sequenceArray)),
    Future.map(() => {}),
  )

const writeMp3TagsToFile = (metadata: AlbumMetadata, cover: Buffer) => ([
  file,
  track,
]: FileWithTrack): Future<void> =>
  TagsUtils.write(
    {
      title: track.title,
      artist: metadata.artist,
      album: metadata.album,
      year: s`${metadata.year}`,
      trackNumber: s`${track.number}`,
      genre: metadata.genre,
      // comment: { language: '', text: '' },
      performerInfo: metadata.artist,
      image: {
        mime: 'jpeg',
        type: { id: 3, name: 'front cover' },
        description: '',
        imageBuffer: cover,
      },
    },
    file,
  )

const getMp3Files = (albumDir: Dir): Future<NonEmptyArray<File>> =>
  pipe(
    FsUtils.readdir(albumDir),
    Future.chain(
      flow(
        NonEmptyArray.fromReadonlyArray,
        Future.fromOption(() => Error(s`Empty directory after youtube-dl: ${albumDir.path}`)),
      ),
    ),
    Future.chain(
      flow(
        NonEmptyArray.traverse(Validation.applicativeValidation)(f => {
          if (FileOrDir.isDir(f)) {
            return Either.left(NonEmptyArray.of(s`Unexpected directory: ${f.path}`))
          }
          if (!f.basename.endsWith('.mp3')) {
            return Either.left(NonEmptyArray.of(s`Non mp3 file: ${f.path}`))
          }
          return Either.right(f)
        }),
        Either.mapLeft(e =>
          Error(s`Errors while listing mp3 files:\n${pipe(e, StringUtils.mkString('\n'))}`),
        ),
        Future.fromEither,
      ),
    ),
  )

const zipMp3FilesWithMetadata = (
  mp3Files: NonEmptyArray<File>,
  tracks: NonEmptyArray<AlbumMetadata.Track>,
): Future<NonEmptyArray<Tuple<File, AlbumMetadata.Track>>> =>
  pipe(
    mp3Files,
    NonEmptyArray.traverse(Validation.applicativeValidation)(file =>
      pipe(
        tracks,
        List.findFirst(trackMatchesFile(file.basename.toLowerCase())),
        Maybe.fold(
          () =>
            Either.left(
              NonEmptyArray.of(s`Couldn't find track metadata matching file: ${file.basename}`),
            ),
          track => Either.right(Tuple.of(file, track)),
        ),
      ),
    ),
    Either.mapLeft(e =>
      Error(s`Errors while zipping files with tracks:\n${pipe(e, StringUtils.mkString('\n'))}`),
    ),
    Future.fromEither,
  )

const trackMatchesFile = (fileBasenameLower: string) => (track: AlbumMetadata.Track): boolean =>
  fileBasenameLower.includes(track.title.toLowerCase())
