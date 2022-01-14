/* eslint-disable functional/no-return-void */
import { pipe } from 'fp-ts/function'

import { getMetadata } from '../../src/features/common'
import { AlbumMetadata } from '../../src/models/AlbumMetadata'
import { Genre } from '../../src/models/Genre'
import { Url } from '../../src/models/Url'
import { Future } from '../../src/utils/fp'
import { httpGetMocked } from './testHelpers'

describe('getMetadata - album', () => {
  it('should get metadata', () =>
    pipe(
      getMetadata(httpGetMocked)(
        Genre.wrap('Dungeon Synth'),
        Url.wrap('https://inlustris.bandcamp.com/album/stella-splendens'),
      ),
      Future.map(result => {
        const expected: AlbumMetadata = {
          artist: 'Inlustris',
          album: { name: 'Stella Splendens', type: 'LP' },
          year: 2020,
          genre: Genre.wrap('Dungeon Synth'),
          tracks: [
            { number: 1, title: 'Ave Gloriosa' },
            { number: 2, title: 'Morena Me Llaman' },
            { number: 3, title: 'Ecco La Primavera' },
            { number: 4, title: 'Gaudens In Domino' },
            { number: 5, title: 'Como Somos Per Consello CSM 119' },
            { number: 6, title: 'Santa Maria, Strela Do Dia CSM 100' },
            { number: 7, title: 'Stella Splendens' },
          ],
          coverUrl: Url.wrap('https://f4.bcbits.com/img/a3172027603_16.jpg'),
        }
        expect(result).toStrictEqual(expected)
      }),
      Future.runUnsafe,
    ))
})
