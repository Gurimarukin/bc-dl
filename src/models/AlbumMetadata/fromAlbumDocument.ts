import { apply } from 'fp-ts'
import { pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'

import { DomHandler } from '../../utils/DomHandler'
import { Either, NonEmptyArray } from '../../utils/fp'
import { numberFromString } from '../../utils/ioTsTypes'
import { Genre } from '../Genre'
import { Validation } from '../Validation'
import { AlbumMetadata } from './AlbumMetadata'
import { Track } from './Track'
import { lift, parseAlbum, parseCoverUrl, parseYear } from './helpers'

export const fromAlbumDocument = (genre: Genre) => (
  domHandler: DomHandler,
): Either<NonEmptyArray<string>, AlbumMetadata> =>
  pipe(
    apply.sequenceS(Validation.validation)({
      artist: lift('artist')(
        pipe(domHandler.document, domHandler.querySelectorTextContent('#name-section a')),
      ),
      album: parseAlbum({ isTrack: false })(domHandler),
      year: parseYear(domHandler),
      tracks: parseTracks(domHandler),
      coverUrl: parseCoverUrl(domHandler),
    }),
    Either.map((metadata): AlbumMetadata => ({ ...metadata, genre })),
  )

const parseTracks = (domHandler: DomHandler): Validation<NonEmptyArray<Track>> => {
  const name: keyof AlbumMetadata = 'tracks'
  const selector = '#track_table tr.track_row_view.linked'
  return pipe(
    domHandler.document,
    DomHandler.querySelectorAllNonEmpty(selector),
    Either.chain(
      NonEmptyArray.traverseWithIndex(Validation.validation)(parseTrack(domHandler, name)),
    ),
  )
}

const parseTrack = (domHandler: DomHandler, name: keyof AlbumMetadata) => (
  i: number,
  tr: ParentNode,
): Validation<Track> =>
  pipe(
    apply.sequenceS(Validation.validation)({
      number: lift(`${name}[${i}].number`)(
        pipe(
          tr,
          domHandler.querySelectorTextContent('td.track-number-col div.track_number'),
          Either.chain(str =>
            pipe(str.slice(0, -1), numberFromString.decode, Either.mapLeft(D.draw)),
          ),
        ),
      ),
      title: lift(`${name}[${i}].title`)(
        pipe(tr, domHandler.querySelectorTextContent('td.title-col span.track-title')),
      ),
    }),
  )
