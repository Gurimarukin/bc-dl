import { eq as eq_ } from "fp-ts";
import * as C from "io-ts/Codec";
import { Newtype, getEq, iso } from "newtype-ts";

import { fromNewtype } from "../utils/ioTsTypes";

export type Genre = Newtype<{ readonly Genre: unique symbol }, string>;

const isoGenre = iso<Genre>();

export namespace Genre {
  export const { wrap, unwrap } = isoGenre;
  export const eq = getEq<Genre>(eq_.eqString);
  export const codec = fromNewtype(isoGenre, C.string);
}
