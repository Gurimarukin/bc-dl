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

const musicDir = pipe(Dir.of(__dirname), Dir.joinDir('..', 'music', 'track'))

const imageBuffer = Buffer.from('Track Image Buffer', 'utf-8')

describe('getMetadata - track', () => {
  it('should get metadata', () =>
    pipe(
      getMetadata(httpGetMocked)(
        Genre.wrap('Electro'),
        Url.wrap('https://snakesofrussia.bandcamp.com/track/welcome-to-speed-castle'),
      ),
      Future.map(result => {
        const expected: AlbumMetadata = {
          artist: 'Snakes Of Russia',
          album: { name: 'Welcome To Speed Castle', type: 'Track' },
          year: 2019,
          genre: Genre.wrap('Electro'),
          tracks: [{ number: 1, title: 'Welcome To Speed Castle' }],
          coverUrl: Url.wrap('https://f4.bcbits.com/img/a0539454739_16.jpg'),
        }
        expect(result).toStrictEqual(expected)
      }),
      Future.runUnsafe,
    ))
})

describe('e2e - tracks', () => {
  beforeEach(() => pipe(cleanMusicDir(musicDir), Future.runUnsafe))
  afterEach(() => pipe(cleanMusicDir(musicDir), Future.runUnsafe))

  it('should e2e', () =>
    pipe(
      bcDl(
        [
          musicDir.path,
          'Electro',
          'https://snakesofrussia.bandcamp.com/track/welcome-to-speed-castle',
        ],
        httpGetMocked,
        httpGetBufferMocked,
        execYoutubeDlMocked,
      ),
      Future.chain(() => {
        const albumDir = pipe(
          musicDir,
          Dir.joinDir('Snakes Of Russia', '[2019] Welcome To Speed Castle (Track)'),
        )
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
            '01 - Welcome To Speed Castle.mp3',
            {
              album: 'Welcome To Speed Castle (Track)',
              artist: 'Snakes Of Russia',
              genre: 'Electro',
              image: {
                description: undefined,
                imageBuffer,
                mime: 'jpeg',
                type: { id: 3, name: 'front cover' },
              },
              performerInfo: 'Snakes Of Russia',
              title: 'Welcome To Speed Castle',
              trackNumber: '1',
              year: '2019',
            },
          ],
        ])
      }),
      Future.runUnsafe,
    ))
})
