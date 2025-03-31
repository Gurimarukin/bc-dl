/* eslint-disable functional/no-return-void */
import { Right } from "fp-ts/Either";
import { pipe } from "fp-ts/function";

import { config } from "../../src/config";
import { Album } from "../../src/models/Album";
import { AlbumMetadata } from "../../src/models/AlbumMetadata";
import { Dir } from "../../src/models/FileOrDir";
import { Genre } from "../../src/models/Genre";
import { Url } from "../../src/models/Url";
import { DomHandler } from "../../src/utils/DomHandler";
import { FsUtils } from "../../src/utils/FsUtils";
import { StringUtils } from "../../src/utils/StringUtils";
import { Either, Future, List } from "../../src/utils/fp";

describe("EP regex", () => {
  it("should parse EP", () => {
    const expectEpRegex = (str: string): jest.JestMatchers<boolean> =>
      expect(
        pipe(
          config.epRegex,
          List.some((regex) => pipe(str, StringUtils.matches(regex)))
        )
      );

    const expectAlbumName = (str: string): jest.JestMatchers<string> =>
      expect(Album.fromRaw({ isTrack: false })(str).name);

    /* eslint-disable functional/no-expression-statements */
    expectEpRegex("Deep in the Woods EP").toStrictEqual(true);
    expectAlbumName("Deep in the Woods EP").toStrictEqual("Deep in the Woods");

    expectEpRegex("Deep in the Woods E.P.").toStrictEqual(true);
    expectAlbumName("Deep in the Woods E.P.").toStrictEqual(
      "Deep in the Woods"
    );

    expectEpRegex("Deep in the Woods E . P .").toStrictEqual(true);
    expectAlbumName("Deep in the Woods E . P .").toStrictEqual(
      "Deep in the Woods"
    );

    expectEpRegex("Deep in the Woods EP.").toStrictEqual(true);
    expectAlbumName("Deep in the Woods EP.").toStrictEqual("Deep in the Woods");

    expectEpRegex("EP. Deep in the Woods").toStrictEqual(true);
    expectAlbumName("EP. Deep in the Woods").toStrictEqual("Deep in the Woods");

    expectEpRegex("EP . Deep in the Woods").toStrictEqual(true);
    expectAlbumName("EP . Deep in the Woods").toStrictEqual(
      "Deep in the Woods"
    );

    expectEpRegex("Deep in the Woods EP .").toStrictEqual(true);
    expectAlbumName("Deep in the Woods EP .").toStrictEqual(
      "Deep in the Woods"
    );

    expectEpRegex("EP Deep in the Woods").toStrictEqual(true);
    expectAlbumName("EP Deep in the Woods").toStrictEqual("Deep in the Woods");

    expectEpRegex("EP: Deep in the Woods").toStrictEqual(true);
    expectAlbumName("EP: Deep in the Woods").toStrictEqual("Deep in the Woods");

    expectEpRegex("EP - Deep in the Woods").toStrictEqual(true);
    expectAlbumName("EP - Deep in the Woods").toStrictEqual(
      "Deep in the Woods"
    );

    expectEpRegex("(EP) Deep in the Woods").toStrictEqual(true);
    expectAlbumName("(EP) Deep in the Woods").toStrictEqual(
      "Deep in the Woods"
    );

    expectEpRegex("[EP] Deep in the Woods").toStrictEqual(true);
    expectAlbumName("[EP] Deep in the Woods").toStrictEqual(
      "Deep in the Woods"
    );

    expectEpRegex("Deep in the Woods EP").toStrictEqual(true);
    expectAlbumName("Deep in the Woods EP").toStrictEqual("Deep in the Woods");

    expectEpRegex("Deep in the Woods: EP").toStrictEqual(true);
    expectAlbumName("Deep in the Woods: EP").toStrictEqual("Deep in the Woods");

    expectEpRegex("Deep in the Woods - EP").toStrictEqual(true);
    expectAlbumName("Deep in the Woods - EP").toStrictEqual(
      "Deep in the Woods"
    );

    expectEpRegex("Deep in the Woods (EP)").toStrictEqual(true);
    expectAlbumName("Deep in the Woods (EP)").toStrictEqual(
      "Deep in the Woods"
    );

    expectEpRegex("Deep in the Woods [EP]").toStrictEqual(true);
    expectAlbumName("Deep in the Woods [EP]").toStrictEqual(
      "Deep in the Woods"
    );

    expectEpRegex("Haha - EP - EP name").toStrictEqual(true);
    expectAlbumName("Haha - EP - EP name").toStrictEqual("Haha - EP name");

    //

    expectEpRegex("ABCDE. PQRS").toStrictEqual(false);
    expectAlbumName("ABCDE. PQRS").toStrictEqual("ABCDE. PQRS");

    expectEpRegex("ABCDE PQRS").toStrictEqual(false);
    expectAlbumName("ABCDE PQRS").toStrictEqual("ABCDE PQRS");

    expectEpRegex("ABCDEP. QRS").toStrictEqual(false);
    expectAlbumName("ABCDEP. QRS").toStrictEqual("ABCDEP. QRS");

    expectEpRegex("DEEP IN THE WOODS").toStrictEqual(false);
    expectAlbumName("DEEP IN THE WOODS").toStrictEqual("DEEP IN THE WOODS");

    expectEpRegex("DEEPER (Album)").toStrictEqual(false);
    expectAlbumName("DEEPER (Album)").toStrictEqual("DEEPER (Album)");

    expectEpRegex("ABCDEP").toStrictEqual(false);
    expectAlbumName("ABCDEP").toStrictEqual("ABCDEP");

    expectEpRegex("ABCDEP QRST").toStrictEqual(false);
    expectAlbumName("ABCDEP QRST").toStrictEqual("ABCDEP QRST");

    expectEpRegex("EPFGHI").toStrictEqual(false);
    expectAlbumName("EPFGHI").toStrictEqual("EPFGHI");

    expectEpRegex("ABCD EPFGHI").toStrictEqual(false);
    expectAlbumName("ABCD EPFGHI").toStrictEqual("ABCD EPFGHI");
    /* eslint-enable functional/no-expression-statements */
  });
});

describe("AlbumMetadata", () => {
  it("should parse EP", () =>
    pipe(
      FsUtils.readFile(
        pipe(
          Dir.of(__dirname),
          Dir.joinFile("..", "resources", "deep-in-the-woods-ep.html")
        )
      ),
      Future.map((html) => {
        const domHandler = DomHandler.of(html);
        const result = AlbumMetadata.fromAlbumDocument(Genre.wrap("Stoner"))(
          domHandler
        );

        expect(Either.isRight(result)).toStrictEqual(true);

        const metadata = (result as Right<AlbumMetadata>).right;
        expect(metadata).toStrictEqual<AlbumMetadata>({
          artist: "Druids of the Gue Charette",
          album: { name: "Deep in the Woods", type: "EP" },
          year: 2015,
          genre: Genre.wrap("Stoner"),
          tracks: [
            { number: 1, title: "Under The Broken Street Light" },
            { number: 2, title: "The Side Of The Road" },
            { number: 3, title: "Aloha" },
            { number: 4, title: "I've Seen The End" },
          ],
          coverUrl: Url.wrap("https://f4.bcbits.com/img/a2730847106_16.jpg"),
        });
      }),
      Future.runUnsafe
    ));

  it("should parse non EP", () =>
    pipe(
      FsUtils.readFile(
        pipe(
          Dir.of(__dirname),
          Dir.joinFile("..", "resources", "talking-to-the-moon.html")
        )
      ),
      Future.map((html) => {
        const domHandler = DomHandler.of(html);
        const result = AlbumMetadata.fromAlbumDocument(Genre.wrap("Stoner"))(
          domHandler
        );

        expect(Either.isRight(result)).toStrictEqual(true);

        const metadata = (result as Right<AlbumMetadata>).right;
        expect(metadata).toStrictEqual<AlbumMetadata>({
          artist: "Druids of the Gue Charette",
          album: { name: "Talking To The Moon", type: "LP" },
          year: 2020,
          genre: Genre.wrap("Stoner"),
          tracks: [
            { number: 1, title: "I'm Not A Bad Boy" },
            { number: 2, title: "Talking To The Moon" },
            { number: 3, title: "Parasites" },
            { number: 4, title: "Bury Your Dead" },
            { number: 5, title: "It's Alright To Fail Sometimes" },
            { number: 6, title: "Gods & Dolls" },
            { number: 7, title: "The Curse" },
            { number: 8, title: "Fading Away" },
            { number: 9, title: "Heartbeat" },
            { number: 10, title: "Every Color But The Black" },
            { number: 11, title: "Faking Emotions Is Easy" },
          ],
          coverUrl: Url.wrap("https://f4.bcbits.com/img/a1767795542_16.jpg"),
        });
      }),
      Future.runUnsafe
    ));

  it('should parse non EP (with "EP" in title)', () =>
    pipe(
      FsUtils.readFile(
        pipe(Dir.of(__dirname), Dir.joinFile("..", "resources", "deeper.html"))
      ),
      Future.map((html) => {
        const domHandler = DomHandler.of(html);
        const result = AlbumMetadata.fromAlbumDocument(Genre.wrap("Electro"))(
          domHandler
        );

        expect(Either.isRight(result)).toStrictEqual(true);

        const metadata = (result as Right<AlbumMetadata>).right;
        expect(metadata).toStrictEqual<AlbumMetadata>({
          artist: "ORAX",
          album: { name: "DEEPER (Album)", type: "LP" },
          year: 2017,
          genre: Genre.wrap("Electro"),
          tracks: [
            { number: 1, title: "Elephants" },
            { number: 2, title: "A New Day" },
            { number: 3, title: "Black Death" },
            { number: 4, title: "Spirit" },
            { number: 5, title: "Bounty Killer" },
            { number: 6, title: "Contact" },
            { number: 7, title: "Out of Nowhere" },
            { number: 8, title: "Presence" },
            { number: 9, title: "Last Boat" },
            { number: 10, title: "The Wood" },
            { number: 11, title: "Veneration" },
          ],
          coverUrl: Url.wrap("https://f4.bcbits.com/img/a2600445169_16.jpg"),
        });
      }),
      Future.runUnsafe
    ));
});
