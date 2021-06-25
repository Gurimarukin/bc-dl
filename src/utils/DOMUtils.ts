import { not, pipe } from 'fp-ts/function'
import { DOMWindow, JSDOM } from 'jsdom'

import { Either } from './fp'
import { StringUtils } from './StringUtils'

const { window } = new JSDOM()

export namespace DOMUtils {
  export type Constructor<E> = {
    new (): E
    readonly prototype: E
  }

  export type Document = DOMWindow['Document']['prototype']
  export type Element = DOMWindow['Element']['prototype']
  export type ParentNode = DOMWindow['ParentNode']['prototype']
  export const {
    HTMLAnchorElement,
    HTMLDivElement,
    HTMLElement,
    HTMLHeadingElement,
    HTMLImageElement,
  } = window

  export const documentFromHtml = (html: string): Document => new JSDOM(html).window.document

  export function querySelectorEnsureOne(
    selector: string,
  ): (parent: ParentNode) => Either<string, Element>
  export function querySelectorEnsureOne<E>(
    selector: string,
    type: Constructor<E>,
  ): (parent: ParentNode) => Either<string, E>
  export function querySelectorEnsureOne<E>(selector: string, type?: Constructor<E>) {
    return (parent: ParentNode): Either<string, Element | E> => {
      const res = parent.querySelectorAll(selector)
      const elt = res[0]

      if (elt === undefined) return Either.left(`No element matches selector: ${selector}`)
      if (1 < res.length) return Either.left(`More than one element matches selector: ${selector}`)

      if (type === undefined) return Either.right(elt)
      if (!(elt instanceof type)) return Either.right(elt)

      return Either.left(`Element don't have expected type: ${type.name}`)
    }
  }

  export const parseText = (parent: ParentNode, selector: string): Either<string, string> =>
    pipe(
      parent,
      querySelectorEnsureOne(selector, HTMLElement),
      Either.chain(elt =>
        pipe(
          elt.textContent,
          Either.fromNullable(`No textContent for element: ${selector}`),
          Either.map(StringUtils.cleanHtml),
        ),
      ),
      Either.filterOrElse(
        not(looksLikeHTMLTag),
        str => `textContent looks like an HTML tag and this might be a problem: ${str}`,
      ),
    )
  const looksLikeHTMLTag = (str: string): boolean => str.startsWith('<') && str.endsWith('/>')
}
