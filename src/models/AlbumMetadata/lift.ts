import { pipe } from 'fp-ts/function'

import { Either, NonEmptyArray } from '../../utils/fp'
import { Validation } from '../Validation'

export const lift = (name: string) => <A>(e: Either<string, A>): Validation<A> =>
  pipe(
    e,
    Either.mapLeft(err => NonEmptyArray.of(`Failed to decode ${name}: ${err}`)),
  )
