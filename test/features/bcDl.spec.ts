import path from 'path'

import { flow, pipe } from 'fp-ts/function'

import { ExecYoutubeDl, HttpGet, bcDl, getMetadata } from '../../src/features/bcDl'
import { Future, List } from '../../src/utils/fp'
import { FsUtils } from '../../src/utils/FsUtils'
import { s } from '../../src/utils/StringUtils'

const musicDir = path.resolve(__dirname, '../music')

describe('bcDl', () => {
  it('should get metadata', () =>
    pipe(
      getMetadata(httpGetMocked)('https://inlustris.bandcamp.com/album/stella-splendens'),
      Future.map(result => {
        expect(result).toStrictEqual({
          album: 'Stella Splendens',
          artist: 'Inlustris',
          isEp: false,
          year: 2020,
        })
      }),
      Future.runUnsafe,
    ))

  it('should e2e', () =>
    pipe(
      setup(),
      Future.chain(() =>
        bcDl(
          ['https://inlustris.bandcamp.com/album/stella-splendens', musicDir],
          httpGetMocked,
          execYoutubeDlMocked,
        ),
      ),
      Future.map(result => {
        expect(result).toStrictEqual(3)
      }),
      Future.runUnsafe,
    ))
})

const setup = (): Future<void> =>
  pipe(
    FsUtils.readdir(musicDir),
    Future.chain(
      flow(
        List.map(f =>
          f.isDirectory()
            ? FsUtils.rmdir(path.join(musicDir, f.name), { recursive: true })
            : Future.unit,
        ),
        Future.sequenceSeqArray,
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
    const mp3Dir = path.resolve(__dirname, '../resources/mp3')
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
          Future.sequenceSeqArray,
        ),
      ),
      Future.map(() => {}),
    )
  }
  return Future.left(Error('Unknown url'))
}
