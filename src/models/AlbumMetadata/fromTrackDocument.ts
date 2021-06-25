import { DOMUtils } from '../../utils/DOMUtils'
import { Either, NonEmptyArray, todo } from '../../utils/fp'
import { Genre } from '../Genre'
import { AlbumMetadata } from './AlbumMetadata'

export const fromTrackDocument = (genre: Genre) => (
  document: DOMUtils.Document,
): Either<NonEmptyArray<string>, AlbumMetadata> => todo(genre, document)
