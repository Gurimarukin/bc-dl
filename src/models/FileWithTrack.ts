import { Tuple } from '../utils/fp'
import { AlbumMetadata } from './AlbumMetadata'
import { File } from './FileOrDir'

export type FileWithTrack = Tuple<File, AlbumMetadata.Track>
