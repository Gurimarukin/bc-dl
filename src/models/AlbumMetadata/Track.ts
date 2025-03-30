import { StringUtils } from "../../utils/StringUtils";

export type Track = {
  readonly number: number;
  readonly title: string;
};

export namespace Track {
  export const stringify = (track: Track): string =>
    `Track(${StringUtils.padNumber(track.number)}, ${track.title})`;
}
