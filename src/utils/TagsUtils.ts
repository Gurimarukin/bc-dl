import { pipe } from 'fp-ts/function'
import NodeID3 from 'node-id3'

import { Future } from './fp'

export namespace TagsUtils {
  export const read = (path: string): Future<NodeID3.Tags> =>
    Future.tryCatch(() => NodeID3.Promise.read(path))

  export const write = (tags: NodeID3.Tags, path: string): Future<void> =>
    pipe(
      Future.tryCatch(() => NodeID3.Promise.write(tags, path)),
      // Future.filterOrElse(identity, res => Error(s`${res} status when writing tags: ${path}`)),
      Future.map(() => {}),
    )
}
