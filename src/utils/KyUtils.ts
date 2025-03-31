import { pipe } from 'fp-ts/function'
import ky from 'ky'

import { Url } from '../models/Url'
import { Future } from './fp'

export namespace KyUtils {
  export namespace Document {
    export const get = (url: Url): Future<string> =>
      Future.tryCatch(() => ky.get(Url.unwrap(url)).text())
  }

  export namespace Buffer_ {
    export const get = (url: Url): Future<Buffer> =>
      pipe(
        Future.tryCatch(() => ky.get(Url.unwrap(url)).arrayBuffer()),
        Future.map(arrBuffer => Buffer.from(arrBuffer)),
      )
  }
}
