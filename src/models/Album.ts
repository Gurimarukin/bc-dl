import { pipe } from 'fp-ts/function'

import { config } from '../config'
import { StringUtils } from '../utils/StringUtils'

export type IsTrack = {
  readonly isTrack: boolean
}

export type Album = {
  readonly name: string
  readonly type: Album.Type
}

export namespace Album {
  export type Type = 'LP' | 'EP' | 'Track'

  export const fromRaw = ({ isTrack }: IsTrack) => (raw: string): Album => {
    if (isTrack)
      return {
        name: StringUtils.cleanWhitespaces(raw).trim(),
        type: 'Track',
      }

    if (pipe(raw, StringUtils.matches(config.epRegex))) {
      return {
        name: StringUtils.cleanWhitespaces(raw.replace(config.epRegex, '')).trim(),
        type: 'EP',
      }
    }

    return {
      name: StringUtils.cleanWhitespaces(raw).trim(),
      type: 'LP',
    }
  }

  export const stringify = (album: Album): string => {
    switch (album.type) {
      case 'LP':
        return album.name
      case 'EP':
        return `${album.name} (EP)`
      case 'Track':
        return `${album.name} (Track)`
    }
  }

  // export const modify = (f: (a: string) => string): ((album: Album) => Album) =>
  //   flow(unwrap, f, wrap)

  // export const withoutEp: (album: Album) => Album = modify(s =>
  //   s.replace(config.epRegex, '').trim(),
  // )

  // return pipe(
  //   album,
  //   Either.map(
  //     flow(Album.wrap, a => [
  //       isEp
  //         ? pipe(
  //             Album.withoutEp(a),
  //             Album.modify(_ => StringUtils.cleanWhitespaces(_).trim()),
  //           )
  //         : a,
  //       isEp,
  //     ]),
  //   ),
  // )

  // ${metadata.isEp ? ' (EP)' : ''
}
