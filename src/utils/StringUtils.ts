import { predicate } from "fp-ts";
import { flow, pipe } from "fp-ts/function";

import { Maybe, mkString_ } from "./fp";

export namespace StringUtils {
  export const isEmpty = (str: string): str is "" => str === "";
  export const isNonEmpty = predicate.not(isEmpty);

  const margin = /^[^\n\S]*\|/gm;
  export const stripMargins = (str: string): string => str.replace(margin, "");

  export const mkString = mkString_;

  const matcher = <A>(
    regex: RegExp,
    f: (arr: RegExpMatchArray) => Maybe<A>
  ) => (str: string): Maybe<A> =>
    pipe(str.match(regex), Maybe.fromNullable, Maybe.chain(f));

  export const matches = (regex: RegExp): ((str: string) => boolean) =>
    flow(matcher(regex, Maybe.some), Maybe.isSome);

  export const matcher1 = (regex: RegExp): ((str: string) => Maybe<string>) =>
    matcher(regex, ([, a]) => Maybe.fromNullable(a));

  export const padNumber = (n: number, size = 2): string =>
    String(n).padStart(size, "0");

  const fileNameForbiddenChars = /[<>:"/?*|\\]/g;
  export const cleanFileName = (str: string): string =>
    str.replace(fileNameForbiddenChars, "");

  const whitespaces = /\s+/g;
  export const cleanWhitespaces = (str: string): string =>
    str.replace(whitespaces, " ");

  const spaceDash = / -/g;
  const irrelevantChars = /[_'\-：]/g; // FULLWIDTH COLON: ：
  export const cleanForCompare = (str: string): string =>
    cleanWhitespaces(
      str
        .normalize()
        .toLowerCase()
        // https://ampmband.bandcamp.com/album/amazing-mega-party-motherfucker-2016
        // returns "AM -PM - AM -PM.mp3" (track 10)
        // needs to match Track(10, "AM:PM")
        .replace(spaceDash, "")
        .replace(fileNameForbiddenChars, "")
        .replace(irrelevantChars, "")
    );

  const weirdCharSometimesReturnedByBandcamp = new RegExp(
    `${String.fromCharCode(8203)}+`,
    "g"
  );
  export const cleanHtml = (str: string): string =>
    cleanWhitespaces(
      str
        // newline please
        .trim()
        .replace(weirdCharSometimesReturnedByBandcamp, "")
        .normalize()
    );
}
