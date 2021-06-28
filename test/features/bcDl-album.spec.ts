import { flow, pipe } from 'fp-ts/function'

import { bcDl } from '../../src/features/bcDl'
import { getMetadata } from '../../src/features/common'
import { AlbumMetadata } from '../../src/models/AlbumMetadata'
import { Dir, File, FileOrDir } from '../../src/models/FileOrDir'
import { Genre } from '../../src/models/Genre'
import { Url } from '../../src/models/Url'
import { Future, List, Tuple } from '../../src/utils/fp'
import { FsUtils } from '../../src/utils/FsUtils'
import { TagsUtils } from '../../src/utils/TagsUtils'
import { cleanMusicDir, execYoutubeDlMocked, httpGetBufferMocked, httpGetMocked } from './helpers'

const musicDir = pipe(Dir.of(__dirname), Dir.joinDir('..', 'music', 'album'))

const imageBuffer = Buffer.from('Album Image Buffer', 'utf-8')

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

// eslint-disable-next-line functional/no-expression-statement
describe.only('e2e - album', () => {
  beforeEach(() => pipe(cleanMusicDir(musicDir), Future.runUnsafe))
  afterEach(() => pipe(cleanMusicDir(musicDir), Future.runUnsafe))

  it('should e2e', () =>
    pipe(
      bcDl(
        [musicDir.path, 'Dungeon Synth', 'https://inlustris.bandcamp.com/album/stella-splendens'],
        httpGetMocked,
        httpGetBufferMocked,
        execYoutubeDlMocked,
      ),
      Future.chain(() => {
        const albumDir = pipe(musicDir, Dir.joinDir('Inlustris', '[2020] Stella Splendens'))
        return pipe(
          FsUtils.readdir(albumDir),
          Future.chain(
            flow(
              List.map(f => {
                expect(FileOrDir.isFile(f)).toStrictEqual(true)

                const file = f as File
                return pipe(
                  TagsUtils.read(file),
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  Future.map(({ raw, ...tags }) => Tuple.of(file.basename, tags)),
                )
              }),
              Future.sequenceArray,
            ),
          ),
        )
      }),
      Future.map(result => {
        expect(result).toStrictEqual([
          [
            '01 - Ave Gloriosa.mp3',
            {
              album: 'Stella Splendens',
              artist: 'Inlustris',
              genre: 'Dungeon Synth',
              image: {
                description: undefined,
                imageBuffer,
                mime: 'jpeg',
                type: { id: 3, name: 'front cover' },
              },
              performerInfo: 'Inlustris',
              title: 'Ave Gloriosa',
              trackNumber: '1',
              year: '2020',
            },
          ],
          [
            '02 - Morena Me Llaman.mp3',
            {
              album: 'Stella Splendens',
              artist: 'Inlustris',
              genre: 'Dungeon Synth',
              image: {
                description: undefined,
                imageBuffer,
                mime: 'jpeg',
                type: { id: 3, name: 'front cover' },
              },
              performerInfo: 'Inlustris',
              title: 'Morena Me Llaman',
              trackNumber: '2',
              year: '2020',
            },
          ],
          [
            '03 - Ecco La Primavera.mp3',
            {
              album: 'Stella Splendens',
              artist: 'Inlustris',
              genre: 'Dungeon Synth',
              image: {
                description: undefined,
                imageBuffer,
                mime: 'jpeg',
                type: { id: 3, name: 'front cover' },
              },
              performerInfo: 'Inlustris',
              title: 'Ecco La Primavera',
              trackNumber: '3',
              year: '2020',
            },
          ],
          [
            '04 - Gaudens In Domino.mp3',
            {
              album: 'Stella Splendens',
              artist: 'Inlustris',
              genre: 'Dungeon Synth',
              image: {
                description: undefined,
                imageBuffer,
                mime: 'jpeg',
                type: { id: 3, name: 'front cover' },
              },
              performerInfo: 'Inlustris',
              title: 'Gaudens In Domino',
              trackNumber: '4',
              year: '2020',
            },
          ],
          [
            '05 - Como Somos Per Consello CSM 119.mp3',
            {
              album: 'Stella Splendens',
              artist: 'Inlustris',
              genre: 'Dungeon Synth',
              image: {
                description: undefined,
                imageBuffer,
                mime: 'jpeg',
                type: { id: 3, name: 'front cover' },
              },
              performerInfo: 'Inlustris',
              title: 'Como Somos Per Consello CSM 119',
              trackNumber: '5',
              year: '2020',
            },
          ],
          [
            '06 - Santa Maria, Strela Do Dia CSM 100.mp3',
            {
              album: 'Stella Splendens',
              artist: 'Inlustris',
              genre: 'Dungeon Synth',
              image: {
                description: undefined,
                imageBuffer,
                mime: 'jpeg',
                type: { id: 3, name: 'front cover' },
              },
              performerInfo: 'Inlustris',
              title: 'Santa Maria, Strela Do Dia CSM 100',
              trackNumber: '6',
              year: '2020',
            },
          ],
          [
            '07 - Stella Splendens.mp3',
            {
              album: 'Stella Splendens',
              artist: 'Inlustris',
              genre: 'Dungeon Synth',
              image: {
                description: undefined,
                imageBuffer,
                mime: 'jpeg',
                type: { id: 3, name: 'front cover' },
              },
              performerInfo: 'Inlustris',
              title: 'Stella Splendens',
              trackNumber: '7',
              year: '2020',
            },
          ],
        ])
      }),
      Future.runUnsafe,
    ))
})
