import { flow, pipe } from 'fp-ts/function'

import { ExecYoutubeDl, HttpGet, HttpGetBuffer, bcDl, getMetadata } from '../../src/features/bcDl'
import { AlbumMetadata } from '../../src/models/AlbumMetadata'
import { Dir, File, FileOrDir } from '../../src/models/FileOrDir'
import { Genre } from '../../src/models/Genre'
import { Future, List, NonEmptyString, Tuple } from '../../src/utils/fp'
import { FsUtils } from '../../src/utils/FsUtils'
import { s } from '../../src/utils/StringUtils'
import { TagsUtils } from '../../src/utils/TagsUtils'

const musicDir = pipe(Dir.of(__dirname), Dir.joinDir('..', 'music'))
const mp3Dir = pipe(Dir.of(__dirname), Dir.joinDir('..', 'resources', 'mp3'))

describe('bcDl', () => {
  it('should get metadata', () =>
    pipe(
      getMetadata(httpGetMocked)({
        url: 'https://inlustris.bandcamp.com/album/stella-splendens',
        genre: Genre.wrap('Dungeon Synth' as NonEmptyString),
      }),
      Future.map(result => {
        const expected: AlbumMetadata = {
          artist: 'Inlustris',
          album: 'Stella Splendens',
          year: 2020,
          genre: Genre.wrap('Dungeon Synth' as NonEmptyString),
          isEp: false,
          tracks: [
            { number: 1, title: 'Ave Gloriosa' },
            { number: 2, title: 'Morena Me Llaman' },
            { number: 3, title: 'Ecco La Primavera' },
            { number: 4, title: 'Gaudens In Domino' },
            { number: 5, title: 'Como Somos Per Consello CSM 119' },
            { number: 6, title: 'Santa Maria, Strela Do Dia CSM 100' },
            { number: 7, title: 'Stella Splendens' },
          ],
          coverUrl: 'https://f4.bcbits.com/img/a3172027603_16.jpg',
        }
        expect(result).toStrictEqual(expected)
      }),
      Future.runUnsafe,
    ))
})

describe('bcDl (e2e)', () => {
  beforeEach(() => pipe(cleanMusicDir(), Future.runUnsafe))
  afterEach(() => pipe(cleanMusicDir(), Future.runUnsafe))

  it('should e2e', () =>
    pipe(
      bcDl(
        ['test/music', 'https://inlustris.bandcamp.com/album/stella-splendens', 'Dungeon Synth'],
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
        const imageBuffer = Buffer.from('Image Buffer', 'utf-8')

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

const cleanMusicDir = (): Future<void> =>
  pipe(
    FsUtils.readdir(musicDir),
    Future.chain(
      flow(
        List.map(f => (FileOrDir.isDir(f) ? FsUtils.rmdir(f, { recursive: true }) : Future.unit)),
        Future.sequenceArray,
      ),
    ),
    Future.map(() => {}),
  )

const httpGetMocked: HttpGet = url => {
  if (url === 'https://inlustris.bandcamp.com/album/stella-splendens') {
    return pipe(
      FsUtils.readFile(
        pipe(Dir.of(__dirname), Dir.joinFile('..', 'resources', 'stella-splendens.html')),
      ),
      Future.map(data => ({ status: 200, statusText: 'OK', headers: {}, config: {}, data })),
    )
  }
  return Future.left(Error('Unknown url'))
}

const execYoutubeDlMocked: ExecYoutubeDl = url => {
  if (url === 'https://inlustris.bandcamp.com/album/stella-splendens') {
    return pipe(
      Future.Do,
      Future.bind('mp3DirContent', () => FsUtils.readdir(mp3Dir)),
      Future.bind('cwd', () => Future.fromIOEither(FsUtils.cwd())),
      Future.chain(({ mp3DirContent, cwd }) =>
        pipe(
          mp3DirContent,
          List.map(f =>
            FileOrDir.isDir(f)
              ? Future.left(Error(s`Unexpected directory: ${f.path}`))
              : FsUtils.copyFile(f, pipe(cwd, Dir.joinFile(f.basename))),
          ),
          Future.sequenceArray,
        ),
      ),
      Future.map(() => {}),
    )
  }
  return Future.left(Error('Unknown url'))
}

const httpGetBufferMocked: HttpGetBuffer = url => {
  if (url === 'https://f4.bcbits.com/img/a3172027603_16.jpg') {
    return Future.right({
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
      data: Buffer.from('Image Buffer', 'utf-8'),
    })
  }
  return Future.left(Error('Unknown url'))
}
