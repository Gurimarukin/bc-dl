import {
  either,
  io,
  ioEither,
  option,
  readonlyArray,
  readonlyNonEmptyArray,
  readonlyRecord,
  readonlyTuple,
  task,
  taskEither,
} from 'fp-ts'
import { Lazy, flow, pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { Encoder } from 'io-ts/Encoder'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const todo = (..._: List<unknown>): never => {
  // eslint-disable-next-line functional/no-throw-statements
  throw Error('Missing implementation')
}

export const inspect =
  (...label: List<unknown>) =>
  <A>(a: A): A => {
    console.log(...label, a)
    return a
  }

export type Dict<K extends string, A> = readonlyRecord.ReadonlyRecord<K, A>
export const Dict = readonlyRecord

export type Either<E, A> = either.Either<E, A>
export const Either = {
  ...either,
}

export type Maybe<A> = option.Option<A>
export const Maybe = {
  ...option,
}

export type NonEmptyArray<A> = readonlyNonEmptyArray.ReadonlyNonEmptyArray<A>
const neaDecoder = <A>(codec: D.Decoder<unknown, A>): D.Decoder<unknown, NonEmptyArray<A>> =>
  pipe(D.array(codec), D.refine<List<A>, NonEmptyArray<A>>(List.isNonEmpty, 'NonEmptyArray'))
const neaEncoder = <O, A>(codec: Encoder<O, A>): Encoder<NonEmptyArray<O>, NonEmptyArray<A>> => ({
  encode: a => pipe(a, NonEmptyArray.map(codec.encode)),
})
export const NonEmptyArray = {
  ...readonlyNonEmptyArray,
  stringify: <A>(str: (a: A) => string): ((nea: NonEmptyArray<A>) => string) =>
    flow(readonlyNonEmptyArray.map(str), mkString_('NonEmptyArray(', ', ', ')')),
  decoder: neaDecoder,
  encoder: neaEncoder,
  codec: <O, A>(
    codec: C.Codec<unknown, O, A>,
  ): C.Codec<unknown, NonEmptyArray<O>, NonEmptyArray<A>> =>
    C.make(neaDecoder(codec), neaEncoder(codec)),
}

// can't just alias it to `Array`
export type List<A> = ReadonlyArray<A>
export const List = {
  ...readonlyArray,
  isEmpty: <A>(l: List<A>): l is readonly [] => readonlyArray.isEmpty(l),
  hasLength1: <A>(l: List<A>): l is NonEmptyArray<A> => l.length === 1,
  concat: <A>(a: List<A>, b: List<A>): List<A> => [...a, ...b],
}

export type Tuple<A, B> = readonly [A, B]
export const Tuple = {
  ...readonlyTuple,
  of: <A, B>(a: A, b: B): Tuple<A, B> => [a, b],
}

const unknownAsError = (e: unknown): Error => e as Error

export type Try<A> = Either<Error, A>
export const Try = {
  ...either,
  right: <A>(a: A): Try<A> => Either.right(a),
  left: <A = never>(e: Error): Try<A> => Either.left(e),
  tryCatch: <A>(a: Lazy<A>): Try<A> => Either.tryCatch(a, unknownAsError),
  get: <A>(t: Try<A>): A =>
    pipe(
      t,
      Either.getOrElse<Error, A>(e => {
        // eslint-disable-next-line functional/no-throw-statements
        throw e
      }),
    ),
}

const futureRight = <A>(a: A): Future<A> => taskEither.right(a)
export type Future<A> = task.Task<Try<A>>
export const Future = {
  ...taskEither,
  right: futureRight,
  left: <A = never>(e: Error): Future<A> => taskEither.left(e),
  tryCatch: <A>(f: Lazy<Promise<A>>): Future<A> => taskEither.tryCatch(f, unknownAsError),
  unit: futureRight<void>(undefined),
  recover: <A>(onError: (e: Error) => Future<A>): ((future: Future<A>) => Future<A>) =>
    task.chain(either.fold(onError, futureRight)),
  runUnsafe: <A>(fa: Future<A>): Promise<A> => pipe(fa, task.map(Try.get))(),
  // delay: <A>(ms: MsDuration) => (future: Future<A>): Future<A> =>
  //   pipe(future, task.delay(MsDuration.unwrap(ms))),
}

const ioTryCatch = <A>(a: Lazy<A>): IO<A> => ioEither.tryCatch(a, unknownAsError)
export type IO<A> = io.IO<Try<A>>
export const IO = {
  ...ioEither,
  tryCatch: ioTryCatch,
  unit: ioEither.right<never, void>(undefined),
  runFuture: <A>(f: Future<A>): IO<void> =>
    // eslint-disable-next-line functional/no-return-void
    ioTryCatch(() => {
      // eslint-disable-next-line functional/no-expression-statements
      Future.runUnsafe(f)
    }),
  runUnsafe: <A>(ioA: IO<A>): A => Try.get(ioA()),
}

/**
 * StringUtils, but we have to avoid cyclic dependency :/
 */

export function mkString_(sep: string): (list: List<string>) => string
export function mkString_(start: string, sep: string, end: string): (list: List<string>) => string
export function mkString_(
  startOrSep: string,
  sep?: string,
  end?: string,
): (list: List<string>) => string {
  return list =>
    sep !== undefined && end !== undefined
      ? `${startOrSep}${list.join(sep)}${end}`
      : list.join(startOrSep)
}
