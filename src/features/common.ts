import util from 'util'

import { AxiosResponse } from 'axios'
import { Command, Opts, codecToDecode } from 'decline-ts'
import { apply } from 'fp-ts'
import { flow, identity, not, pipe } from 'fp-ts/function'
import NodeID3 from 'node-id3'

import { config } from '../config'
import { Album } from '../models/Album'
import { AlbumMetadata } from '../models/AlbumMetadata'
import { Dir, File } from '../models/FileOrDir'
import { Genre } from '../models/Genre'
import { Url } from '../models/Url'
import { WriteTagsAction } from '../models/WriteTagsAction'
import { Console } from '../utils/Console'
import { Either, Future, IO, List, Maybe, NonEmptyArray } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils } from '../utils/StringUtils'
import { TagsUtils } from '../utils/TagsUtils'
import { DomHandler } from '../utils/DomHandler'

export type HttpGet = (url: Url) => Future<AxiosResponse<string>>
export type HttpGetBuffer = (url: Url) => Future<AxiosResponse<Buffer>>
export type ExecYoutubeDl = (url: Url) => Future<void>

export type CmdArgs = Command<{
  readonly musicLibraryDir: string
  readonly genre: Genre
  readonly urls: NonEmptyArray<Url>
}>

export type Args = {
  readonly musicLibraryDir: Dir
  readonly genre: Genre
  readonly urls: NonEmptyArray<Url>
}

export const CmdArgs = {
  of: (name: string, header: string): CmdArgs =>
    Command({ name, header })(
      pipe(
        apply.sequenceT(Opts.opts)(
          Opts.argument()('music-library-dir'),
          Opts.argument(codecToDecode(Genre.codec))('genre'),
          Opts.argumentS(codecToDecode(Url.codec))('urls'),
        ),
        Opts.map(([musicLibraryDir, genre, urls]) => ({
          musicLibraryDir,
          genre,
          urls,
        })),
      ),
    ),
}

export const parseCommand = (cmd: CmdArgs, argv: List<string>): Future<Args> =>
  pipe(
    Future.Do,
    Future.bind('genres', () => getGenres()),
    Future.bind('args', () =>
      pipe(cmd, Command.parse(argv), Either.mapLeft(Error), Future.fromEither),
    ),
    Future.bind('cwd', () => Future.fromIOEither(FsUtils.cwd())),
    Future.bind('musicLibraryDir', ({ genres, args, cwd }) =>
      pipe(genres, List.elem(Genre.eq)(args.genre))
        ? Future.fromIOEither(pipe(cwd, Dir.resolveDir(args.musicLibraryDir)))
        : Future.left(
            Error(
              `Unknown genre "${Genre.unwrap(args.genre)}" (add it to file ${
                config.genresTxt.path
              })`,
            ),
          ),
    ),
    Future.map(({ args, musicLibraryDir }) => ({ ...args, musicLibraryDir })),
  )

const getGenres = (): Future<NonEmptyArray<Genre>> =>
  pipe(
    FsUtils.readFile(config.genresTxt),
    Future.chain(content =>
      pipe(
        content.split('\n'),
        List.filterMap(l => {
          const trimed = l.trim()
          return StringUtils.isNonEmpty(trimed) ? Maybe.some(Genre.wrap(trimed)) : Maybe.none
        }),
        NonEmptyArray.fromReadonlyArray,
        Either.fromOption(() => Error(`Genres file shouldn't be empty: ${config.genresTxt.path}`)),
        Future.fromEither,
      ),
    ),
  )

export const getMetadata = (httpGet: HttpGet) => (genre: Genre, url: Url): Future<AlbumMetadata> =>
  pipe(
    Future.Do,
    Future.apS('fromDomHandler', getFromDomHandler(url)),
    Future.apS('response', httpGet(url)),
    Future.chain(({ fromDomHandler, response: { data: html } }) =>
      pipe(
        DomHandler.of(html),
        fromDomHandler(genre),
        Either.mapLeft(e =>
          Error(`Errors while parsing AlbumMetadata:\n${pipe(e, StringUtils.mkString('\n'))}`),
        ),
        Future.fromEither,
      ),
    ),
  )

const getFromDomHandler = (
  url: Url,
): Future<
  (genre: Genre) => (domHandler: DomHandler) => Either<NonEmptyArray<string>, AlbumMetadata>
> => {
  if (isAlbum(url)) return Future.right(AlbumMetadata.fromAlbumDocument)
  if (isTrack(url)) return Future.right(AlbumMetadata.fromTrackDocument)
  return Future.left(Error(`Url was not recognized as album nor track: ${Url.unwrap(url)}`))
}

const albumRegex = /(https?:\/\/)?[^\.]+\.bandcamp.com\/album\/.+/
const trackRegex = /(https?:\/\/)?[^\.]+\.bandcamp.com\/track\/.+/

const isAlbum: (url: Url) => boolean = flow(Url.unwrap, StringUtils.matches(albumRegex))
const isTrack: (url: Url) => boolean = flow(Url.unwrap, StringUtils.matches(trackRegex))

export const downloadCover = (httpGetBuffer: HttpGetBuffer) => (coverUrl: Url): Future<Buffer> =>
  pipe(
    httpGetBuffer(coverUrl),
    Future.map(res => res.data),
  )

export const getAlbumDir = (musicLibraryDir: Dir, metadata: AlbumMetadata): Dir =>
  pipe(
    musicLibraryDir,
    Dir.joinDir(
      StringUtils.cleanFileName(metadata.artist),
      StringUtils.cleanFileName(`[${metadata.year}] ${Album.stringify(metadata.album)}`),
    ),
  )

export const ensureAlbumDir = (albumDir: Dir): Future<void> =>
  pipe(
    FsUtils.exists(albumDir),
    Future.filterOrElse(not(identity), () =>
      Error(`Album directory already exists, this might be an error: ${albumDir.path}`),
    ),
    Future.chain(() => FsUtils.mkdir(albumDir, { recursive: true })),
  )

type AlbumDir = {
  readonly albumDir: Dir
}

export const rmrfAlbumDirOnError = (url: Url) => <A extends AlbumDir, B>(
  f: (a: A) => Future<B>,
) => (fa: Future<A>): Future<B> =>
  pipe(
    fa,
    Future.chain(a =>
      pipe(
        f(a),
        Future.recover(e =>
          pipe(
            Future.fromIOEither(
              logger.logWithUrl(url, `Error - removing albumDir: ${a.albumDir.path}`),
            ),
            Future.chain(() => FsUtils.rmrf(a.albumDir)),
            Future.chain(() => Future.left(e)),
          ),
        ),
      ),
    ),
  )

export const getWriteTagsAction = (
  // url: Url,
  albumDir: Dir,
  metadata: AlbumMetadata,
  cover: Buffer,
  file: File,
  track: AlbumMetadata.Track,
): WriteTagsAction => ({
  file,
  newTags: getTags(metadata, cover, track),
  renameTo: pipe(
    albumDir,
    Dir.joinFile(
      StringUtils.cleanFileName(
        `${StringUtils.padNumber(track.number)} - ${track.title}${config.mp3Extension}`,
      ),
    ),
  ),
})

export const getTags = (
  // url: Url,
  metadata: AlbumMetadata,
  cover: Buffer,
  track: AlbumMetadata.Track,
): NodeID3.Tags => ({
  title: track.title,
  artist: metadata.artist,
  album: Album.stringify(metadata.album),
  year: `${metadata.year}`,
  trackNumber: `${track.number}`,
  genre: Genre.unwrap(metadata.genre),
  // comment: { language: 'eng', text: Url.unwrap(url) }, // seems bugged
  performerInfo: metadata.artist,
  image: {
    mime: 'image/jpeg',
    type: { id: 3, name: 'front cover' },
    description: '',
    imageBuffer: cover,
  },
})

export const writeAllTags = (actions: NonEmptyArray<WriteTagsAction>): Future<void> =>
  pipe(
    actions,
    NonEmptyArray.map(writeTagsAndMoveFile),
    Future.sequenceArray,
    Future.map(() => undefined),
  )

const writeTagsAndMoveFile = ({ file, newTags, renameTo }: WriteTagsAction): Future<void> =>
  pipe(
    TagsUtils.write(newTags, file),
    Future.chain(() => FsUtils.rename(file, renameTo)),
  )

export const isMp3File = (file: File): boolean =>
  file.basename.toLowerCase().endsWith(config.mp3Extension)

export const prettyTrackInfo = (metadata: AlbumMetadata) => (track: AlbumMetadata.Track): string =>
  `${metadata.artist} - ${metadata.album.name} - ${StringUtils.padNumber(track.number)} ${
    track.title
  }`

const color = (str: string, c: string): string =>
  process.stdout.isTTY ? `\x1B[${c}m${str}\x1B[0m` : str

export const logger = {
  logWithUrl: (url: Url, message?: unknown, ...optionalParams: List<unknown>): IO<void> =>
    Console.log(`[${color(Url.unwrap(url), config.colors.url)}]`, message, ...optionalParams),

  warnPrefix: `[${color('WARNING', config.colors.warn)}] `,

  error: (message?: unknown, ...optionalParams: List<unknown>): IO<void> =>
    Console.error(color(util.format(message, ...optionalParams), config.colors.error)),
}
