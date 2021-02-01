import path from 'path'

import { AxiosResponse } from 'axios'
import { Command, Opts } from 'decline-ts'
import { apply } from 'fp-ts'
import { flow, pipe } from 'fp-ts/function'
import { JSDOM } from 'jsdom'

import { AlbumMetadata } from '../models/AlbumMetadata'
import { Validation } from '../models/Validation'
import { Either, Future, List, NonEmptyArray, todo } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'

const musicLibraryDirMetavar = 'music library dir'

const cmd = Command({ name: 'bc-dl', header: 'youtube-dl for Bandcamp, with mp3 tags' })(
  pipe(
    apply.sequenceT(Opts.opts)(
      Opts.argument()(musicLibraryDirMetavar),
      Opts.argument()('url'),
      Opts.argument()('genre'),
    ),
    Opts.map(([musicLibraryDir, url, genre]) => ({ musicLibraryDir, url, genre })),
  ),
)

export type HttpGet = (url: string) => Future<AxiosResponse<string>>
export type ExecYoutubeDl = (url: string) => Future<void>

export const bcDl = (
  argv: List<string>,
  httpGet: HttpGet,
  execYoutubeDl: ExecYoutubeDl,
): Future<void> =>
  pipe(
    Future.Do,
    Future.bind('args', () => parseCommand(argv)),
    Future.bind('metadata', ({ args }) => getMetadata(httpGet)(args.url)),
    Future.bind('albumDir', ({ args, metadata }) =>
      ensureAlbumDirectory(args.musicLibraryDir, metadata),
    ),
    Future.bind('initialCwd', () => Future.fromIOEither(FsUtils.cwd())),
    Future.do(({ albumDir }) => Future.fromIOEither(FsUtils.chdir(albumDir))),
    Future.do(({ args }) => execYoutubeDl(args.url)),
    Future.bind('mp3files', ({ albumDir }) => getMp3Files(albumDir)),
    Future.map(({ mp3files }) => {
      console.log('mp3files =', mp3files)
      return todo()
    }),
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
    FsUtils.exists(albumDir),
    Future.fromIOEither,
    Future.chain(dirExists =>
      dirExists
        ? Future.left(Error(s`Album directory already exists, this might be an error: ${albumDir}`))
        : FsUtils.mkdir(albumDir, { recursive: true }),
    ),
    Future.map(() => albumDir),
  )
}

export const getMp3Files = (albumDir: string): Future<NonEmptyArray<string>> =>
  pipe(
    FsUtils.readdir(albumDir),
    Future.chain(
      flow(
        NonEmptyArray.fromReadonlyArray,
        Future.fromOption(() => Error(s`Empty directory after youtube-dl: ${albumDir}`)),
      ),
    ),
    Future.chain(
      flow(
        NonEmptyArray.traverse(Validation.applicativeValidation)(f => {
          const fName = path.join(albumDir, f.name)
          return f.isDirectory()
            ? Either.left(NonEmptyArray.of(s`Unexpected directory: ${fName}`))
            : Either.right(fName)
        }),
        Either.mapLeft(e =>
          Error(s`Error while listing mp3 files:\n${pipe(e, StringUtils.mkString('\n'))}`),
        ),
        Future.fromEither,
      ),
    ),
  )
