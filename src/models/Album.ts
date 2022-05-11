import { pipe } from 'fp-ts/function'

import { config } from '../config'
import { StringUtils } from '../utils/StringUtils'
import { List, Maybe } from '../utils/fp'

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

    return pipe(
      config.epRegex,
      List.findFirst(regex => pipe(raw, StringUtils.matches(regex))),
      Maybe.fold<RegExp, Album>(
        () => ({
          name: StringUtils.cleanWhitespaces(raw).trim(),
          type: 'LP',
        }),
        regex => ({
          name: StringUtils.cleanWhitespaces(raw.replace(regex, ' ')).trim(),
          type: 'EP',
        }),
      ),
    )
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
