import { Tuple } from "../utils/fp";
import { DefinedTags } from "./DefinedTags";
import { File } from "./FileOrDir";

export type FileWithTags = Tuple<File, DefinedTags>;

export namespace FileWithTags {
  export const stringify = ([file, tags]: FileWithTags): string =>
    `[${file.path}, ${DefinedTags.stringify(tags)}]`;
}
