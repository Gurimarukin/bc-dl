import { pipe } from 'fp-ts/function'

import { List, Maybe } from './fp'

// interpolates.length is always strings.length - 1
export const s = (
  strings: TemplateStringsArray,
  ...interpolates: List<string | number | boolean>
): string =>
  pipe(
    strings,
    List.zip(List.snoc(interpolates, '')),
    List.reduce('', (acc, [a, b]) => `${acc}${a}${b}`),
  )

export namespace StringUtils {
  export const isEmpty = (str: string): str is '' => str === ''
  export const isNonEmpty = (str: string): boolean => !isEmpty(str)

  const margin = /^[^\n\S]*\|/gm
  export const stripMargins = (str: string): string => str.replace(margin, '')

  export function mkString(sep: string): (list: List<string>) => string
  export function mkString(start: string, sep: string, end: string): (list: List<string>) => string
  export function mkString(
    startOrSep: string,
    sep?: string,
    end?: string,
  ): (list: List<string>) => string {
    return list =>
      sep !== undefined && end !== undefined
        ? s`${startOrSep}${list.join(sep)}${end}`
        : list.join(startOrSep)
  }

  const matcher = <A>(regex: RegExp, f: (arr: RegExpMatchArray) => Maybe<A>) => (
    str: string,
  ): Maybe<A> => pipe(str.match(regex), Maybe.fromNullable, Maybe.chain(f))

  export const matcher1 = (regex: RegExp): ((str: string) => Maybe<string>) =>
    matcher(regex, ([, a]) => Maybe.fromNullable(a))
}
