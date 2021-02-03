import { Tuple } from '../utils/fp'
import { s } from '../utils/StringUtils'
import { DefinedTags } from './DefinedTags'
import { File } from './FileOrDir'

export type FileWithTags = Tuple<File, DefinedTags>

export namespace FileWithTags {
  export const stringify = ([file, tags]: FileWithTags): string =>
    s`[${file.path}, ${DefinedTags.stringify(tags)}]`
}
