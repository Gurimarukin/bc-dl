/* eslint-disable functional/no-return-void */
import { pipe } from 'fp-ts/function'

import { ExecYoutubeDl, HttpGet, HttpGetBuffer } from '../../src/features/common'
import { Dir, FileOrDir } from '../../src/models/FileOrDir'
import { Url } from '../../src/models/Url'
import { FsUtils } from '../../src/utils/FsUtils'
import { Future, List } from '../../src/utils/fp'

export const cleanMusicDir = (musicDir: Dir): Future<void> =>
  pipe(
    FsUtils.readdir(musicDir),
    Future.chain(
      List.traverse(Future.ApplicativeSeq)(f =>
        FileOrDir.isDir(f) ? FsUtils.rmrf(f) : Future.unit,
      ),
    ),
    Future.map(() => {}),
  )

export const httpGetMocked: HttpGet = url => {
  if (url === Url.wrap('https://inlustris.bandcamp.com/album/stella-splendens')) {
    return okResponseDocumentFromFile('stella-splendens.html')
  }
  if (url === Url.wrap('https://snakesofrussia.bandcamp.com/track/welcome-to-speed-castle')) {
    return okResponseDocumentFromFile('welcome-to-speed-castle.html')
  }
  return Future.left(Error(`Unknown url: ${Url.unwrap(url)}`))
}

const okResponseDocumentFromFile = (file: string): Future<string> =>
  FsUtils.readFile(pipe(Dir.of(__dirname), Dir.joinDir('..', 'resources'), Dir.joinFile(file)))

export const execYoutubeDlMocked: ExecYoutubeDl = url => {
  if (url === Url.wrap('https://inlustris.bandcamp.com/album/stella-splendens')) {
    return copyMp3DirContent('album')
  }
  if (url === Url.wrap('https://snakesofrussia.bandcamp.com/track/welcome-to-speed-castle')) {
    return copyMp3DirContent('track')
  }
  return Future.left(Error(`Unknown url: ${Url.unwrap(url)}`))
}

const copyMp3DirContent = (dir: string): Future<void> => {
  const mp3Dir = pipe(Dir.of(__dirname), Dir.joinDir('..', 'resources', 'mp3', dir))
  return pipe(
    Future.Do,
    Future.apS('mp3DirContent', FsUtils.readdir(mp3Dir)),
    Future.apS('cwd', Future.fromIOEither(FsUtils.cwd())),
    Future.chain(({ mp3DirContent, cwd }) =>
      pipe(
        mp3DirContent,
        List.traverse(Future.ApplicativePar)(f =>
          FileOrDir.isDir(f)
            ? Future.left(Error(`Unexpected directory: ${f.path}`))
            : FsUtils.copyFile(f, pipe(cwd, Dir.joinFile(f.basename))),
        ),
      ),
    ),
    Future.map(() => {}),
  )
}

export const httpGetBufferMocked: HttpGetBuffer = url => {
  if (url === Url.wrap('https://f4.bcbits.com/img/a3172027603_16.jpg')) {
    return okResponseImage('Album Image Buffer')
  }
  if (url === Url.wrap('https://f4.bcbits.com/img/a0539454739_16.jpg')) {
    return okResponseImage('Track Image Buffer')
  }
  return Future.left(Error(`Unknown url: ${Url.unwrap(url)}`))
}

const okResponseImage = (image: string): Future<Buffer> => Future.right(Buffer.from(image, 'utf-8'))
