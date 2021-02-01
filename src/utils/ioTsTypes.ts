import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'

export const numberFromString: C.Codec<unknown, string, number> = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const n = Number(s)
      return isNaN(n) || s.trim() === '' ? D.failure(s, 'numberFromString') : D.success(n)
    }),
  ),
  { encode: String },
)
