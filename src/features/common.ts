import { AxiosResponse } from 'axios'
import { Command, Opts, codecToDecode } from 'decline-ts'
import { apply } from 'fp-ts'
import { pipe } from 'fp-ts/function'
import { JSDOM } from 'jsdom'
import NodeID3 from 'node-id3'

import { config } from '../config'
import { AlbumMetadata } from '../models/AlbumMetadata'
import { Dir, File } from '../models/FileOrDir'
import { FileWithTrack } from '../models/FileWithTrack'
import { Genre } from '../models/Genre'
import { Url } from '../models/Url'
import { Console } from '../utils/Console'
import { Either, Future, List, Maybe, NonEmptyArray } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'
import { TagsUtils } from '../utils/TagsUtils'

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
            Error(s`Unknown genre "${args.genre}" (add it to file ${config.genresTxt.path})`),
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
        Either.fromOption(() => Error(s`Genres file shouldn't be empty: ${config.genresTxt.path}`)),
        Future.fromEither,
      ),
    ),
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

export const downloadCover = (httpGetBuffer: HttpGetBuffer) => (coverUrl: Url): Future<Buffer> =>
  pipe(
    httpGetBuffer(coverUrl),
    Future.map(res => res.data),
  )

export const ensureAlbumDirectory = (
  musicLibraryDir: Dir,
  metadata: AlbumMetadata,
): Future<Dir> => {
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

export const writeTagsAndMoveFile = (
  url: Url,
  albumDir: Dir,
  metadata: AlbumMetadata,
  cover: Buffer,
) => ([file, track]: FileWithTrack): Future<void> =>
  pipe(
    TagsUtils.write(getTags(url, metadata, cover, track), file),
    Future.chain(() =>
      FsUtils.rename(
        file,
        pipe(
          albumDir,
          Dir.joinFile(
            s`${StringUtils.padNumber(track.number)} - ${StringUtils.cleanFileName(track.title)}${
              config.mp3Extension
            }`,
          ),
        ),
      ),
    ),
  )

const getTags = (
  url: Url,
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
  comment: { language: '', text: Url.unwrap(url) },
  performerInfo: metadata.artist,
  image: {
    mime: 'jpeg',
    type: { id: 3, name: 'front cover' },
    description: '',
    imageBuffer: cover,
  },
})

export const trackMatchesFile = (track: AlbumMetadata.Track, file: File): boolean =>
  file.basename.toLowerCase().includes(track.title.toLowerCase())

export const log = (
  message?: unknown,
  ...optionalParams: ReadonlyArray<unknown>
): (<A>(fa: Future<A>) => Future<A>) =>
  Future.do(() => Future.fromIOEither(Console.log(message, ...optionalParams)))
