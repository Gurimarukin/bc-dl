import { pipe } from "fp-ts/function";

import { logger } from "../features/common";
import { Future, IO, List } from "./fp";

export const runMain = (
  main: (argv: List<string>) => Future<void>,
): Promise<void> =>
  pipe(
    main(process.argv.slice(2)),
    Future.recover((e) =>
      pipe(
        logger.error(e),
        IO.chain((): IO<void> => () => process.exit(1)),
        Future.fromIOEither,
      ),
    ),
    Future.runUnsafe,
  );
