import { Command, Opts, codecToDecode } from 'decline-ts'
import { apply } from 'fp-ts'
import { pipe } from 'fp-ts/function'

import { Dir } from '../models/FileOrDir'
import { Genre } from '../models/Genre'
import { Url } from '../models/Url'
import { Console } from '../utils/Console'
import { Either, Future, List, Maybe, NonEmptyArray } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'

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

const genresTxt = pipe(Dir.of(__dirname), Dir.joinFile('..', '..', 'genres.txt'))

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
        : Future.left(Error(s`Unknown genre "${args.genre}" (add it to file ${genresTxt.path})`)),
    ),
    Future.map(({ args, musicLibraryDir }) => ({ ...args, musicLibraryDir })),
  )

const getGenres = (): Future<NonEmptyArray<Genre>> =>
  pipe(
    FsUtils.readFile(genresTxt),
    Future.chain(content =>
      pipe(
        content.split('\n'),
        List.filterMap(l => {
          const trimed = l.trim()
          return StringUtils.isNonEmpty(trimed) ? Maybe.some(Genre.wrap(trimed)) : Maybe.none
        }),
        NonEmptyArray.fromReadonlyArray,
        Either.fromOption(() => Error(s`Genres file shouldn't be empty: ${genresTxt.path}`)),
        Future.fromEither,
      ),
    ),
  )

export const log = (
  message?: unknown,
  ...optionalParams: ReadonlyArray<unknown>
): (<A>(fa: Future<A>) => Future<A>) =>
  Future.do(() => Future.fromIOEither(Console.log(message, ...optionalParams)))
