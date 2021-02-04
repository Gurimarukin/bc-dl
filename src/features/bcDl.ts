import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import NodeID3 from 'node-id3'

import { Album } from '../models/Album'
import { AlbumMetadata } from '../models/AlbumMetadata'
import { Dir, File, FileOrDir } from '../models/FileOrDir'
import { FileWithRawTags } from '../models/FileWithRawTags'
import { Genre } from '../models/Genre'
import { Url } from '../models/Url'
import { Validation } from '../models/Validation'
import { WriteTagsAction } from '../models/WriteTagsAction'
import { decodeError } from '../utils/decodeError'
import { findOneAndOnlyOne } from '../utils/findOneAndOnlyOne'
import { Either, Future, List, NonEmptyArray, Tuple } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'
import { TagsUtils } from '../utils/TagsUtils'
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
        Future.sequenceSeqArray,
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

const fileWithRawTagsNeaCodec: D.Decoder<
  List<FileWithRawTags>,
  NonEmptyArray<FileWithRawTags>
> = pipe(
  D.fromArray(D.id<FileWithRawTags>()),
  D.refine<List<FileWithRawTags>, NonEmptyArray<FileWithRawTags>>(List.isNonEmpty, 'NonEmptyArray'),
) as D.Decoder<List<FileWithRawTags>, NonEmptyArray<FileWithRawTags>>

const getDownloadedMp3Files = (albumDir: Dir): Future<NonEmptyArray<FileWithRawTags>> =>
  pipe(
    FsUtils.readdir(albumDir),
    // TODO: don't stop on first Error
    // s`Errors while listing mp3 files:\n${pipe(e, StringUtils.mkString('\n'))}`
    Future.chain(flow(List.map(getFileWithTags), Future.sequenceArray)),
    Future.chain(u =>
      pipe(
        fileWithRawTagsNeaCodec.decode(u),
        Either.mapLeft(decodeError('NonEmptyArray<FileWithTags>')(u)),
        Future.fromEither,
      ),
    ),
  )

const getFileWithTags = (f: FileOrDir): Future<FileWithRawTags> => {
  if (FileOrDir.isDir(f)) return Future.left(Error(s`Unexpected directory: ${f.path}`))
  if (!isMp3File(f)) return Future.left(Error(s`Non mp3 file: ${f.path}`))
  return pipe(
    TagsUtils.read(f),
    Future.map(tags => Tuple.of(f, tags)),
  )
}

const getActions = (
  mp3Files: NonEmptyArray<FileWithRawTags>,
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
          s`Failed to find track matching files:
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

const getAction = (albumDir: Dir, metadata: AlbumMetadata, cover: Buffer) => ([
  file,
  tags,
]: FileWithRawTags): Validation<WriteTagsAction> =>
  pipe(
    metadata.tracks,
    findOneAndOnlyOne(
      trackMatchesFileName(file.basename),
      () => Either.left(NonEmptyArray.of(file.path)),
      Either.right,
      findMatchingFileByTags(metadata, file, tags),
    ),
    Either.map(tracks => getWriteTagsAction(albumDir, metadata, cover, file, tracks)),
  )

const trackMatchesFileName = (file: string) => (track: AlbumMetadata.Track): boolean =>
  pipe(file, StringUtils.almostIncludes(track.title))

const findMatchingFileByTags = (metadata: AlbumMetadata, file: File, tags: NodeID3.Tags) => (
  tracks: NonEmptyArray<AlbumMetadata.Track>,
): Validation<AlbumMetadata.Track> =>
  pipe(
    tracks,
    findOneAndOnlyOne(
      trackMatchesTags(tags),
      () => findMatchingFileByRemovingAlbumName(metadata, file, tracks), // tags were probably empty
      Either.right,
      flow(moreThanOne('Found more that one track matching file', file), Either.left),
    ),
  )

const trackMatchesTags = (tags: NodeID3.Tags) => (track: AlbumMetadata.Track): boolean =>
  tags.trackNumber !== undefined && Number(tags.trackNumber) === track.number

const findMatchingFileByRemovingAlbumName = (
  metadata: AlbumMetadata,
  file: File,
  tracks: NonEmptyArray<AlbumMetadata.Track>,
): Validation<AlbumMetadata.Track> =>
  pipe(
    tracks,
    findOneAndOnlyOne(
      trackMatchesFileName(
        StringUtils.sanitizeAlmost(file.basename)
          .replace(StringUtils.sanitizeAlmost(metadata.artist), '')
          .replace(StringUtils.sanitizeAlmost(Album.unwrap(metadata.album)), ''),
      ),
      () =>
        Either.left(
          moreThanOne('Found more that one track matching file and no tags', file)(tracks),
        ),
      Either.right,
      flow(moreThanOne('Found more that one track matching file and no tags', file), Either.left),
    ),
  )

const moreThanOne = (message: string, file: File) => (
  tracks: NonEmptyArray<AlbumMetadata.Track>,
): NonEmptyArray<string> =>
  NonEmptyArray.of(
    StringUtils.stripMargins(
      s`${message}: ${file.path}
         |${pipe(
           tracks,
           NonEmptyArray.map(t => s`- ${AlbumMetadata.Track.stringify(t)}`),
           StringUtils.mkString('\n'),
         )}`,
    ),
  )
