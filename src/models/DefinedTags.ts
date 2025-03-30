import * as D from "io-ts/Decoder";
import NodeID3 from "node-id3";

export type DefinedTags = Required<
  Pick<
    NodeID3.Tags,
    "title" | "artist" | "album" | "year" | "trackNumber" | "performerInfo"
  >
>;

export namespace DefinedTags {
  export const codec = D.type<DefinedTags>({
    title: D.string,
    artist: D.string,
    album: D.string,
    year: D.string,
    trackNumber: D.string,
    performerInfo: D.string,
  });

  export const stringify = ({
    title,
    artist,
    album,
    year,
    trackNumber,
    performerInfo,
  }: DefinedTags): string =>
    `DefinedTags(${title}, ${artist}, ${album}, ${year}, ${trackNumber}, ${performerInfo})`;
}
