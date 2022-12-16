import childProcess from 'child_process'
import { pipe } from 'fp-ts/function'

import { ExecYoutubeDl } from '../features/common'
import { Url } from '../models/Url'
import { Console } from './Console'
import { StringUtils } from './StringUtils'
import { Either, Future, IO, List, Maybe } from './fp'

type ExecFailure = {
  readonly cmd: string
  readonly code: Maybe<number>
  readonly stderr: string
}

type Result = Either<ExecFailure, string>

export const execCommand = (
  command: string,
  args: List<string> = [],
  onStdout: (data: string) => IO<void>,
): Future<Result> =>
  Future.tryCatch(
    () =>
      /* eslint-disable functional/no-let, functional/no-expression-statement, functional/no-return-void */
      new Promise<Result>((resolve, reject) => {
        let stdout = ''
        const stderr = ''
        const child = childProcess.spawn(command, args)
        child.stdout.on('data', data => {
          const str = String(data)
          stdout += str
          pipe(onStdout(str), IO.runUnsafe)
        })
        child.on('error', error => reject(error))
        child.on('close', code =>
          resolve(
            code === 0
              ? Either.right(stdout)
              : Either.left({
                  cmd: pipe([command, ...args], StringUtils.mkString(' ')),
                  code: Maybe.fromNullable(code),
                  stderr,
                }),
          ),
        )
      }),
    /* eslint-enable functional/no-let, functional/no-expression-statement, functional/no-return-void */
  )

const newLines = /\n*$/
export const execYoutubeDl: ExecYoutubeDl = url =>
  pipe(
    execCommand(
      'yt-dlp',
      [
        '--no-progress',
        '--extract-audio',
        '--audio-format',
        'mp3',
        '--audio-quality',
        '0',
        '-o',
        '%(title)s.$(ext)s',
        Url.unwrap(url),
      ],
      data => Console.log(data.replace(newLines, '')),
    ),
    Future.chain(
      Either.fold(
        e =>
          Future.left(
            Error(`Command ${e.cmd} exited with code: ${Maybe.toNullable(e.code)}\n${e.stderr}`),
          ),
        () => Future.unit,
      ),
    ),
  )
