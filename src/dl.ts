import { pipe } from 'fp-ts/function'

import { bcDl } from './features/bcDl'
import { AxiosUtils } from './utils/AxiosUtils'
import { execYoutubeDl } from './utils/execCommand'
import { Future } from './utils/fp'

// eslint-disable-next-line functional/no-expression-statement
pipe(
  bcDl(process.argv.slice(2), AxiosUtils.Document.get, AxiosUtils.ArrayBuffer.get, execYoutubeDl),
  Future.runUnsafe,
)
