import path from 'path'

import { AxiosResponse } from 'axios'
import { Command, Opts } from 'decline-ts'
import { apply } from 'fp-ts'
import { pipe } from 'fp-ts/function'
import { JSDOM } from 'jsdom'

import { AlbumMetadata } from '../models/AlbumMetadata'
import { Either, Future, List, todo } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'

const musicLibraryDirMetavar = 'music library dir'

const cmd = Command({ name: 'bc-dl', header: 'youtube-dl for Bandcamp, with mp3 tags' })(
  apply.sequenceS(Opts.opts)({
    url: Opts.argument()('url'),
    musicLibraryDir: Opts.argument()(musicLibraryDirMetavar),
  }),
)

export type HttpGet = (url: string) => Future<AxiosResponse<string>>
export type ExecYoutubeDl = (url: string) => Future<void>

export const bcDl = (
  argv: List<string>,
  httpGet: HttpGet,
  execYoutubeDl: ExecYoutubeDl,
): Future<void> =>
  pipe(
    parseCommand(argv),
    Future.bind('metadata', ({ url }) => getMetadata(httpGet)(url)),
    Future.bind('albumDir', ({ musicLibraryDir, metadata }) =>
      ensureAlbumDirectory(musicLibraryDir, metadata),
    ),
    Future.bind('initialCwd', () => Future.fromIOEither(FsUtils.cwd())),
    Future.do(({ albumDir }) => Future.fromIOEither(FsUtils.chdir(albumDir))),
    Future.do(({ url }) => execYoutubeDl(url)),
    Future.map(() => todo()),
  )

const parseCommand = (argv: List<string>): Future<Command.TypeOf<typeof cmd>> =>
  pipe(cmd, Command.parse(argv), Either.mapLeft(Error), Future.fromEither)

export const getMetadata = (httpGet: HttpGet) => (url: string): Future<AlbumMetadata> =>
  pipe(
    httpGet(url),
    Future.chain(({ data }) =>
      pipe(
        new JSDOM(data).window.document,
        AlbumMetadata.fromDocument,
        Either.mapLeft(e =>
          Error(s`Error while parsing AlbumMetadata:\n${pipe(e, StringUtils.mkString('\n'))}`),
        ),
        Future.fromEither,
      ),
    ),
  )

const ensureAlbumDirectory = (musicLibraryDir: string, metadata: AlbumMetadata): Future<string> => {
  const albumDir = path.join(
    musicLibraryDir,
    metadata.artist,
    s`[${metadata.year}] ${metadata.album}${metadata.isEp ? ' (EP)' : ''}`,
  )
  return pipe(
    FsUtils.mkdir(albumDir, { recursive: true }),
    Future.map(() => albumDir),
  )
}
