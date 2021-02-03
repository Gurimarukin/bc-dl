import NodeID3 from 'node-id3'

import { File } from './FileOrDir'

export type WriteTagsAction = {
  readonly file: File
  readonly newTags: NodeID3.Tags
  readonly renameTo: File
}
