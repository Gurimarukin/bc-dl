import fs from 'fs'

import { pipe } from 'fp-ts/function'

import { Future, IO, List } from './fp'

export namespace FsUtils {
  const stat = (path: fs.PathLike): Future<fs.Stats> =>
    Future.tryCatch(() => fs.promises.stat(path))

  export const chdir = (path: string): IO<void> => IO.tryCatch(() => process.chdir(path))

  export const copyFile = (src: fs.PathLike, dest: fs.PathLike, flags?: number): Future<void> =>
    Future.tryCatch(() => fs.promises.copyFile(src, dest, flags))

  export const cwd = (): IO<string> => IO.tryCatch(() => process.cwd())

  export const exists = (path: fs.PathLike): IO<boolean> => IO.tryCatch(() => fs.existsSync(path))

  export const isDirectory = (path: fs.PathLike): Future<boolean> =>
    pipe(
      stat(path),
      Future.map(stats => stats.isDirectory()),
    )

  export const mkdir = (path: fs.PathLike, options?: fs.MakeDirectoryOptions): Future<void> =>
    pipe(
      Future.tryCatch(() => fs.promises.mkdir(path, options)),
      Future.map(() => {}),
    )

  export const readdir = (path: fs.PathLike): Future<List<fs.Dirent>> =>
    Future.tryCatch(() => fs.promises.readdir(path, { withFileTypes: true }))

  export const readFile = (path: fs.PathLike): Future<string> =>
    Future.tryCatch(() => fs.promises.readFile(path, { encoding: 'utf-8' }))

  export const rmdir = (path: fs.PathLike, options?: fs.RmDirOptions): Future<void> =>
    Future.tryCatch(() => fs.promises.rmdir(path, options))
}
