import { flow, pipe } from 'fp-ts/function'

import { bcDl } from '../../src/features/bcDl'
import { Dir, File, FileOrDir } from '../../src/models/FileOrDir'
import { Future, List, Tuple } from '../../src/utils/fp'
import { FsUtils } from '../../src/utils/FsUtils'
import { TagsUtils } from '../../src/utils/TagsUtils'
import {
  cleanMusicDir,
  execYoutubeDlMocked,
  httpGetBufferMocked,
  httpGetMocked,
} from './testHelpers'

const musicDir = pipe(Dir.of(__dirname), Dir.joinDir('..', 'music', 'track'))

const imageBuffer = Buffer.from('Track Image Buffer', 'utf-8')

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
