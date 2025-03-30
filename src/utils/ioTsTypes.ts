import { flow, pipe } from "fp-ts/function";
import * as C from "io-ts/Codec";
import * as D from "io-ts/Decoder";
import { Iso } from "monocle-ts";
import { AnyNewtype, CarrierOf } from "newtype-ts";

import { Either } from "./fp";

export const fromNewtype = <N extends AnyNewtype = never>(
  { wrap, unwrap }: Iso<N, CarrierOf<N>>,
  codec: C.Codec<unknown, CarrierOf<N>, CarrierOf<N>>,
): C.Codec<unknown, CarrierOf<N>, N> =>
  C.make(
    { decode: flow(codec.decode, Either.map(wrap)) },
    { encode: flow(unwrap, codec.encode) },
  );

export const numberFromString: C.Codec<unknown, string, number> = C.make(
  pipe(
    D.string,
    D.parse((s) => {
      const n = Number(s);
      return isNaN(n) || s.trim() === ""
        ? D.failure(s, "NumberFromString")
        : D.success(n);
    }),
  ),
  { encode: String },
);
