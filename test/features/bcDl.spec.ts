import path from 'path'

import { flow, pipe } from 'fp-ts/function'

import { ExecYoutubeDl, HttpGet, bcDl, getMetadata, getMp3Tags } from '../../src/features/bcDl'
import { AlbumMetadata } from '../../src/models/AlbumMetadata'
import { Future, List } from '../../src/utils/fp'
import { FsUtils } from '../../src/utils/FsUtils'
import { s } from '../../src/utils/StringUtils'

const musicDir = path.resolve(__dirname, '../music')
const mp3Dir = path.resolve(__dirname, '../resources/mp3')

describe('bcDl', () => {
  it('should get metadata', () =>
    pipe(
      getMetadata(httpGetMocked)('https://inlustris.bandcamp.com/album/stella-splendens'),
      Future.map(result => {
        const expected: AlbumMetadata = {
          album: 'Stella Splendens',
          artist: 'Inlustris',
          isEp: false,
          year: 2020,
          tracks: [
            { number: 1, title: 'Ave Gloriosa' },
            { number: 2, title: 'Morena Me Llaman' },
            { number: 3, title: 'Ecco La Primavera' },
            { number: 4, title: 'Gaudens In Domino' },
            { number: 5, title: 'Como Somos Per Consello CSM 119' },
            { number: 6, title: 'Santa Maria, Strela Do Dia CSM 100' },
            { number: 7, title: 'Stella Splendens' },
          ],
        }
        expect(result).toStrictEqual(expected)
      }),
      Future.runUnsafe,
    ))

  it('should get tags', () =>
    pipe(
      getMp3Tags(mp3Dir),
      Future.map(result => {
        expect(result).toStrictEqual([
          {
            file: { name: path.join(mp3Dir, 'Inlustris - Ave Gloriosa.mp3') },
            tags: { raw: {} },
          },
          {
            file: { name: path.join(mp3Dir, 'Inlustris - Como Somos Per Consello CSM 119.mp3') },
            tags: { raw: {} },
          },
          {
            file: { name: path.join(mp3Dir, 'Inlustris - Ecco La Primavera.mp3') },
            tags: { raw: {} },
          },
          {
            file: { name: path.join(mp3Dir, 'Inlustris - Gaudens In Domino.mp3') },
            tags: { raw: {} },
          },
          {
            file: { name: path.join(mp3Dir, 'Inlustris - Morena Me Llaman.mp3') },
            tags: { raw: {} },
          },
          {
            file: { name: path.join(mp3Dir, 'Inlustris - Santa Maria, Strela Do Dia CSM 100.mp3') },
            tags: { raw: {} },
          },
          {
            file: { name: path.join(mp3Dir, 'Inlustris - Stella Splendens.mp3') },
            tags: { raw: {} },
          },
        ])
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
        ['https://inlustris.bandcamp.com/album/stella-splendens', musicDir],
        httpGetMocked,
        execYoutubeDlMocked,
      ),
      Future.map(result => {
        expect(result).toStrictEqual(3)
      }),
      Future.runUnsafe,
    ))
})

const cleanMusicDir = (): Future<void> =>
  pipe(
    FsUtils.readdir(musicDir),
    Future.chain(
      flow(
        List.map(f =>
          f.isDirectory()
            ? FsUtils.rmdir(path.join(musicDir, f.name), { recursive: true })
            : Future.unit,
        ),
        Future.sequenceArray,
      ),
    ),
    Future.map(() => {}),
  )

const httpGetMocked: HttpGet = url => {
  if (url === 'https://inlustris.bandcamp.com/album/stella-splendens') {
    return pipe(
      FsUtils.readFile(path.resolve(__dirname, '../resources/stella-splendens.html')),
      Future.map(data => ({ status: 200, statusText: 'OK', headers: {}, config: {}, data })),
    )
  }
  return Future.left(Error('Unknown url'))
}

const execYoutubeDlMocked: ExecYoutubeDl = url => {
  if (url === 'https://inlustris.bandcamp.com/album/stella-splendens') {
    return pipe(
      FsUtils.readdir(mp3Dir),
      Future.chain(
        flow(
          List.map(f => {
            const fName = path.join(mp3Dir, f.name)
            return f.isDirectory()
              ? Future.left(Error(s`Unexpected directory: ${fName}`))
              : FsUtils.copyFile(fName, f.name)
          }),
          Future.sequenceArray,
        ),
      ),
      Future.map(() => {}),
    )
  }
  return Future.left(Error('Unknown url'))
}
