import { pipe } from 'fp-ts/function'
import fs from 'fs'
import rimraf from 'rimraf'

import { Dir, File, FileOrDir } from '../models/FileOrDir'
import { Future, IO, List, Maybe } from './fp'

export namespace FsUtils {
  export const stat = (f: FileOrDir): Future<Maybe<fs.Stats>> =>
    pipe(
      Future.tryCatch(() => fs.promises.stat(f.path)),
      Future.map(Maybe.some),
      Future.recover(() => Future.right<Maybe<fs.Stats>>(Maybe.none)),
    )

  // eslint-disable-next-line functional/no-return-void
  export const chdir = (dir: Dir): IO<void> => IO.tryCatch(() => process.chdir(dir.path))

  export const copyFile = (src: FileOrDir, dest: FileOrDir, flags?: number): Future<void> =>
    Future.tryCatch(() => fs.promises.copyFile(src.path, dest.path, flags))

  export const cwd = (): IO<Dir> =>
    pipe(
      IO.tryCatch(() => process.cwd()),
      IO.map(Dir.of),
    )

  export const exists = (f: FileOrDir): Future<boolean> => pipe(stat(f), Future.map(Maybe.isSome))

  export const mkdir = (dir: Dir, options?: fs.MakeDirectoryOptions): Future<void> =>
    pipe(
      Future.tryCatch(() => fs.promises.mkdir(dir.path, options)),
      Future.map(() => undefined),
    )

  export const readdir = (dir: Dir): Future<List<FileOrDir>> =>
    pipe(
      Future.tryCatch(() => fs.promises.readdir(dir.path, { withFileTypes: true })),
      Future.map(List.map(FileOrDir.fromDirent(dir))),
    )

  export const readFile = (file: File): Future<string> =>
    Future.tryCatch(() => fs.promises.readFile(file.path, { encoding: 'utf-8' }))

  export function rename(oldF: File, newF: File): Future<void>
  export function rename(oldF: Dir, newF: Dir): Future<void>
  export function rename(oldF: FileOrDir, newF: FileOrDir): Future<void> {
    return Future.tryCatch(() => fs.promises.rename(oldF.path, newF.path))
  }

  export const rmrf = (f: FileOrDir, options: rimraf.Options = {}): Future<void> =>
    Future.tryCatch(
      () =>
        /* eslint-disable functional/no-return-void */
        new Promise<void>((resolve, reject) =>
          rimraf(f.path, options, (error: Error | null) =>
            error === null ? resolve() : reject(error),
          ),
        ),
      /* eslint-enable functional/no-return-void */
    )

  export const rmdir = (dir: Dir, options?: fs.RmDirOptions): Future<void> =>
    Future.tryCatch(() => fs.promises.rmdir(dir.path, options))
}
