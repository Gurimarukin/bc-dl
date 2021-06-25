import { NonEmptyArray } from '../../utils/fp'
import { Album } from '../Album'
import { Genre } from '../Genre'
import { Url } from '../Url'
import { Track } from './Track'

export type AlbumMetadata = {
  readonly artist: string
  readonly album: Album
  readonly isEp: boolean
  readonly year: number
  readonly genre: Genre
  readonly tracks: NonEmptyArray<Track>
  readonly coverUrl: Url
}
