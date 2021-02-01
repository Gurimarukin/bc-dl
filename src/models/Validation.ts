import { Either, NonEmptyArray } from '../utils/fp'

export type Validation<A> = Either<NonEmptyArray<string>, A>

export namespace Validation {
  export const validation = Either.getValidation(NonEmptyArray.getSemigroup<string>())
  export const applicativeValidation = Either.getApplicativeValidation(
    NonEmptyArray.getSemigroup<string>(),
  )
}
