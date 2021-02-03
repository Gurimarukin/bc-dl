import { pipe } from 'fp-ts/function'

import { Future, List } from './fp'

export const runMain = (main: (argv: List<string>) => Future<void>): Promise<void> =>
  pipe(
    main(process.argv.slice(2)),
    Future.recover(e => {
      console.error(e)
      // eslint-disable-next-line functional/no-expression-statement
      process.exit(1)
    }),
    Future.runUnsafe,
  )
