import { AxiosResponse } from 'axios'
import { Command, Opts, codecToDecode } from 'decline-ts'
import { apply } from 'fp-ts'
import { flow, pipe } from 'fp-ts/function'
import { JSDOM } from 'jsdom'
import NodeID3 from 'node-id3'

import { AlbumMetadata } from '../models/AlbumMetadata'
import { Dir, File, FileOrDir } from '../models/FileOrDir'
import { Genre } from '../models/Genre'
import { Url } from '../models/Url'
import { Validation } from '../models/Validation'
import { Either, Future, List, Maybe, NonEmptyArray, Tuple } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'
import { TagsUtils } from '../utils/TagsUtils'
import { CmdArgs, log, parseCommand } from './common'

export type HttpGet = (url: Url) => Future<AxiosResponse<string>>
export type HttpGetBuffer = (url: Url) => Future<AxiosResponse<Buffer>>
export type ExecYoutubeDl = (url: Url) => Future<void>

type FileWithTrack = Tuple<File, AlbumMetadata.Track>

const mp3Extension = 'mp3'

const cmd = CmdArgs.of('bc-dl', 'youtube-dl for Bandcamp, with mp3 tags')

export const bcDl = (
  argv: List<string>,
  httpGet: HttpGet,
  httpGetBuffer: HttpGetBuffer,
  execYoutubeDl: ExecYoutubeDl,
): Future<void> =>
  pipe(
    parseCommand(cmd, argv),
    Future.chain(args =>
      pipe(
        args.urls,
        NonEmptyArray.map(
          downloadAlbum(httpGet, httpGetBuffer, execYoutubeDl)(args.musicLibraryDir, args.genre),
        ),
        Future.sequenceArray,
      ),
    ),
    Future.map<List<void>, void>(() => {}),
  )

const downloadAlbum = (
  httpGet: HttpGet,
  httpGetBuffer: HttpGetBuffer,
  execYoutubeDl: ExecYoutubeDl,
) => (musicLibraryDir: Dir, genre: Genre) => (url: Url): Future<void> =>
  pipe(
    Future.Do,

    log(s`>>> [${url}] Fetching metadata`),
    Future.bind('metadata', () => getMetadata(httpGet)(genre, url)),
    Future.bind('albumDir', ({ metadata }) => ensureAlbumDirectory(musicLibraryDir, metadata)),
    Future.do(({ albumDir }) => Future.fromIOEither(FsUtils.chdir(albumDir))),

    log(s`>>> [${url}] Downloading album`),
    Future.do(() => execYoutubeDl(url)),

    log(s`>>> [${url}] Downloading cover`),
    Future.bind('cover', ({ metadata }) => downloadCover(httpGetBuffer)(metadata.coverUrl)),

    log(s`>>> [${url}] Writing tags and renaming files`),
    Future.bind('mp3files', ({ albumDir }) => getDownloadedMp3Files(albumDir)),
    Future.chain(({ mp3files, metadata, cover }) => writeMp3TagsToFiles(mp3files, metadata, cover)),
  )

export const getMetadata = (httpGet: HttpGet) => (genre: Genre, url: Url): Future<AlbumMetadata> =>
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

const downloadCover = (httpGetBuffer: HttpGetBuffer) => (coverUrl: Url): Future<Buffer> =>
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
  pipe(
    TagsUtils.write(getTags(metadata, cover, track), file),
    Future.chain(() =>
      FsUtils.rename(
        file,
        pipe(
          file,
          File.setBasename(
            s`${StringUtils.padNumber(track.number)} - ${StringUtils.cleanFileName(
              track.title,
            )}.${mp3Extension}`,
          ),
        ),
      ),
    ),
  )

const getTags = (
  metadata: AlbumMetadata,
  cover: Buffer,
  track: AlbumMetadata.Track,
): NodeID3.Tags => ({
  title: track.title,
  artist: metadata.artist,
  album: metadata.album,
  year: s`${metadata.year}`,
  trackNumber: s`${track.number}`,
  genre: Genre.unwrap(metadata.genre),
  // comment: { language: '', text: '' },
  performerInfo: metadata.artist,
  image: {
    mime: 'jpeg',
    type: { id: 3, name: 'front cover' },
    description: '',
    imageBuffer: cover,
  },
})

const getDownloadedMp3Files = (albumDir: Dir): Future<NonEmptyArray<File>> =>
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
          if (!f.basename.endsWith(s`.${mp3Extension}`)) {
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
