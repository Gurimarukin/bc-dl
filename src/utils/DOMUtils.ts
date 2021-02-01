import { DOMWindow, JSDOM } from 'jsdom'

import { Either } from './fp'
import { s } from './StringUtils'

const { window } = new JSDOM()

export namespace DOMUtils {
  export type Constructor<E> = {
    new (): E
    readonly prototype: E
  }

  export type Document = DOMWindow['Document']['prototype']
  export type Element = DOMWindow['Element']['prototype']
  export const { HTMLAnchorElement, HTMLDivElement, HTMLHeadingElement } = window

  export function querySelectorEnsureOne(
    selector: string,
  ): (document: Document) => Either<string, Element>
  export function querySelectorEnsureOne<E>(
    selector: string,
    type: Constructor<E>,
  ): (document: Document) => Either<string, E>
  export function querySelectorEnsureOne<E>(selector: string, type?: Constructor<E>) {
    return (document: Document): Either<string, Element | E> => {
      const res = document.querySelectorAll(selector)
      const elt = res[0]

      if (elt === undefined) return Either.left(s`No element matches selector: ${selector}`)
      if (1 < res.length) return Either.left(s`More than one element matches selector: ${selector}`)

      if (type === undefined) return Either.right(elt)
      if (!(elt instanceof type)) return Either.right(elt)

      return Either.left(s`Element don't have expected type: ${type.name}`)
    }
  }
}
