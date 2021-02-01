import path from 'path'

import { AxiosResponse } from 'axios'
import { Command, Opts } from 'decline-ts'
import { apply } from 'fp-ts'
import { flow, pipe } from 'fp-ts/function'
import { JSDOM } from 'jsdom'
import NodeID3 from 'node-id3'

import { AlbumMetadata } from '../models/AlbumMetadata'
import { Either, Future, List, todo } from '../utils/fp'
import { FsUtils } from '../utils/FsUtils'
import { StringUtils, s } from '../utils/StringUtils'
import { TagsUtils } from '../utils/TagsUtils'

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
    Future.bind('mp3tags', ({ albumDir }) => getMp3Tags(albumDir)),
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

type FileWithTags = {
  readonly file: {
    readonly name: string
  }
  readonly tags: NodeID3.Tags
}

export const getMp3Tags = (albumDir: string): Future<List<FileWithTags>> =>
  pipe(
    FsUtils.readdir(albumDir),
    Future.chain(
      flow(
        List.map(f => {
          const file: FileWithTags['file'] = { name: path.join(albumDir, f.name) }
          return f.isDirectory()
            ? Future.left(Error(s`Unexpected directory: ${file.name}`))
            : pipe(
                TagsUtils.read(file.name),
                Future.map(tags => ({ file, tags })),
              )
        }),
        Future.sequenceArray,
      ),
    ),
  )
