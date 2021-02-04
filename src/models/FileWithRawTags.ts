import NodeID3 from 'node-id3'

import { Tuple } from '../utils/fp'
import { File } from './FileOrDir'

export type FileWithRawTags = Tuple<File, NodeID3.Tags>
