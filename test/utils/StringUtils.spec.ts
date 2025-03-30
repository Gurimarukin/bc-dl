/* eslint-disable functional/no-return-void */
import { StringUtils } from "../../src/utils/StringUtils";

describe("StringUtils.cleanFileName", () => {
  it("should clean", () => {
    expect(StringUtils.cleanFileName('?f<i>l:e" n/a\\m|e*.ext')).toStrictEqual(
      "file name.ext",
    );
  });
});

describe("StringUtils.cleanForCompare", () => {
  it("should clean 1", () => {
    const cleanedFile = StringUtils.cleanForCompare(
      "MASTER BOOT RECORD - SET MIDI=SYNTH -1 MAP -G MODE -1.mp3",
    );
    const cleanedTrack = StringUtils.cleanForCompare(
      "SET MIDI=SYNTH:1 MAP:G MODE:1",
    );

    expect(cleanedFile).toStrictEqual(
      "master boot record set midi=synth1 mapg mode1.mp3",
    );
    expect(cleanedTrack).toStrictEqual("set midi=synth1 mapg mode1");
    expect(cleanedFile.includes(cleanedTrack)).toStrictEqual(true);
  });

  it("should clean 2", () => {
    const cleanedFile = StringUtils.cleanForCompare(
      "MASTER BOOT RECORD - SET PATH=C -_METAL.mp3",
    );
    const cleanedTrack = StringUtils.cleanForCompare("SET PATH=C:\\METAL");

    expect(cleanedFile).toStrictEqual("master boot record set path=cmetal.mp3");
    expect(cleanedTrack).toStrictEqual("set path=cmetal");
    expect(cleanedFile.includes(cleanedTrack)).toStrictEqual(true);
  });

  it("should clean 3", () => {
    const cleanedFile = StringUtils.cleanForCompare(
      "MASTER BOOT RECORD - SET SOUND=C -_CLASSICAL.mp3",
    );
    const cleanedTrack = StringUtils.cleanForCompare("SET SOUND=C:\\CLASSICAL");
    expect(cleanedFile).toStrictEqual(
      "master boot record set sound=cclassical.mp3",
    );
    expect(cleanedTrack).toStrictEqual("set sound=cclassical");
    expect(cleanedFile.includes(cleanedTrack)).toStrictEqual(true);
  });

  it("should clean 4", () => {
    const cleanedFile = StringUtils.cleanForCompare(
      "Harakiri for the Sky - Homecoming： Denied!.mp3",
    );
    const cleanedTrack = StringUtils.cleanForCompare("Homecoming: Denied!");
    expect(cleanedFile).toStrictEqual(
      "harakiri for the sky homecoming denied!.mp3",
    );
    expect(cleanedTrack).toStrictEqual("homecoming denied!");
    expect(cleanedFile.includes(cleanedTrack)).toStrictEqual(true);
  });
});
