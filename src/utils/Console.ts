import { Either } from 'decline-ts/lib/utils/fp'

import { IO, List } from './fp'

export namespace Console {
  export const log =
    (message?: unknown, ...optionalParams: List<unknown>): IO<void> =>
    () =>
      Either.right(console.log(message, ...optionalParams))

  export const error =
    (message?: unknown, ...optionalParams: List<unknown>): IO<void> =>
    () =>
      Either.right(console.error(message, ...optionalParams))
}
