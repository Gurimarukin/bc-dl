import { pipe } from 'fp-ts/function'
import NodeID3 from 'node-id3'

import { File } from '../models/FileOrDir'
import { Future } from './fp'

export namespace TagsUtils {
  export const read = (file: File): Future<NodeID3.Tags> =>
    Future.tryCatch(() => NodeID3.Promise.read(file.path))

  export const write = (tags: NodeID3.Tags, file: File): Future<void> =>
    pipe(
      Future.tryCatch(() => NodeID3.Promise.write(tags, file.path)),
      // Future.filterOrElse(identity, res => Error(s`${res} status when writing tags: ${path}`)),
      Future.map(() => {}),
    )
}
