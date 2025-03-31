import type { CarrierOf, Newtype } from 'newtype-ts'
import { iso } from 'newtype-ts'

type Constructor<E> = {
  new (): E
  readonly prototype: E
}

export type TElement<E extends Element> = Newtype<
  { readonly TElement: unique symbol },
  Constructor<E>
>

const wrap: <E extends Element>(e: CarrierOf<TElement<E>>) => TElement<E> = iso().wrap
const unwrap: <E extends Element>(te: TElement<E>) => CarrierOf<TElement<E>> = iso().unwrap

const name = <E extends Element>(te: TElement<E>): string => unwrap(te).name

export const TElement = { wrap, unwrap, name }
