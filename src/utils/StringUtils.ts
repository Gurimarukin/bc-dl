import { flow, not, pipe } from 'fp-ts/function'

import { Maybe, mkString_, s_ } from './fp'

export const s = s_

export namespace StringUtils {
  export const isEmpty = (str: string): str is '' => str === ''
  export const isNonEmpty = not(isEmpty)

  const margin = /^[^\n\S]*\|/gm
  export const stripMargins = (str: string): string => str.replace(margin, '')

  export const mkString = mkString_

  const matcher = <A>(regex: RegExp, f: (arr: RegExpMatchArray) => Maybe<A>) => (
    str: string,
  ): Maybe<A> => pipe(str.match(regex), Maybe.fromNullable, Maybe.chain(f))

  export const matches = (regex: RegExp): ((str: string) => boolean) =>
    flow(matcher(regex, Maybe.some), Maybe.isSome)

  export const matcher1 = (regex: RegExp): ((str: string) => Maybe<string>) =>
    matcher(regex, ([, a]) => Maybe.fromNullable(a))

  export const padNumber = (n: number, size = 2): string => String(n).padStart(size, '0')

  const fileNameForbiddenChars = /[<>:"/\?\*\|\\]/g
  export const cleanFileName = (str: string): string => str.replace(fileNameForbiddenChars, '')

  export const almostIncludes = (short: string) => (long: string): boolean =>
    sanitizeAlmost(long).includes(sanitizeAlmost(short))

  export const almostEquals = (a: string, b: string): boolean =>
    sanitizeAlmost(a) === sanitizeAlmost(b)

  const boringChars = /[_\/]/g
  const sanitizeAlmost = (str: string): string =>
    str.normalize().toLowerCase().replace(boringChars, '')

  const whitespace = /\s+/g
  const weirdCharSometimesReturnedByBandcamp = new RegExp(s`${String.fromCharCode(8203)}+`, 'g')
  export const sanitize = (str: string): string =>
    str
      .trim()
      .replace(whitespace, ' ')
      .replace(weirdCharSometimesReturnedByBandcamp, '')
      .normalize()
}
