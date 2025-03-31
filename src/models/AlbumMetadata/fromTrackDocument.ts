import { apply } from 'fp-ts'
import { pipe } from 'fp-ts/function'

import { DomHandler } from '../../utils/DomHandler'
import { Either, NonEmptyArray } from '../../utils/fp'
import { Genre } from '../Genre'
import { Validation } from '../Validation'
import { AlbumMetadata } from './AlbumMetadata'
import { lift, parseAlbum, parseCoverUrl, parseYear } from './helpers'

export const fromTrackDocument =
  (genre: Genre) =>
  (domHandler: DomHandler): Either<NonEmptyArray<string>, AlbumMetadata> =>
    pipe(
      apply.sequenceS(Validation.validation)({
        artist: lift('artist')(
          pipe(domHandler.document, domHandler.querySelectorTextContent('#name-section a')),
        ),
        album: parseAlbum({ isTrack: true })(domHandler),
        year: parseYear(domHandler),
        coverUrl: parseCoverUrl(domHandler),
      }),
      Either.map(
        (metadata): AlbumMetadata => ({
          ...metadata,
          genre,
          tracks: NonEmptyArray.of({ number: 1, title: metadata.album.name }),
        }),
      ),
    )
