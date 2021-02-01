import { Either } from 'decline-ts/lib/utils/fp'

import { IO } from './fp'

export namespace Console {
  export const log = (
    message?: unknown,
    ...optionalParams: ReadonlyArray<unknown>
  ): IO<void> => () => Either.right(console.log(message, ...optionalParams))
}
