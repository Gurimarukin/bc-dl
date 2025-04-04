import { ord } from 'fp-ts'
import { Ord } from 'fp-ts/Ord'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'

import { Album } from '../models/Album'
import { AlbumMetadata } from '../models/AlbumMetadata'
import { Dir, File, FileOrDir } from '../models/FileOrDir'
import { Genre } from '../models/Genre'
import { Url } from '../models/Url'
import { Validation } from '../models/Validation'
import { WriteTagsAction } from '../models/WriteTagsAction'
import { Console } from '../utils/Console'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils } from '../utils/StringUtils'
import { decodeError } from '../utils/decodeError'
import { Either, Future, IO, List, NonEmptyArray, Tuple } from '../utils/fp'
import { listFoldLength } from '../utils/listFoldLength'
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
  logger,
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
    Future.map(() => undefined),
  )

const downloadAlbum =
  (httpGet: HttpGet, httpGetBuffer: HttpGetBuffer, execYoutubeDl: ExecYoutubeDl) =>
  (musicLibraryDir: Dir, genre: Genre) =>
  (url: Url): Future<void> =>
    pipe(
      Future.Do,

      Future.chainFirst(() => Future.fromIOEither(logger.logWithUrl(url, 'Fetching metadata'))),
      Future.bind('metadata', () => getMetadata(httpGet)(genre, url)),

      Future.chainFirst(() => Future.fromIOEither(logger.logWithUrl(url, 'Downloading cover'))),
      Future.bind('cover', ({ metadata }) => downloadCover(httpGetBuffer)(metadata.coverUrl)),

      Future.chainFirst(() => Future.fromIOEither(logger.logWithUrl(url, 'Downloading album'))),
      Future.bind('albumDir', ({ metadata }) =>
        Future.right(getAlbumDir(musicLibraryDir, metadata)),
      ),
      Future.chainFirst(({ albumDir }) => ensureAlbumDir(albumDir)),
      rmrfAlbumDirOnError(url)(({ metadata, cover, albumDir }) =>
        pipe(
          Future.fromIOEither(FsUtils.chdir(albumDir)),
          Future.chain(() => execYoutubeDl(url)),

          Future.chainFirst(() =>
            Future.fromIOEither(logger.logWithUrl(url, 'Writing tags and renaming files')),
          ),
          Future.chain(() => getDownloadedMp3Files(albumDir)),
          Future.chain(mp3Files => getActions(mp3Files, albumDir, metadata, cover)),
          Future.chain(writeAllTags),
        ),
      ),
    )

const fileNeaCodec: D.Decoder<List<File>, NonEmptyArray<File>> = pipe(
  D.fromArray(D.id<File>()),
  D.refine<List<File>, NonEmptyArray<File>>(List.isNonEmpty, 'NonEmptyArray'),
) as D.Decoder<List<File>, NonEmptyArray<File>>

const getDownloadedMp3Files = (albumDir: Dir): Future<NonEmptyArray<File>> =>
  pipe(
    FsUtils.readdir(albumDir),
    Future.chain(
      flow(
        List.traverse(Validation.validation)(getMp3File),
        Either.mapLeft(e =>
          Error(`Errors while listing mp3 files:\n${pipe(e, StringUtils.mkString('\n'))}`),
        ),
        Future.fromEither,
      ),
    ),
    Future.chain(u =>
      pipe(
        fileNeaCodec.decode(u),
        Either.mapLeft(decodeError('NonEmptyArray<File>')(u)),
        Future.fromEither,
      ),
    ),
  )

const getMp3File = (f: FileOrDir): Validation<File> => {
  if (FileOrDir.isDir(f)) return Either.left(NonEmptyArray.of(`Unexpected directory: ${f.path}`))
  if (!isMp3File(f)) return Either.left(NonEmptyArray.of(`Non mp3 file: ${f.path}`))
  return Either.right(f)
}

export const getActions = (
  mp3Files: NonEmptyArray<File>,
  albumDir: Dir,
  metadata: AlbumMetadata,
  cover: Buffer,
): Future<NonEmptyArray<WriteTagsAction>> => {
  const fromDeletions = getActionsFromDeletions(mp3Files, albumDir, metadata, cover)
  const cleanedArtist = StringUtils.cleanForCompare(metadata.artist)
  const cleanedAlbum = pipe(metadata.album, Album.stringify, StringUtils.cleanForCompare)
  return pipe(
    fromDeletions([cleanedArtist, cleanedAlbum]),
    IO.alt(() => fromDeletions([cleanedArtist])),
    Future.fromIOEither,
  )
}

const getActionsFromDeletions =
  (mp3Files: NonEmptyArray<File>, albumDir: Dir, metadata: AlbumMetadata, cover: Buffer) =>
  (unsortedDeletions: NonEmptyArray<string>): IO<NonEmptyArray<WriteTagsAction>> =>
    pipe(
      cleanFileNames(mp3Files)(unsortedDeletions),
      NonEmptyArray.traverse(IO.ioEither)(getAction(albumDir, metadata, cover)),
      IO.chain(
        flow(
          NonEmptyArray.sequence(Validation.validation),
          Either.mapLeft(errors =>
            Error(
              StringUtils.stripMargins(
                `Failed to find track matching files:
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
          IO.fromEither,
        ),
      ),
    )

type CleanedFile = Tuple<File, string>

const reverseOrdNumber = ord.getDualOrd(ord.ordNumber)
export const ordStringLength: Ord<string> = ord.fromCompare((x, y) => {
  const lengthComparison = reverseOrdNumber.compare(x.length, y.length)
  return lengthComparison === 0 ? ord.ordString.compare(x, y) : lengthComparison
})

const cleanFileNames =
  (mp3Files: NonEmptyArray<File>) =>
  (unsortedDeletions: NonEmptyArray<string>): NonEmptyArray<CleanedFile> => {
    const cleanedFiles = pipe(
      mp3Files,
      NonEmptyArray.map(f => Tuple.of(f, StringUtils.cleanForCompare(f.basename))),
    )
    const deletions = pipe(unsortedDeletions, NonEmptyArray.sort(ordStringLength))
    return pipe(
      deletions,
      List.reduce(cleanedFiles, (files, toDelete) =>
        everyStringIncludes(files, toDelete)
          ? pipe(
              files,
              NonEmptyArray.map(([file, cleanedName]) =>
                Tuple.of(file, cleanedName.replace(toDelete, '').trim()),
              ),
            )
          : files,
      ),
    )
  }

const everyStringIncludes = (files: List<CleanedFile>, str: string): boolean =>
  pipe(
    files,
    List.every(([, cleanedName]) => cleanedName.includes(str)),
  )

const ordTrackTitleLength: Ord<AlbumMetadata.Track> = pipe(
  ordStringLength,
  ord.contramap((t: AlbumMetadata.Track) => t.title),
)

const getAction =
  (albumDir: Dir, metadata: AlbumMetadata, cover: Buffer) =>
  ([file, cleanedName]: CleanedFile): IO<Validation<WriteTagsAction>> =>
    pipe(
      metadata.tracks,
      List.filter(trackMatchesFileName(cleanedName)),
      listFoldLength(
        () => IO.right(Either.left(NonEmptyArray.of(file.path))),
        t => IO.right(Either.right(t)),
        flow(NonEmptyArray.sort(ordTrackTitleLength), tracks => {
          const res = NonEmptyArray.head(tracks)
          return pipe(
            logMoreThanOne(tracks, file, res),
            IO.map(() => Either.right(res)),
          )
        }),
      ),
      IO.map(Either.map(track => getWriteTagsAction(albumDir, metadata, cover, file, track))),
    )

const trackMatchesFileName =
  (cleanedFileName: string) =>
  (track: AlbumMetadata.Track): boolean =>
    cleanedFileName.includes(StringUtils.cleanForCompare(track.title))

const logMoreThanOne = (
  tracks: NonEmptyArray<AlbumMetadata.Track>,
  file: File,
  res: AlbumMetadata.Track,
): IO<void> =>
  Console.log(
    StringUtils.stripMargins(
      `${logger.warnPrefix}Found more that one track matching file: ${file.path}
      |${logger.warnPrefix}Picked ${AlbumMetadata.Track.stringify(res)}
      |${pipe(
        tracks,
        NonEmptyArray.map(t => `${logger.warnPrefix}- ${AlbumMetadata.Track.stringify(t)}`),
        StringUtils.mkString('\n'),
      )}`,
    ),
  )
