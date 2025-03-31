import * as C from 'io-ts/Codec'
import { Newtype, iso } from 'newtype-ts'

import { fromNewtype } from '../utils/ioTsTypes'

export type Url = Newtype<{ readonly Url: unique symbol }, string>

const isoUrl = iso<Url>()

export namespace Url {
  export const { wrap, unwrap } = isoUrl
  export const codec = fromNewtype(isoUrl, C.string)
}
