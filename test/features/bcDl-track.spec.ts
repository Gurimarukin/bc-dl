/* eslint-disable functional/no-return-void */
import { pipe } from "fp-ts/function";

import { getMetadata } from "../../src/features/common";
import { AlbumMetadata } from "../../src/models/AlbumMetadata";
import { Genre } from "../../src/models/Genre";
import { Url } from "../../src/models/Url";
import { Future } from "../../src/utils/fp";
import { httpGetMocked } from "./testHelpers";

describe("getMetadata - track", () => {
  it("should get metadata", () =>
    pipe(
      getMetadata(httpGetMocked)(
        Genre.wrap("Electro"),
        Url.wrap(
          "https://snakesofrussia.bandcamp.com/track/welcome-to-speed-castle",
        ),
      ),
      Future.map((result) => {
        const expected: AlbumMetadata = {
          artist: "Snakes Of Russia",
          album: { name: "Welcome To Speed Castle", type: "Track" },
          year: 2019,
          genre: Genre.wrap("Electro"),
          tracks: [{ number: 1, title: "Welcome To Speed Castle" }],
          coverUrl: Url.wrap("https://f4.bcbits.com/img/a0539454739_16.jpg"),
        };
        expect(result).toStrictEqual(expected);
      }),
      Future.runUnsafe,
    ));
});
