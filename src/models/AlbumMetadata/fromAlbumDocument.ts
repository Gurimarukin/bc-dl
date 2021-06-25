import { apply } from 'fp-ts'
import { pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'

import { DOMUtils } from '../../utils/DOMUtils'
import { Either, NonEmptyArray } from '../../utils/fp'
import { numberFromString } from '../../utils/ioTsTypes'
import { Genre } from '../Genre'
import { Validation } from '../Validation'
import { AlbumMetadata } from './AlbumMetadata'
import { lift, parseAlbum, parseCoverUrl, parseYear } from './helpers'
import { Track } from './Track'

export const fromAlbumDocument = (genre: Genre) => (
  document: DOMUtils.Document,
): Either<NonEmptyArray<string>, AlbumMetadata> =>
  pipe(
    apply.sequenceS(Validation.validation)({
      artist: lift('artist')(DOMUtils.parseText(document, '#name-section a')),
      album: parseAlbum({ isTrack: false })(document),
      year: parseYear(document),
      tracks: parseTracks(document),
      coverUrl: parseCoverUrl(document),
    }),
    Either.map((metadata): AlbumMetadata => ({ ...metadata, genre })),
  )

const parseTracks = (document: DOMUtils.Document): Validation<NonEmptyArray<Track>> => {
  const name: keyof AlbumMetadata = 'tracks'
  const selector = '#track_table tr.track_row_view.linked'
  return pipe(
    [...document.querySelectorAll(selector)],
    NonEmptyArray.fromArray,
    Either.fromOption(() =>
      NonEmptyArray.of(`Failed to decode ${name}: No element matches selector: ${selector}`),
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
      number: lift(`${name}[${i}].number`)(
        pipe(
          DOMUtils.parseText(tr, 'td.track-number-col div.track_number'),
          Either.chain(str =>
            pipe(str.slice(0, -1), numberFromString.decode, Either.mapLeft(D.draw)),
          ),
        ),
      ),
      title: lift(`${name}[${i}].title`)(DOMUtils.parseText(tr, 'td.title-col span.track-title')),
    }),
  )
