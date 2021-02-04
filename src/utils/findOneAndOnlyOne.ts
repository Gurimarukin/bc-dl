import { Predicate, pipe } from 'fp-ts/function'

import { List, Maybe, NonEmptyArray } from './fp'

export const findOneAndOnlyOne = <A, B>(
  predicate: Predicate<A>,
  onNone: () => B,
  onOne: (a: A) => B,
  onMultiple: (as: NonEmptyArray<A>) => B,
) => (list: List<A>): B =>
  pipe(
    list,
    List.filter(predicate),
    NonEmptyArray.fromReadonlyArray,
    Maybe.fold(
      () => onNone(),
      nea => (nea.length === 1 ? onOne(NonEmptyArray.head(nea)) : onMultiple(nea)),
    ),
  )
