import { apply, eq } from 'fp-ts'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'

import { DOMUtils } from '../utils/DOMUtils'
import { Either, List, Maybe, NonEmptyArray } from '../utils/fp'
import { numberFromString } from '../utils/ioTsTypes'
import { StringUtils, s } from '../utils/StringUtils'

export type AlbumMetadata = {
  readonly artist: string
  readonly album: string
  readonly year: number
  readonly isEp: boolean
  readonly tracks: NonEmptyArray<Track>
}

type Track = {
  readonly number: number
  readonly title: string
}

type Validation<A> = Either<NonEmptyArray<string>, A>
const Validation = {
  validation: Either.getValidation(NonEmptyArray.getSemigroup<string>()),
  applicativeValidation: Either.getApplicativeValidation(NonEmptyArray.getSemigroup<string>()),
}

export namespace AlbumMetadata {
  export const fromDocument = (
    document: DOMUtils.Document,
  ): Either<NonEmptyArray<string>, AlbumMetadata> => {
    const eitherArtist = lift('artist')(DOMUtils.parseText(document, '#name-section a'))
    return pipe(
      apply.sequenceT(Validation.validation)(
        eitherArtist,
        lift('album')(DOMUtils.parseText(document, '#name-section > h2.trackTitle')),
        parseYear(document),
        parseIsEp(eitherArtist),
        parseTracks(document),
      ),
      Either.map(([artist, album, year, isEp, tracks]) => ({ artist, album, year, isEp, tracks })),
    )
  }

  const yearRegex = /([0-9]{4})$/
  const parseYear = (document: DOMUtils.Document): Validation<number> =>
    pipe(
      DOMUtils.parseText(document, '#trackInfoInner .tralbumData.tralbum-credits'),
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

  const parseTracks = (document: DOMUtils.Document): Validation<NonEmptyArray<Track>> => {
    const name: keyof AlbumMetadata = 'tracks'
    const selector = '#track_table tr.track_row_view.linked'
    return pipe(
      [...document.querySelectorAll(selector)],
      NonEmptyArray.fromArray,
      Either.fromOption(() =>
        NonEmptyArray.of(s`Failed to decode ${name}: No element matches selector: ${selector}`),
      ),
      Either.chain(
        NonEmptyArray.traverseWithIndex(Validation.applicativeValidation)(parseTrack(name)),
      ),
    )
  }

  const parseTrack = (name: keyof AlbumMetadata) => (
    i: number,
    tr: DOMUtils.Element,
  ): Validation<Track> =>
    pipe(
      apply.sequenceS(Validation.validation)({
        number: lift(s`${name}[${i}].number`)(
          pipe(
            DOMUtils.parseText(tr, 'td.track-number-col div.track_number'),
            Either.chain(str =>
              pipe(str.slice(0, -1), numberFromString.decode, Either.mapLeft(D.draw)),
            ),
          ),
        ),
        title: lift(s`${name}[${i}].title`)(
          DOMUtils.parseText(tr, 'td.title-col span.track-title'),
        ),
      }),
    )

  const lift = (name: string) => <A>(e: Either<string, A>): Validation<A> =>
    pipe(
      e,
      Either.mapLeft(err => NonEmptyArray.of(s`Failed to decode ${name}: ${err}`)),
    )
}
