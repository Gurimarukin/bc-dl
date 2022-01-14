/* eslint-disable functional/no-return-void */
import { flow, pipe } from 'fp-ts/function'

import { getActions, ordStringLength } from '../../src/features/bcDl'
import { getTags } from '../../src/features/common'
import { AlbumMetadata } from '../../src/models/AlbumMetadata'
import { Dir, File } from '../../src/models/FileOrDir'
import { Genre } from '../../src/models/Genre'
import { Url } from '../../src/models/Url'
import { WriteTagsAction } from '../../src/models/WriteTagsAction'
import { Either, Future, List, NonEmptyArray } from '../../src/utils/fp'

const imageBuffer = Buffer.from('Image Buffer', 'utf-8')

describe('getActions', () => {
  const testGetActions = (metadata: AlbumMetadata, mp3Files: NonEmptyArray<File>) => (
    f: (result: Either<Error, NonEmptyArray<WriteTagsAction>>) => void,
  ): Promise<void> =>
    pipe(
      getActions(mp3Files, Dir.of(''), metadata, imageBuffer),
      Future.map(Either.right),
      Future.recover<Either<Error, NonEmptyArray<WriteTagsAction>>>(
        flow(Either.left, Future.right),
      ),
      Future.map(f),
      Future.runUnsafe,
    )

  /**
   * Artist's name and album's name are the same
   */
  const blackSabb: AlbumMetadata = {
    artist: 'Black Sabbath',
    album: { name: 'Black Sabbath', type: 'LP' },
    year: 1970,
    genre: Genre.wrap('Heavy Metal'),
    tracks: [
      { number: 1, title: 'Black Sabbath' },
      { number: 2, title: 'The Wizard' },
      { number: 3, title: 'Behind the Wall of Sleep' },
      { number: 4, title: 'N.I.B.' },
      { number: 5, title: 'The Wizard II' },
    ],
    coverUrl: Url.wrap('https://www.metal-archives.com/images/4/8/2/482.jpg?5008'),
  }

  it('should for files having only track title', () =>
    testGetActions(blackSabb, [
      File.fromPath('black sabbath (1).mp3'),
      File.fromPath('the wizard (2).mp3'),
      File.fromPath('the wizard ii (5).mp3'),
    ])(result => {
      expect(result).toStrictEqual(
        Either.right<Error, NonEmptyArray<WriteTagsAction>>([
          {
            file: File.fromPath('black sabbath (1).mp3'),
            newTags: getTags(blackSabb, imageBuffer, {
              number: 1,
              title: 'Black Sabbath',
            }),
            renameTo: File.fromPath('01 - Black Sabbath.mp3'),
          },
          {
            file: File.fromPath('the wizard (2).mp3'),
            newTags: getTags(blackSabb, imageBuffer, { number: 2, title: 'The Wizard' }),
            renameTo: File.fromPath('02 - The Wizard.mp3'),
          },
          {
            file: File.fromPath('the wizard ii (5).mp3'),
            newTags: getTags(blackSabb, imageBuffer, { number: 5, title: 'The Wizard II' }),
            renameTo: File.fromPath('05 - The Wizard II.mp3'),
          },
        ]),
      )
    }))

  it('should for files having artist name and track title', () =>
    testGetActions(blackSabb, [
      File.fromPath('black sabbath - black sabbath (1).mp3'),
      File.fromPath('black sabbath - the wizard (2).mp3'),
      File.fromPath('black sabbath - the wizard ii (5).mp3'),
    ])(result => {
      expect(result).toStrictEqual(
        Either.right<Error, NonEmptyArray<WriteTagsAction>>([
          {
            file: File.fromPath('black sabbath - black sabbath (1).mp3'),
            newTags: getTags(blackSabb, imageBuffer, {
              number: 1,
              title: 'Black Sabbath',
            }),
            renameTo: File.fromPath('01 - Black Sabbath.mp3'),
          },
          {
            file: File.fromPath('black sabbath - the wizard (2).mp3'),
            newTags: getTags(blackSabb, imageBuffer, { number: 2, title: 'The Wizard' }),
            renameTo: File.fromPath('02 - The Wizard.mp3'),
          },
          {
            file: File.fromPath('black sabbath - the wizard ii (5).mp3'),
            newTags: getTags(blackSabb, imageBuffer, { number: 5, title: 'The Wizard II' }),
            renameTo: File.fromPath('05 - The Wizard II.mp3'),
          },
        ]),
      )
    }))

  it('should for files having album name and track title', () =>
    testGetActions(blackSabb, [
      File.fromPath('black sabbath - black sabbath (1).mp3'),
      File.fromPath('black sabbath - the wizard (2).mp3'),
      File.fromPath('black sabbath - the wizard ii (5).mp3'),
    ])(result => {
      expect(result).toStrictEqual(
        Either.right<Error, NonEmptyArray<WriteTagsAction>>([
          {
            file: File.fromPath('black sabbath - black sabbath (1).mp3'),
            newTags: getTags(blackSabb, imageBuffer, {
              number: 1,
              title: 'Black Sabbath',
            }),
            renameTo: File.fromPath('01 - Black Sabbath.mp3'),
          },
          {
            file: File.fromPath('black sabbath - the wizard (2).mp3'),
            newTags: getTags(blackSabb, imageBuffer, { number: 2, title: 'The Wizard' }),
            renameTo: File.fromPath('02 - The Wizard.mp3'),
          },
          {
            file: File.fromPath('black sabbath - the wizard ii (5).mp3'),
            newTags: getTags(blackSabb, imageBuffer, { number: 5, title: 'The Wizard II' }),
            renameTo: File.fromPath('05 - The Wizard II.mp3'),
          },
        ]),
      )
    }))

  it('should for files having artist name, album name and track title', () =>
    testGetActions(blackSabb, [
      File.fromPath('black sabbath - black sabbath - black sabbath (1).mp3'),
      File.fromPath('black sabbath - black sabbath - the wizard (2).mp3'),
      File.fromPath('black sabbath - black sabbath - the wizard ii (5).mp3'),
    ])(result => {
      expect(result).toStrictEqual(
        Either.right<Error, NonEmptyArray<WriteTagsAction>>([
          {
            file: File.fromPath('black sabbath - black sabbath - black sabbath (1).mp3'),
            newTags: getTags(blackSabb, imageBuffer, {
              number: 1,
              title: 'Black Sabbath',
            }),
            renameTo: File.fromPath('01 - Black Sabbath.mp3'),
          },
          {
            file: File.fromPath('black sabbath - black sabbath - the wizard (2).mp3'),
            newTags: getTags(blackSabb, imageBuffer, { number: 2, title: 'The Wizard' }),
            renameTo: File.fromPath('02 - The Wizard.mp3'),
          },
          {
            file: File.fromPath('black sabbath - black sabbath - the wizard ii (5).mp3'),
            newTags: getTags(blackSabb, imageBuffer, { number: 5, title: 'The Wizard II' }),
            renameTo: File.fromPath('05 - The Wizard II.mp3'),
          },
        ]),
      )
    }))

  /**
   * Artist's name includes album's name
   */
  const artistIncludesAlbum: AlbumMetadata = {
    artist: 'Muezli II',
    album: { name: 'Muezli', type: 'LP' },
    year: 1970,
    genre: Genre.wrap('Heavy Metal'),
    tracks: [
      { number: 1, title: 'Black Sabbath' },
      { number: 2, title: 'Muezli' },
      { number: 3, title: 'Muezli V' },
      { number: 4, title: 'Muezli II' },
    ],
    coverUrl: Url.wrap('https://www.metal-archives.com/images/4/8/2/482.jpg?5008'),
  }

  it('should for files having artist name, album name and track title (artistIncludesAlbum)', () =>
    testGetActions(artistIncludesAlbum, [
      File.fromPath('muezli ii - muezli - black sabbath (1).mp3'),
      File.fromPath('muezli ii - muezli - muezli (2).mp3'),
      File.fromPath('muezli ii - muezli - muezli v (3).mp3'),
      File.fromPath('muezli ii - muezli - muezli ii (4).mp3'),
    ])(result => {
      expect(result).toStrictEqual(
        Either.right<Error, NonEmptyArray<WriteTagsAction>>([
          {
            file: File.fromPath('muezli ii - muezli - black sabbath (1).mp3'),
            newTags: getTags(artistIncludesAlbum, imageBuffer, {
              number: 1,
              title: 'Black Sabbath',
            }),
            renameTo: File.fromPath('01 - Black Sabbath.mp3'),
          },
          {
            file: File.fromPath('muezli ii - muezli - muezli (2).mp3'),
            newTags: getTags(artistIncludesAlbum, imageBuffer, { number: 2, title: 'Muezli' }),
            renameTo: File.fromPath('02 - Muezli.mp3'),
          },
          {
            file: File.fromPath('muezli ii - muezli - muezli v (3).mp3'),
            newTags: getTags(artistIncludesAlbum, imageBuffer, { number: 3, title: 'Muezli V' }),
            renameTo: File.fromPath('03 - Muezli V.mp3'),
          },
          {
            file: File.fromPath('muezli ii - muezli - muezli ii (4).mp3'),
            newTags: getTags(artistIncludesAlbum, imageBuffer, { number: 4, title: 'Muezli II' }),
            renameTo: File.fromPath('04 - Muezli II.mp3'),
          },
        ]),
      )
    }))

  /**
   * Album's name includes artist's name
   */
  const albumIncludesArtist: AlbumMetadata = {
    artist: 'Muezli',
    album: { name: 'Muezli II', type: 'LP' },
    year: 1970,
    genre: Genre.wrap('Heavy Metal'),
    tracks: [
      { number: 1, title: 'Black Sabbath' },
      { number: 2, title: 'Muezli' },
      { number: 3, title: 'Muezli V' },
      { number: 4, title: 'Muezli II' },
    ],
    coverUrl: Url.wrap('https://www.metal-archives.com/images/4/8/2/482.jpg?5008'),
  }

  it('should for files having artist name, album name and track title (albumIncludesArtist)', () =>
    testGetActions(albumIncludesArtist, [
      File.fromPath('muezli - muezli ii - black sabbath (1).mp3'),
      File.fromPath('muezli - muezli ii - muezli (2).mp3'),
      File.fromPath('muezli - muezli ii - muezli v (3).mp3'), // TODO
      File.fromPath('muezli - muezli ii - muezli ii (4).mp3'), // TODO
    ])(result => {
      expect(result).toStrictEqual(
        Either.right<Error, NonEmptyArray<WriteTagsAction>>([
          {
            file: File.fromPath('muezli - muezli ii - black sabbath (1).mp3'),
            newTags: getTags(albumIncludesArtist, imageBuffer, {
              number: 1,
              title: 'Black Sabbath',
            }),
            renameTo: File.fromPath('01 - Black Sabbath.mp3'),
          },
          {
            file: File.fromPath('muezli - muezli ii - muezli (2).mp3'),
            newTags: getTags(albumIncludesArtist, imageBuffer, { number: 2, title: 'Muezli' }),
            renameTo: File.fromPath('02 - Muezli.mp3'),
          },
          {
            file: File.fromPath('muezli - muezli ii - muezli v (3).mp3'),
            newTags: getTags(albumIncludesArtist, imageBuffer, { number: 3, title: 'Muezli V' }),
            renameTo: File.fromPath('03 - Muezli V.mp3'),
          },
          {
            file: File.fromPath('muezli - muezli ii - muezli ii (4).mp3'),
            newTags: getTags(albumIncludesArtist, imageBuffer, { number: 4, title: 'Muezli II' }),
            renameTo: File.fromPath('04 - Muezli II.mp3'),
          },
        ]),
      )
    }))

  /**
   * Artist's name and album's name are different
   */
  const albumArtistDifferent: AlbumMetadata = {
    artist: 'Artist',
    album: { name: 'Album', type: 'LP' },
    year: 1970,
    genre: Genre.wrap('Heavy Metal'),
    tracks: [
      { number: 1, title: 'Track' },
      { number: 2, title: 'Album' },
      { number: 3, title: 'Artist' },
    ],
    coverUrl: Url.wrap('https://www.metal-archives.com/images/4/8/2/482.jpg?5008'),
  }

  it('should for files having artist name, album name and track title (albumArtistDifferent)', () =>
    testGetActions(albumArtistDifferent, [
      File.fromPath('artist - album - track (1).mp3'),
      File.fromPath('artist - album - album (2).mp3'),
      File.fromPath('artist - album - artist (3).mp3'),
    ])(result => {
      expect(result).toStrictEqual(
        Either.right<Error, NonEmptyArray<WriteTagsAction>>([
          {
            file: File.fromPath('artist - album - track (1).mp3'),
            newTags: getTags(albumArtistDifferent, imageBuffer, { number: 1, title: 'Track' }),
            renameTo: File.fromPath('01 - Track.mp3'),
          },
          {
            file: File.fromPath('artist - album - album (2).mp3'),
            newTags: getTags(albumArtistDifferent, imageBuffer, { number: 2, title: 'Album' }),
            renameTo: File.fromPath('02 - Album.mp3'),
          },
          {
            file: File.fromPath('artist - album - artist (3).mp3'),
            newTags: getTags(albumArtistDifferent, imageBuffer, { number: 3, title: 'Artist' }),
            renameTo: File.fromPath('03 - Artist.mp3'),
          },
        ]),
      )
    }))

  /**
   * Snakes Of Russia - Shallow End Diving
   * Every track contains album's name
   */
  const snakesOfRussiaShallowEndDiving: AlbumMetadata = {
    artist: 'Snakes Of Russia',
    album: { name: 'Shallow End Diving', type: 'LP' },
    year: 2021,
    genre: Genre.wrap('Electro'),
    tracks: [
      { number: 1, title: 'Shallow End Diving' },
      { number: 2, title: 'Shallow End Diving - Sombre Lux Remix' },
    ],
    coverUrl: Url.wrap('https://f4.bcbits.com/img/a2985982985_16.jpg'),
  }

  it('should Snakes Of Russia - Shallow End Diving', () =>
    testGetActions(snakesOfRussiaShallowEndDiving, [
      File.fromPath('Snakes Of Russia - Shallow End Diving.mp3'),
      File.fromPath('Snakes Of Russia - Shallow End Diving - Sombre Lux Remix.mp3'),
    ])(result => {
      expect(result).toStrictEqual(
        Either.right<Error, NonEmptyArray<WriteTagsAction>>([
          {
            file: File.fromPath('Snakes Of Russia - Shallow End Diving.mp3'),
            newTags: getTags(snakesOfRussiaShallowEndDiving, imageBuffer, {
              number: 1,
              title: 'Shallow End Diving',
            }),
            renameTo: File.fromPath('01 - Shallow End Diving.mp3'),
          },
          {
            file: File.fromPath('Snakes Of Russia - Shallow End Diving - Sombre Lux Remix.mp3'),
            newTags: getTags(snakesOfRussiaShallowEndDiving, imageBuffer, {
              number: 2,
              title: 'Shallow End Diving - Sombre Lux Remix',
            }),
            renameTo: File.fromPath('02 - Shallow End Diving - Sombre Lux Remix.mp3'),
          },
        ]),
      )
    }))
})

describe('ordStringLength', () => {
  it('should sort', () => {
    const expected = ['looooong', '012', 'abc']

    expect(pipe(['012', 'looooong', 'abc'], List.sort(ordStringLength))).toStrictEqual(expected)
    expect(pipe(['abc', 'looooong', '012'], List.sort(ordStringLength))).toStrictEqual(expected)
  })
})
