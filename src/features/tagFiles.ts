import { pipe } from 'fp-ts/function'

import { config } from '../config'
import { AlbumMetadata } from '../models/AlbumMetadata'
import { Dir, File, FileOrDir } from '../models/FileOrDir'
import { Genre } from '../models/Genre'
import { Url } from '../models/Url'
import { Either, Future, List, NonEmptyArray } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'
import {
  CmdArgs,
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

const cmd = CmdArgs.of(
  'tag-files',
  'Tag and organize already downloaded files (at the root of music directory',
)

export const tagFiles = (
  argv: List<string>,
  httpGet: HttpGet,
  httpGetBuffer: HttpGetBuffer,
): Future<void> =>
  pipe(
    parseCommand(cmd, argv),
    Future.chain(args =>
      pipe(
        args.urls,
        NonEmptyArray.map(ensureAlbum(httpGet, httpGetBuffer)(args.musicLibraryDir, args.genre)),
        Future.sequenceArray,
      ),
    ),
    Future.map(() => {}),
  )

const ensureAlbum = (httpGet: HttpGet, httpGetBuffer: HttpGetBuffer) => (
  musicLibraryDir: Dir,
  genre: Genre,
) => (url: Url): Future<void> =>
  pipe(
    Future.Do,

    log(s`>>> [${url}] Fetching metadata`),
    Future.bind('metadata', () => getMetadata(httpGet)(genre, url)),

    log(s`>>> [${url}] Downloading cover`),
    Future.bind('cover', ({ metadata }) => downloadCover(httpGetBuffer)(metadata.coverUrl)),

    log(s`>>> [${url}] Ensuring files`),
    Future.bind('albumDir', ({ metadata }) => ensureAlbumDirectory(musicLibraryDir, metadata)),
    Future.chain(({ metadata, cover, albumDir }) =>
      writeMp3TagsToFiles(musicLibraryDir, url, albumDir, metadata, cover),
    ),
  )

const writeMp3TagsToFiles = (
  musicLibraryDir: Dir,
  url: Url,
  albumDir: Dir,
  metadata: AlbumMetadata,
  cover: Buffer,
): Future<void> =>
  pipe(
    FsUtils.readdir(musicLibraryDir),
    Future.chain(content => {
      const mp3Files = pipe(
        content,
        List.filter(
          (f): f is File => FileOrDir.isFile(f) && f.basename.endsWith(config.mp3Extension),
        ),
      )
      return pipe(
        metadata.tracks,
        NonEmptyArray.map(findAndTagFile(url, albumDir, mp3Files, metadata, cover)),
        Future.sequenceArray,
        Future.map(() => {}),
      )
    }),
  )

const findAndTagFile = (
  url: Url,
  albumDir: Dir,
  mp3Files: List<File>,
  metadata: AlbumMetadata,
  cover: Buffer,
) => (track: AlbumMetadata.Track): Future<void> =>
  pipe(
    mp3Files,
    List.findFirst(file => trackMatchesFile(track, file)),
    Either.fromOption(() =>
      Error(
        s`Couldn't find file matching track: ${metadata.artist} - ${
          metadata.album
        } - ${StringUtils.padNumber(track.number)} ${track.title}`,
      ),
    ),
    Future.fromEither,
    Future.chain(file => writeTagsAndMoveFile(url, albumDir, metadata, cover)([file, track])),
  )
