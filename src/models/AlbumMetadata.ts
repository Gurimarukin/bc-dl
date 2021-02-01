import { apply, eq } from 'fp-ts'
import { flow, not, pipe } from 'fp-ts/function'

import { DOMUtils } from '../utils/DOMUtils'
import { Either, List, Maybe, NonEmptyArray } from '../utils/fp'
import { numberFromString } from '../utils/ioTsTypes'
import { StringUtils, s } from '../utils/StringUtils'

export type AlbumMetadata = {
  readonly artist: string
  readonly album: string
  readonly year: number
  readonly isEp: boolean
}

type Validation<A> = Either<NonEmptyArray<string>, A>

export namespace AlbumMetadata {
  export const fromDocument = (
    document: DOMUtils.Document,
  ): Either<NonEmptyArray<string>, AlbumMetadata> => {
    const eitherArtist = lift('artist')(
      parseText(document, '#name-section a', DOMUtils.HTMLAnchorElement),
    )
    return pipe(
      apply.sequenceT(Either.getValidation(NonEmptyArray.getSemigroup<string>()))(
        eitherArtist,
        lift('album')(
          parseText(document, '#name-section > h2.trackTitle', DOMUtils.HTMLHeadingElement),
        ),
        parseYear(document),
        parseIsEp(eitherArtist),
      ),
      Either.map(([artist, album, year, isEp]) => ({ artist, album, year, isEp })),
    )
  }

  const yearRegex = /([0-9]{4})$/
  const parseYear = (document: DOMUtils.Document): Validation<number> =>
    pipe(
      parseText(document, '#trackInfoInner .tralbumData.tralbum-credits', DOMUtils.HTMLDivElement),
      Either.chain(str =>
        pipe(
          str,
          StringUtils.matcher1(yearRegex),
          Maybe.chain(flow(numberFromString.decode, Maybe.fromEither)),
          Either.fromOption(() => s`Could't find year in string: "${str}"`),
        ),
      ),
      lift('year'),
    )

  const epStrings = ['EP', 'E.P', 'E. P']
  const parseIsEp = (album: Validation<string>): Either<never, boolean> =>
    pipe(
      album,
      Either.fold(
        () => false,
        str => pipe(epStrings, List.elem(eq.eqString)(str)),
      ),
      Either.right,
    )

  const parseText = <E extends HTMLElement>(
    document: DOMUtils.Document,
    selector: string,
    type: DOMUtils.Constructor<E>,
  ): Either<string, string> =>
    pipe(
      document,
      DOMUtils.querySelectorEnsureOne(selector, type),
      Either.chain(elt =>
        pipe(
          elt.textContent?.trim(),
          Maybe.fromNullable,
          Either.fromOption(() => s`No textContent for element: ${selector}`),
        ),
      ),
      Either.filterOrElse(
        not(looksLikeHTMLTag),
        str => s`textContent looks like an HTML tag and this might be a problem: ${str}`,
      ),
    )
  const looksLikeHTMLTag = (str: string): boolean => str.startsWith('<') && str.endsWith('/>')

  const lift = (name: keyof AlbumMetadata) => <A>(e: Either<string, A>): Validation<A> =>
    pipe(
      e,
      Either.mapLeft(err => NonEmptyArray.of(s`Failed to decode ${name}: ${err}`)),
    )
}
