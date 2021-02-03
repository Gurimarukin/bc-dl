import { Newtype, iso } from 'newtype-ts'

import { config } from '../config'

export type Album = Newtype<{ readonly Album: unique symbol }, string>

const isoAlbum = iso<Album>()

export namespace Album {
  export const { wrap, unwrap } = isoAlbum

  export const withoutEp = isoAlbum.modify(s => s.replace(config.epRegex, '').trim())
}
