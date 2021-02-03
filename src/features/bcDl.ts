import { flow, pipe } from 'fp-ts/function'

import { AlbumMetadata } from '../models/AlbumMetadata'
import { Dir, File, FileOrDir } from '../models/FileOrDir'
import { Genre } from '../models/Genre'
import { Url } from '../models/Url'
import { Validation } from '../models/Validation'
import { WriteTagsAction } from '../models/WriteTagsAction'
import { Either, Future, List, NonEmptyArray } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'
import {
  CmdArgs,
  ExecYoutubeDl,
  HttpGet,
  HttpGetBuffer,
  downloadCover,
  ensureAlbumDir,
  getAlbumDir,
  getMetadata,
  getWriteTagsAction,
  isMp3File,
  log,
  parseCommand,
  prettyTrackInfo,
  rmrfAlbumDirOnError,
  writeAllTags,
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
    Future.bind('albumDir', ({ metadata }) => Future.right(getAlbumDir(musicLibraryDir, metadata))),
    Future.do(({ albumDir }) => ensureAlbumDir(albumDir)),
    rmrfAlbumDirOnError(url)(({ metadata, cover, albumDir }) =>
      pipe(
        Future.fromIOEither(FsUtils.chdir(albumDir)),
        Future.chain(() => execYoutubeDl(url)),

        log(s`>>> [${url}] Writing tags and renaming files`),
        Future.chain(() => getDownloadedMp3Files(albumDir)),
        Future.chain(mp3Files => getActions(mp3Files, albumDir, metadata, cover)),
        Future.chain(writeAllTags),
      ),
    ),
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
          if (!isMp3File(f)) {
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

const getActions = (
  mp3Files: NonEmptyArray<File>,
  albumDir: Dir,
  metadata: AlbumMetadata,
  cover: Buffer,
): Future<NonEmptyArray<WriteTagsAction>> =>
  pipe(
    mp3Files,
    NonEmptyArray.traverse(Validation.applicativeValidation)(getAction(albumDir, metadata, cover)),
    Either.mapLeft(errors =>
      Error(
        StringUtils.stripMargins(
          s`Failed to find track for files:
           |${pipe(errors, StringUtils.mkString('\n'))}
           |
           |Considered tracks:
           |${pipe(
             metadata.tracks,
             NonEmptyArray.map(prettyTrackInfo(metadata)),
             StringUtils.mkString('\n'),
           )}`,
        ),
      ),
    ),
    Future.fromEither,
  )

const getAction = (albumDir: Dir, metadata: AlbumMetadata, cover: Buffer) => (
  file: File,
): Validation<WriteTagsAction> =>
  pipe(
    metadata.tracks,
    List.findFirst(trackMatchesFile(file)),
    Either.fromOption(() => NonEmptyArray.of(file.path)),
    Either.map(track => getWriteTagsAction(albumDir, metadata, cover, file, track)),
  )

const trackMatchesFile = (file: File) => (track: AlbumMetadata.Track): boolean =>
  pipe(file.basename, StringUtils.almostIncludes(track.title))
