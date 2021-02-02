import { eq as eq_ } from 'fp-ts'
import { Newtype, getEq, iso } from 'newtype-ts'

import { NonEmptyString } from '../utils/fp'
import { fromNewtype } from '../utils/ioTsTypes'

export type Genre = Newtype<{ readonly Genre: unique symbol }, NonEmptyString>

const isoGenre = iso<Genre>()

export namespace Genre {
  export const { wrap, unwrap } = isoGenre
  export const eq = getEq<Genre>(eq_.eqString)
  export const codec = fromNewtype(isoGenre, NonEmptyString.codec)
}
