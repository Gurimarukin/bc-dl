import fs from 'fs'
import nodePath from 'path'

import { List } from '../utils/fp'

export type FileOrDir = File | Dir

export type File = {
  readonly _tag: 'File'
  readonly path: string
  readonly basename: string
  readonly dirname: string
}

export type Dir = {
  readonly _tag: 'Dir'
  readonly path: string
}

export namespace FileOrDir {
  export const isFile = (f: FileOrDir): f is File => f._tag === 'File'

  export const isDir = (f: FileOrDir): f is Dir => f._tag === 'Dir'

  export const fromDirent = (parent: Dir) => (f: fs.Dirent): FileOrDir => {
    const path = nodePath.join(parent.path, f.name)
    return f.isDirectory()
      ? Dir.of(path)
      : File.of({ path, basename: f.name, dirname: parent.path })
  }
}

export namespace File {
  export const of = ({ path, basename, dirname }: Omit<File, '_tag'>): File => ({
    _tag: 'File',
    path,
    basename,
    dirname,
  })

  export const fromPath = (path: string): File =>
    File.of({
      path,
      basename: nodePath.basename(path),
      dirname: nodePath.dirname(path),
    })
}

export namespace Dir {
  export const of = (path: string): Dir => ({ _tag: 'Dir', path })

  export const resolve = (path: string): Dir => of(nodePath.resolve(path))

  export const joinDir = (path: string, ...paths: List<string>) => (dir: Dir): Dir =>
    of(nodePath.join(dir.path, path, ...paths))

  export const joinFile = (path: string, ...paths: List<string>) => (dir: Dir): File =>
    File.fromPath(nodePath.join(dir.path, path, ...paths))
}
