import { apply } from 'fp-ts'
import { pipe } from 'fp-ts/function'

import { DOMUtils } from '../../utils/DOMUtils'
import { Either, NonEmptyArray } from '../../utils/fp'
import { Genre } from '../Genre'
import { Validation } from '../Validation'
import { AlbumMetadata } from './AlbumMetadata'
import { lift, parseAlbum, parseCoverUrl, parseYear } from './helpers'

export const fromTrackDocument = (genre: Genre) => (
  document: DOMUtils.Document,
): Either<NonEmptyArray<string>, AlbumMetadata> =>
  pipe(
    apply.sequenceS(Validation.validation)({
      artist: lift('artist')(DOMUtils.parseText(document, '#name-section a')),
      album: parseAlbum({ isTrack: true })(document),
      year: parseYear(document),
      coverUrl: parseCoverUrl(document),
    }),
    Either.map(
      (metadata): AlbumMetadata => ({
        ...metadata,
        genre,
        tracks: NonEmptyArray.of({ number: 1, title: metadata.album.name }),
      }),
    ),
  )
