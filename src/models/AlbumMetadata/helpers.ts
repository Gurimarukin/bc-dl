import { flow, pipe } from 'fp-ts/function'

import { config } from '../../config'
import { DOMUtils } from '../../utils/DOMUtils'
import { Either, Maybe, NonEmptyArray } from '../../utils/fp'
import { numberFromString } from '../../utils/ioTsTypes'
import { StringUtils } from '../../utils/StringUtils'
import { Album, IsTrack } from '../Album'
import { Url } from '../Url'
import { Validation } from '../Validation'

export const lift = (name: string) => <A>(e: Either<string, A>): Validation<A> =>
  pipe(
    e,
    Either.mapLeft(err => NonEmptyArray.of(`Failed to decode ${name}: ${err}`)),
  )

export const parseAlbum = ({ isTrack }: IsTrack) => (
  document: DOMUtils.Document,
): Validation<Album> =>
  pipe(
    DOMUtils.parseText(document, '#name-section > h2.trackTitle'),
    lift('album'),
    Either.map(Album.fromRaw({ isTrack })),
  )

export const parseYear = (document: DOMUtils.Document): Validation<number> =>
  pipe(
    DOMUtils.parseText(document, '#trackInfoInner .tralbumData.tralbum-credits'),
    Either.chain(str =>
      pipe(
        str,
        StringUtils.matcher1(config.yearRegex),
        Maybe.chain(flow(numberFromString.decode, Maybe.fromEither)),
        Either.fromOption(() => `Could't find year in string: "${str}"`),
      ),
    ),
    lift('year'),
  )

export const parseCoverUrl = (document: DOMUtils.Document): Validation<Url> =>
  pipe(
    document,
    DOMUtils.querySelectorEnsureOne('#tralbumArt img', DOMUtils.HTMLImageElement),
    Either.map(e => e.src),
    Either.filterOrElse(isJpg, src => `Expected cover to be a jpg: ${src}`),
    Either.map(Url.wrap),
    lift('coverUrl'),
  )

const isJpg = (src: string): boolean => {
  const srcLower = src.toLowerCase()
  return config.jpgExtension.some(ext => srcLower.endsWith(ext))
}
