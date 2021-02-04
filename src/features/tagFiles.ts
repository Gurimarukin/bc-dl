import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'

import { Album } from '../models/Album'
import { AlbumMetadata } from '../models/AlbumMetadata'
import { DefinedTags } from '../models/DefinedTags'
import { Dir, FileOrDir } from '../models/FileOrDir'
import { FileWithRawTags } from '../models/FileWithRawTags'
import { FileWithTags } from '../models/FileWithTags'
import { Genre } from '../models/Genre'
import { Url } from '../models/Url'
import { Validation } from '../models/Validation'
import { WriteTagsAction } from '../models/WriteTagsAction'
import { decodeError } from '../utils/decodeError'
import { Either, Future, List, Maybe, NonEmptyArray, Tuple } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'
import { TagsUtils } from '../utils/TagsUtils'
import {
  CmdArgs,
  HttpGet,
  HttpGetBuffer,
  downloadCover,
  ensureAlbumDir,
  getAlbumDir,
  getMetadata,
  getWriteTagsAction,
  isMp3File,
  logger,
  parseCommand,
  prettyTrackInfo,
  rmrfAlbumDirOnError,
  writeAllTags,
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
        Future.sequenceSeqArray,
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

    logger.logWithUrl(url, 'Fetching metadata'),
    Future.bind('metadata', () => getMetadata(httpGet)(genre, url)),

    logger.logWithUrl(url, 'Downloading cover'),
    Future.bind('cover', ({ metadata }) => downloadCover(httpGetBuffer)(metadata.coverUrl)),

    logger.logWithUrl(url, 'Ensuring files'),
    Future.bind('albumDir', ({ metadata }) => Future.right(getAlbumDir(musicLibraryDir, metadata))),
    Future.bind('mp3Files', () => getMp3Files(musicLibraryDir)),
    Future.bind('actions', ({ metadata, cover, albumDir, mp3Files }) =>
      getActions(mp3Files, albumDir, metadata, cover),
    ),
    Future.do(({ albumDir }) => ensureAlbumDir(albumDir)),
    rmrfAlbumDirOnError(url)(({ actions }) => writeAllTags(actions)),
  )

const fileWithTagsCodec: D.Decoder<FileWithRawTags, FileWithTags> = {
  decode: ([f, rawTags]) =>
    pipe(
      DefinedTags.codec.decode(rawTags),
      Either.map(tags => [f, tags]),
    ),
}
const fileWithTagsNeaCodec: D.Decoder<List<FileWithRawTags>, NonEmptyArray<FileWithTags>> = pipe(
  D.fromArray(fileWithTagsCodec),
  D.refine<List<FileWithTags>, NonEmptyArray<FileWithTags>>(List.isNonEmpty, 'NonEmptyArray'),
) as D.Decoder<List<FileWithRawTags>, NonEmptyArray<FileWithTags>>

const getMp3Files = (musicLibraryDir: Dir): Future<NonEmptyArray<FileWithTags>> =>
  pipe(
    FsUtils.readdir(musicLibraryDir),
    Future.chain(flow(List.filterMap(getFileWithTags), Future.sequenceArray)),
    Future.chain(u =>
      pipe(
        fileWithTagsNeaCodec.decode(u),
        Either.mapLeft(decodeError('NonEmptyArray<FileWithTags>')(u)),
        Future.fromEither,
      ),
    ),
  )

const getFileWithTags = (f: FileOrDir): Maybe<Future<FileWithRawTags>> =>
  FileOrDir.isFile(f) && isMp3File(f)
    ? pipe(
        TagsUtils.read(f),
        Future.map(tags => Tuple.of(f, tags)),
        Maybe.some,
      )
    : Maybe.none

const getActions = (
  mp3Files: NonEmptyArray<FileWithTags>,
  albumDir: Dir,
  metadata: AlbumMetadata,
  cover: Buffer,
): Future<NonEmptyArray<WriteTagsAction>> =>
  pipe(
    metadata.tracks,
    NonEmptyArray.traverse(Validation.applicativeValidation)(
      getAction(albumDir, metadata, cover, mp3Files),
    ),
    Either.mapLeft(errors =>
      Error(
        StringUtils.stripMargins(
          s`Failed to find file matching tracks:
           |${pipe(errors, StringUtils.mkString('\n'))}
           |
           |Considered files:
           |${pipe(mp3Files, NonEmptyArray.map(FileWithTags.stringify), StringUtils.mkString('\n'))}
           |
           |Album metadata:
           |${AlbumMetadata.stringify(metadata)}`,
        ),
      ),
    ),
    Future.fromEither,
  )

const getAction = (
  albumDir: Dir,
  metadata: AlbumMetadata,
  cover: Buffer,
  mp3Files: NonEmptyArray<FileWithTags>,
) => (track: AlbumMetadata.Track): Validation<WriteTagsAction> =>
  pipe(
    mp3Files,
    List.filter(trackMatchesTags(metadata, track)),
    NonEmptyArray.fromReadonlyArray,
    Either.fromOption(() => NonEmptyArray.of(noMatchError(metadata, track))),
    Either.filterOrElse(
      filesAndTags => filesAndTags.length === 1,
      filesAndTags =>
        NonEmptyArray.of(
          StringUtils.stripMargins(
            s`Found more that one file matching track: ${prettyTrackInfo(metadata)(track)}
             |${pipe(
               filesAndTags,
               NonEmptyArray.map(t => s`- ${FileWithTags.stringify(t)}`),
               StringUtils.mkString('\n'),
             )}`,
          ),
        ),
    ),
    Either.map(filesAndTags =>
      getWriteTagsAction(albumDir, metadata, cover, NonEmptyArray.head(filesAndTags)[0], track),
    ),
  )

const noMatchError = (metadata: AlbumMetadata, track: AlbumMetadata.Track): string =>
  s`Couldn't find file matching track: ${prettyTrackInfo(metadata)(track)}`

const trackMatchesTags = (metadata: AlbumMetadata, track: AlbumMetadata.Track) => ([
  ,
  tags,
]: FileWithTags): boolean =>
  (almostEquals(metadata.artist, tags.artist) ||
    almostEquals(metadata.artist, tags.performerInfo)) &&
  almostEquals(
    Album.unwrap(metadata.album),
    metadata.isEp ? pipe(Album.wrap(tags.album), Album.withoutEp, Album.unwrap) : tags.album,
  ) &&
  track.number === Number(tags.trackNumber)

const almostEquals = (a: string, b: string): boolean =>
  StringUtils.cleanForCompare(a) === StringUtils.cleanForCompare(b)
