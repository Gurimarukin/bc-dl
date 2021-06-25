import { AxiosResponse } from 'axios'
import { List } from 'decline-ts/lib/utils/fp'
import { flow, pipe } from 'fp-ts/function'

import { ExecYoutubeDl, HttpGet, HttpGetBuffer } from '../../src/features/common'
import { Dir, FileOrDir } from '../../src/models/FileOrDir'
import { Url } from '../../src/models/Url'
import { Future } from '../../src/utils/fp'
import { FsUtils } from '../../src/utils/FsUtils'

export const cleanMusicDir = (musicDir: Dir): Future<void> =>
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

export const httpGetMocked: HttpGet = url => {
  if (url === Url.wrap('https://inlustris.bandcamp.com/album/stella-splendens')) {
    return readFileAndOk('stella-splendens.html')
  }
  if (url === Url.wrap('https://snakesofrussia.bandcamp.com/track/welcome-to-speed-castle')) {
    return readFileAndOk('welcome-to-speed-castle.html')
  }
  return Future.left(Error(`Unknown url: ${Url.unwrap(url)}`))
}

const readFileAndOk = (file: string): Future<AxiosResponse<string>> =>
  pipe(
    FsUtils.readFile(pipe(Dir.of(__dirname), Dir.joinDir('..', 'resources'), Dir.joinFile(file))),
    Future.map(data => ({ status: 200, statusText: 'OK', headers: {}, config: {}, data })),
  )

export const execYoutubeDlMocked = (mp3Dir: Dir): ExecYoutubeDl => url => {
  if (url === Url.wrap('https://inlustris.bandcamp.com/album/stella-splendens')) {
    return pipe(
      Future.Do,
      Future.bind('mp3DirContent', () => FsUtils.readdir(mp3Dir)),
      Future.bind('cwd', () => Future.fromIOEither(FsUtils.cwd())),
      Future.chain(({ mp3DirContent, cwd }) =>
        pipe(
          mp3DirContent,
          List.map(f =>
            FileOrDir.isDir(f)
              ? Future.left(Error(`Unexpected directory: ${f.path}`))
              : FsUtils.copyFile(f, pipe(cwd, Dir.joinFile(f.basename))),
          ),
          Future.sequenceArray,
        ),
      ),
      Future.map(() => {}),
    )
  }
  return Future.left(Error(`Unknown url: ${Url.unwrap(url)}`))
}

export const httpGetBufferMocked: HttpGetBuffer = url => {
  if (url === Url.wrap('https://f4.bcbits.com/img/a3172027603_16.jpg')) {
    return Future.right({
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
      data: Buffer.from('Image Buffer', 'utf-8'),
    })
  }
  return Future.left(Error(`Unknown url: ${Url.unwrap(url)}`))
}
