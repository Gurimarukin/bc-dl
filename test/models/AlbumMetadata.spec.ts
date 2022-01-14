/* eslint-disable functional/no-return-void */
import { Right } from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

import { config } from '../../src/config'
import { Album } from '../../src/models/Album'
import { AlbumMetadata } from '../../src/models/AlbumMetadata'
import { Dir } from '../../src/models/FileOrDir'
import { Genre } from '../../src/models/Genre'
import { Url } from '../../src/models/Url'
import { DomHandler } from '../../src/utils/DomHandler'
import { Either, Future } from '../../src/utils/fp'
import { FsUtils } from '../../src/utils/FsUtils'
import { StringUtils } from '../../src/utils/StringUtils'

describe('EP regex', () => {
  it('should parse EP', () => {
    expect(pipe('Deep in the Woods E.P.', StringUtils.matches(config.epRegex))).toStrictEqual(true)
    expect(pipe('Deep in the Woods EP', StringUtils.matches(config.epRegex))).toStrictEqual(true)
    expect(pipe('Deep in the Woods E . P .', StringUtils.matches(config.epRegex))).toStrictEqual(
      true,
    )
    expect(pipe('Deep in the Woods EP .', StringUtils.matches(config.epRegex))).toStrictEqual(true)

    expect(Album.fromRaw({ isTrack: false })('Deep in the Woods E.P.').name).toStrictEqual(
      'Deep in the Woods',
    )
    expect(Album.fromRaw({ isTrack: false })('Deep in the Woods EP').name).toStrictEqual(
      'Deep in the Woods',
    )
    expect(Album.fromRaw({ isTrack: false })('Deep in the Woods E . P .').name).toStrictEqual(
      'Deep in the Woods',
    )
    expect(Album.fromRaw({ isTrack: false })('Deep in the Woods EP .').name).toStrictEqual(
      'Deep in the Woods',
    )
  })
})

describe('AlbumMetadata', () => {
  it('should parse EP', () =>
    pipe(
      FsUtils.readFile(
        pipe(Dir.of(__dirname), Dir.joinFile('..', 'resources', 'deep-in-the-woods-ep.html')),
      ),
      Future.map(html => {
        const domHandler = DomHandler.of(html)
        const result = AlbumMetadata.fromAlbumDocument(Genre.wrap('Stoner'))(domHandler)

        expect(Either.isRight(result)).toStrictEqual(true)

        const metadata = (result as Right<AlbumMetadata>).right
        expect(metadata).toStrictEqual<AlbumMetadata>({
          artist: 'Druids of the Gue Charette',
          album: { name: 'Deep in the Woods', type: 'EP' },
          year: 2015,
          genre: Genre.wrap('Stoner'),
          tracks: [
            { number: 1, title: 'Under The Broken Street Light' },
            { number: 2, title: 'The Side Of The Road' },
            { number: 3, title: 'Aloha' },
            { number: 4, title: "I've Seen The End" },
          ],
          coverUrl: Url.wrap('https://f4.bcbits.com/img/a2730847106_16.jpg'),
        })
      }),
      Future.runUnsafe,
    ))

  it('should parse non EP', () =>
    pipe(
      FsUtils.readFile(
        pipe(Dir.of(__dirname), Dir.joinFile('..', 'resources', 'talking-to-the-moon.html')),
      ),
      Future.map(html => {
        const domHandler = DomHandler.of(html)
        const result = AlbumMetadata.fromAlbumDocument(Genre.wrap('Stoner'))(domHandler)

        expect(Either.isRight(result)).toStrictEqual(true)

        const metadata = (result as Right<AlbumMetadata>).right
        expect(metadata).toStrictEqual<AlbumMetadata>({
          artist: 'Druids of the Gue Charette',
          album: { name: 'Talking To The Moon', type: 'LP' },
          year: 2020,
          genre: Genre.wrap('Stoner'),
          tracks: [
            { number: 1, title: "I'm Not A Bad Boy" },
            { number: 2, title: 'Talking To The Moon' },
            { number: 3, title: 'Parasites' },
            { number: 4, title: 'Bury Your Dead' },
            { number: 5, title: "It's Alright To Fail Sometimes" },
            { number: 6, title: 'Gods & Dolls' },
            { number: 7, title: 'The Curse' },
            { number: 8, title: 'Fading Away' },
            { number: 9, title: 'Heartbeat' },
            { number: 10, title: 'Every Color But The Black' },
            { number: 11, title: 'Faking Emotions Is Easy' },
          ],
          coverUrl: Url.wrap('https://f4.bcbits.com/img/a1767795542_16.jpg'),
        })
      }),
      Future.runUnsafe,
    ))
})
