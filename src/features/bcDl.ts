import { flow, pipe } from 'fp-ts/function'

import { config } from '../config'
import { AlbumMetadata } from '../models/AlbumMetadata'
import { Dir, File, FileOrDir } from '../models/FileOrDir'
import { FileWithTrack } from '../models/FileWithTrack'
import { Genre } from '../models/Genre'
import { Url } from '../models/Url'
import { Validation } from '../models/Validation'
import { Either, Future, List, Maybe, NonEmptyArray, Tuple } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'
import {
  CmdArgs,
  ExecYoutubeDl,
  HttpGet,
  HttpGetBuffer,
  downloadCover,
  ensureAlbumDirectory,
  getMetadata,
  log,
  parseCommand,
  trackMatchesFile,
  writeTagsAndMoveFile,
} from './common'

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
    Future.map(() => {}),
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

    log(s`>>> [${url}] Downloading cover`),
    Future.bind('cover', ({ metadata }) => downloadCover(httpGetBuffer)(metadata.coverUrl)),

    log(s`>>> [${url}] Downloading album`),
    Future.bind('albumDir', ({ metadata }) => ensureAlbumDirectory(musicLibraryDir, metadata)),
    Future.do(({ albumDir }) => Future.fromIOEither(FsUtils.chdir(albumDir))),
    Future.do(() => execYoutubeDl(url)),

    log(s`>>> [${url}] Writing tags and renaming files`),
    Future.bind('mp3files', ({ albumDir }) => getDownloadedMp3Files(albumDir)),
    Future.chain(({ metadata, cover, albumDir, mp3files }) =>
      writeAllTags(url, albumDir, mp3files, metadata, cover),
    ),
  )

const writeAllTags = (
  url: Url,
  albumDir: Dir,
  mp3Files: NonEmptyArray<File>,
  metadata: AlbumMetadata,
  cover: Buffer,
): Future<void> =>
  pipe(
    zipMp3FilesWithMetadata(mp3Files, metadata.tracks),
    Future.chain(
      flow(List.map(writeTagsAndMoveFile(url, albumDir, metadata, cover)), Future.sequenceArray),
    ),
    Future.map(() => {}),
  )

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
          if (!f.basename.endsWith(config.mp3Extension)) {
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
): Future<NonEmptyArray<FileWithTrack>> =>
  pipe(
    mp3Files,
    NonEmptyArray.traverse(Validation.applicativeValidation)(file =>
      pipe(
        tracks,
        List.findFirst(track => trackMatchesFile(track, file)),
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
