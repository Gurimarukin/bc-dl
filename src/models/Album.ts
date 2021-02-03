import { flow } from 'fp-ts/function'
import { Newtype, iso } from 'newtype-ts'

import { config } from '../config'

export type Album = Newtype<{ readonly Album: unique symbol }, string>

const isoAlbum = iso<Album>()

export namespace Album {
  export const { wrap, unwrap } = isoAlbum

  export const modify = (f: (a: string) => string): ((album: Album) => Album) =>
    flow(unwrap, f, wrap)

  export const withoutEp: (album: Album) => Album = modify(s =>
    s.replace(config.epRegex, '').trim(),
  )
}
