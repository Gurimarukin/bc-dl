import path from 'path'

import { AxiosResponse } from 'axios'
import { Command, Opts } from 'decline-ts'
import { apply } from 'fp-ts'
import { flow, pipe } from 'fp-ts/function'
import { JSDOM } from 'jsdom'

import { AlbumMetadata } from '../models/AlbumMetadata'
import { Validation } from '../models/Validation'
import { Either, Future, List, Maybe, NonEmptyArray, Tuple } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'
import { TagsUtils } from '../utils/TagsUtils'

export type HttpGet = (url: string) => Future<AxiosResponse<string>>
export type HttpGetBuffer = (url: string) => Future<AxiosResponse<Buffer>>
export type ExecYoutubeDl = (url: string) => Future<void>

type FileWithTrack = Tuple<string, AlbumMetadata.Track>

const musicLibraryDirMetavar = 'music library dir'

const cmd = Command({ name: 'bc-dl', header: 'youtube-dl for Bandcamp, with mp3 tags' })(
  pipe(
    apply.sequenceT(Opts.opts)(
      Opts.argument()(musicLibraryDirMetavar),
      Opts.argument()('url'),
      Opts.argument()('genre'),
    ),
    Opts.map(([musicLibraryDir, url, genre]) => ({ musicLibraryDir, url, genre })),
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
    Future.bind('initialCwd', () => Future.fromIOEither(FsUtils.cwd())),
    Future.do(({ albumDir }) => Future.fromIOEither(FsUtils.chdir(albumDir))),
    Future.do(({ args }) => execYoutubeDl(args.url)),
    Future.bind('mp3files', ({ albumDir }) => getMp3Files(albumDir)),
    Future.bind('cover', ({ metadata }) => downloadCover(httpGetBuffer)(metadata.coverUrl)),
    Future.chain(({ mp3files, metadata, cover }) => writeMp3TagsToFiles(mp3files, metadata, cover)),
  )

const parseCommand = (argv: List<string>): Future<Command.TypeOf<typeof cmd>> =>
  pipe(cmd, Command.parse(argv), Either.mapLeft(Error), Future.fromEither)

export const getMetadata = (httpGet: HttpGet) => ({
  url,
  genre,
}: Command.TypeOf<typeof cmd>): Future<AlbumMetadata> =>
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

const ensureAlbumDirectory = (musicLibraryDir: string, metadata: AlbumMetadata): Future<string> => {
  const albumDir = path.join(
    musicLibraryDir,
    metadata.artist,
    s`[${metadata.year}] ${metadata.album}${metadata.isEp ? ' (EP)' : ''}`,
  )
  return pipe(
    FsUtils.exists(albumDir),
    Future.fromIOEither,
    Future.chain(dirExists =>
      dirExists
        ? Future.left(Error(s`Album directory already exists, this might be an error: ${albumDir}`))
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
  mp3Files: NonEmptyArray<string>,
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

const getMp3Files = (albumDir: string): Future<NonEmptyArray<string>> =>
  pipe(
    FsUtils.readdir(albumDir),
    Future.chain(
      flow(
        NonEmptyArray.fromReadonlyArray,
        Future.fromOption(() => Error(s`Empty directory after youtube-dl: ${albumDir}`)),
      ),
    ),
    Future.chain(
      flow(
        NonEmptyArray.traverse(Validation.applicativeValidation)(f => {
          const fName = path.join(albumDir, f.name)
          if (f.isDirectory()) {
            return Either.left(NonEmptyArray.of(s`Unexpected directory: ${fName}`))
          }
          if (!fName.endsWith('.mp3')) {
            return Either.left(NonEmptyArray.of(s`Non mp3 file: ${fName}`))
          }
          return Either.right(fName)
        }),
        Either.mapLeft(e =>
          Error(s`Errors while listing mp3 files:\n${pipe(e, StringUtils.mkString('\n'))}`),
        ),
        Future.fromEither,
      ),
    ),
  )

const zipMp3FilesWithMetadata = (
  mp3Files: NonEmptyArray<string>,
  tracks: NonEmptyArray<AlbumMetadata.Track>,
): Future<NonEmptyArray<Tuple<string, AlbumMetadata.Track>>> =>
  pipe(
    mp3Files,
    NonEmptyArray.traverse(Validation.applicativeValidation)(file => {
      const fileBasename = path.basename(file)
      return pipe(
        tracks,
        List.findFirst(trackMatchesFile(fileBasename.toLowerCase())),
        Maybe.fold(
          () =>
            Either.left(
              NonEmptyArray.of(s`Couldn't find track metadata matching file: ${fileBasename}`),
            ),
          track => Either.right(Tuple.of(file, track)),
        ),
      )
    }),
    Either.mapLeft(e =>
      Error(s`Errors while zipping files with tracks:\n${pipe(e, StringUtils.mkString('\n'))}`),
    ),
    Future.fromEither,
  )

const trackMatchesFile = (fileBasenameLower: string) => (track: AlbumMetadata.Track): boolean =>
  fileBasenameLower.includes(track.title.toLowerCase())
