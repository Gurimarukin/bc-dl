import { flow } from "fp-ts/function";

import { List, Maybe, NonEmptyArray } from "./fp";

export const listFoldLength = <A, B>(
  onEmpty: () => B,
  onOne: (a: A) => B,
  onMultiple: (as: NonEmptyArray<A>) => B,
): ((list: List<A>) => B) =>
  flow(
    NonEmptyArray.fromReadonlyArray,
    Maybe.fold(
      () => onEmpty(),
      (nea) =>
        nea.length === 1 ? onOne(NonEmptyArray.head(nea)) : onMultiple(nea),
    ),
  );
