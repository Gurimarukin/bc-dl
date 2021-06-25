import { pipe } from 'fp-ts/function'

import { NonEmptyArray } from '../../utils/fp'
import { Album } from '../Album'
import { Genre } from '../Genre'
import { Url } from '../Url'
import { AlbumMetadata as AlbumMetadata_ } from './AlbumMetadata'
import { fromAlbumDocument as fromAlbumDocument_ } from './fromAlbumDocument'
import { fromTrackDocument as fromTrackDocument_ } from './fromTrackDocument'
import { Track as Track_ } from './Track'

export type AlbumMetadata = AlbumMetadata_

export namespace AlbumMetadata {
  export type Track = Track_
  export const Track = Track_

  export const fromAlbumDocument = fromAlbumDocument_
  export const fromTrackDocument = fromTrackDocument_

  export const stringify = ({
    artist,
    album,
    year,
    genre,
    tracks,
    coverUrl,
  }: AlbumMetadata): string =>
    `AlbumMetadata(${artist}, ${Album.stringify(album)}, ${year}, ${Genre.unwrap(genre)}, ${pipe(
      tracks,
      NonEmptyArray.stringify(Track.stringify),
    )}, ${Url.unwrap(coverUrl)})`
}
