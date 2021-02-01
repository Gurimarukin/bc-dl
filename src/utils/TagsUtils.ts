import NodeID3 from 'node-id3'

import { Future } from './fp'

export namespace TagsUtils {
  export const read = (path: string): Future<NodeID3.Tags> =>
    Future.tryCatch(() => NodeID3.Promise.read(path))
}
