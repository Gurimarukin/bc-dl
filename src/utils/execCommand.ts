import childProcess from 'child_process'

import { pipe } from 'fp-ts/function'

import { ExecYoutubeDl } from '../features/common'
import { Url } from '../models/Url'
import { Either, Future, List } from './fp'
import { StringUtils } from './StringUtils'

type CommandOutput = {
  readonly stdout: string | Buffer
  readonly stderr: string | Buffer
}

type Result = Either<childProcess.ExecException, CommandOutput>

export const execCommand = (
  command: string,
  args: List<string> = [],
  options?: childProcess.ExecOptions,
): Future<Result> => {
  const cmd = pipe([command, ...args], StringUtils.mkString(' '))
  return Future.tryCatch(
    () =>
      new Promise<Result>(resolve =>
        childProcess.exec(cmd, options, (error, stdout, stderr) =>
          resolve(error !== null ? Either.left(error) : Either.right({ stdout, stderr })),
        ),
      ),
  )
}

export const execYoutubeDl: ExecYoutubeDl = url =>
  pipe(
    execCommand('youtube-dl', [
      '--extract-audio',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '0',
      pipe(url, Url.unwrap, (s: string) => JSON.stringify(s)),
    ]),
    Future.chain(
      Either.fold(
        e => Future.left(e),
        () => Future.unit,
      ),
    ),
  )
