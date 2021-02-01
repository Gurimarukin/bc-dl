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
import { Lazy, pipe } from 'fp-ts/function'
import { Kind, Kind2, URIS, URIS2 } from 'fp-ts/HKT'
import { Monad1, Monad2 } from 'fp-ts/Monad'

export const todo = (...[]: List<unknown>): never => {
  // eslint-disable-next-line functional/no-throw-statement
  throw Error('Missing implementation')
}

export const inspect = (...label: List<unknown>) => <A>(a: A): A => {
  console.log(...label, a)
  return a
}

export type Dict<K extends string, A> = readonlyRecord.ReadonlyRecord<K, A>
export const Dict = readonlyRecord

export type Either<E, A> = either.Either<E, A>
export const Either = {
  ...either,
  do: getDo2(either.either),
}

export type Maybe<A> = option.Option<A>
export const Maybe = {
  ...option,
  do: getDo1(option.option),
}

export type NonEmptyArray<A> = readonlyNonEmptyArray.ReadonlyNonEmptyArray<A>
export const NonEmptyArray = {
  ...readonlyNonEmptyArray,
  do: getDo1(readonlyNonEmptyArray.readonlyNonEmptyArray),
}

// can't just alias it to `Array`
export type List<A> = ReadonlyArray<A>
export const List = {
  ...readonlyArray,
  isEmpty: <A>(l: List<A>): l is readonly [] => readonlyArray.isEmpty(l),
  hasLength1: <A>(l: List<A>): l is NonEmptyArray<A> => l.length === 1,
  concat: <A>(a: List<A>, b: List<A>): List<A> => [...a, ...b],
  do: getDo1(readonlyArray.readonlyArray),
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
        // eslint-disable-next-line functional/no-throw-statement
        throw e
      }),
    ),
  do: getDo2(either.either),
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
  do: getDo2(taskEither.taskEither),
}

const ioTryCatch = <A>(a: Lazy<A>): IO<A> => ioEither.tryCatch(a, unknownAsError)
export type IO<A> = io.IO<Try<A>>
export const IO = {
  ...ioEither,
  tryCatch: ioTryCatch,
  unit: ioEither.right<never, void>(undefined),
  runFuture: <A>(f: Future<A>): IO<void> =>
    ioTryCatch(() => {
      // eslint-disable-next-line functional/no-expression-statement
      Future.runUnsafe(f)
    }),
  runUnsafe: <A>(ioA: IO<A>): A => Try.get(ioA()),
  do: getDo2(ioEither.ioEither),
}

function getDo1<F extends URIS>(m: Monad1<F>) {
  return <A>(f: (a: A) => Kind<F, void>) => (fa: Kind<F, A>): Kind<F, A> =>
    m.chain(fa, a => m.map(f(a), () => a))
}

function getDo2<F extends URIS2>(m: Monad2<F>) {
  return <E, A>(f: (a: A) => Kind2<F, E, void>) => (fa: Kind2<F, E, A>): Kind2<F, E, A> =>
    m.chain(fa, a => m.map(f(a), () => a))
}
