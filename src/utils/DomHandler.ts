import { apply, predicate } from "fp-ts";
import { flow, pipe } from "fp-ts/function";
import { JSDOM } from "jsdom";

import { TElement } from "../models/TElement";
import { Validation } from "../models/Validation";
import { StringUtils } from "../utils/StringUtils";
import { Either, NonEmptyArray } from "../utils/fp";

export type DomHandler = ReturnType<typeof domHandlerOf>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const domHandlerOf = (html: string) => {
  const jsdom = new JSDOM(html);

  const HTMLElement = TElement.wrap(jsdom.window.HTMLElement);
  const HTMLAnchorElement = TElement.wrap(jsdom.window.HTMLAnchorElement);
  const HTMLImageElement = TElement.wrap(jsdom.window.HTMLImageElement);
  const HTMLParagraphElement = TElement.wrap(jsdom.window.HTMLParagraphElement);

  const querySelectorTextContent = (selector: string) => (
    parent: ParentNode
  ): Either<string, string> =>
    pipe(
      parent,
      querySelectorEnsureOne(selector, HTMLElement),
      Either.chain(textContent(selector))
    );

  return {
    document: jsdom.window.document,
    querySelectorTextContent,

    HTMLAnchorElement,
    HTMLElement,
    HTMLImageElement,
    HTMLParagraphElement,
  };
};

function querySelectorEnsureOne(
  selector: string
): (parent: ParentNode) => Either<string, Element>;
function querySelectorEnsureOne<E extends Element>(
  selector: string,
  type: TElement<E>
): (parent: ParentNode) => Either<string, E>;
function querySelectorEnsureOne<E extends Element>(
  selector: string,
  type?: TElement<E>
) {
  return (parent: ParentNode): Either<string, Element | E> => {
    const res = parent.querySelectorAll(selector);
    const elt = res[0];

    if (elt === undefined)
      return Either.left(`No element matches selector: ${selector}`);
    if (1 < res.length)
      return Either.left(`More than one element matches selector: ${selector}`);

    if (type === undefined) return Either.right(elt);

    const isE = (e: Element): e is E => e instanceof TElement.unwrap(type);
    if (isE(elt)) return Either.right(elt);

    return Either.left(
      `Element don't have expected type: ${TElement.name(type)}`
    );
  };
}

function querySelectorAllNonEmpty(
  selector: string
): (parent: ParentNode) => Validation<NonEmptyArray<Element>>;
function querySelectorAllNonEmpty<E extends Element>(
  selector: string,
  type: TElement<E>
): (parent: ParentNode) => Validation<NonEmptyArray<E>>;
function querySelectorAllNonEmpty<E extends Element>(
  selector: string,
  type?: TElement<E>
): (parent: ParentNode) => Validation<NonEmptyArray<E>> {
  return (parent: ParentNode): Validation<NonEmptyArray<E>> => {
    const elts = parent.querySelectorAll(selector);

    const res = pipe(
      NonEmptyArray.fromReadonlyArray([...elts]),
      Either.fromOption(() =>
        NonEmptyArray.of(`No element matches selector: ${selector}`)
      )
    );

    if (type === undefined) return res as Validation<NonEmptyArray<E>>;

    const isE = (e: Element): e is E => e instanceof TElement.unwrap(type);
    return pipe(
      res,
      Either.map(
        NonEmptyArray.mapWithIndex(
          (i, e): Validation<E> =>
            isE(e)
              ? Either.right(e)
              : Either.left(
                  NonEmptyArray.of(
                    `Element ${i} matching "${selector}" - expected ${TElement.name(
                      type
                    )} got <${e.nodeName.toLowerCase()}>`
                  )
                )
        )
      ),
      Either.chain(([head, ...tail]) =>
        apply.sequenceT(Validation.validation)(head, ...tail)
      )
    );
  };
}

const brRegex = /<br>/gi;

const getText = (name: string, getter: (elt: HTMLElement) => string | null) => (
  selector: string
) => (elt: HTMLElement): Either<string, string> =>
  pipe(
    getter(elt),
    Either.fromNullable(`No ${name} for element: ${selector}`),
    Either.map(StringUtils.cleanHtml),
    Either.filterOrElse(
      predicate.not(looksLikeHTMLTag),
      (str) =>
        `${name} looks like an HTML tag and this might be a problem: ${str}`
    )
  );

const textContent = getText("textContent", (e) => e.textContent);

type InnerHTMLOpts = {
  readonly brToNewline: boolean;
};

const innerHTML = (
  selector: string,
  { brToNewline }: InnerHTMLOpts
): ((elt: HTMLElement) => Either<string, string>) => {
  const res = getText("innerHTML", (e) => e.innerHTML)(selector);
  if (brToNewline) {
    return flow(
      res,
      Either.map((html) => html.replace(brRegex, "\n"))
    );
  }
  return res;
};

const looksLikeHTMLTag = (str: string): boolean =>
  str.startsWith("<") && str.endsWith("/>");

export const DomHandler = {
  of: domHandlerOf,
  querySelectorEnsureOne,
  querySelectorAllNonEmpty,
  textContent,
  innerHTML,
};
