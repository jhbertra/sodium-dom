/**
 * @description An inefficient semantic reference model for building a DOM.
 */

import { flow, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as F from "fp-ts/lib/Functor";
import * as O from "fp-ts/lib/Option";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import * as B from "./Behaviour";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

// Model of a Event (Stream) as an infinite stream of possible values.
export interface Event<A> {
  readonly value: O.Option<A>;
  readonly next: Event<A>;
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const never: Event<never> = {
  value: O.none,
  get next() {
    return never;
  },
};

export const once: <A>(a: A) => Event<A> = (a) => ({
  value: O.some(a),
  get next() {
    return never;
  },
});

export const listToEvent: <A>(a: NonEmptyArray<O.Option<A>>) => Event<A> = ([
  a,
  ...as
]) => ({
  value: a,
  get next() {
    return A.isNonEmpty(as) ? listToEvent(as) : never;
  },
});

// -------------------------------------------------------------------------------------
// non-pipeables
// -------------------------------------------------------------------------------------

const _map: F.Functor1<URI>["map"] = (fa, f) => pipe(fa, map(f));

// -------------------------------------------------------------------------------------
// type class members
// -------------------------------------------------------------------------------------

export const map: <A, B>(f: (a: A) => B) => (fa: Event<A>) => Event<B> = (
  f,
) => (fa) => ({
  value: pipe(fa.value, O.map(f)),
  get next() {
    return map(f)(fa.next);
  },
});

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const URI = "sodium-dom/model/Event";

export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    readonly [URI]: Event<A>;
  }
}

/**
 * @category instances
 * @since 2.7.0
 */
export const Functor: F.Functor1<URI> = {
  URI,
  map: _map,
};

// -------------------------------------------------------------------------------------
// Utilities
// -------------------------------------------------------------------------------------

export const switchB: <A>(b: B.Behaviour<Event<A>>) => Event<A> = (b) => ({
  value: b.value.value,
  get next() {
    return switchB(b.next);
  },
});

export const coincidence: <A>(e: Event<Event<A>>) => Event<A> = (e) => ({
  value: pipe(
    e.value,
    O.chain((e) => e.value),
  ),
  get next() {
    return coincidence(e.next);
  },
});

export const leftmost: <A>(es: Event<A>[]) => Event<A> = (es) => ({
  value: pipe(
    es,
    A.map((e) => e.value),
    A.findFirst(O.isSome),
    O.map((e) => e.value),
  ),
  get next() {
    return leftmost(es.map((e) => e.next));
  },
});

export const split: <A, B>(e: Event<[A, B]>) => [Event<A>, Event<B>] = (e) => [
  {
    value: pipe(
      e.value,
      O.map(([a]) => a),
    ),
    get next() {
      return split(e.next)[0];
    },
  },
  {
    value: pipe(
      e.value,
      O.map(([, b]) => b),
    ),
    get next() {
      return split(e.next)[1];
    },
  },
];

export const fan: <A, B>(e: Event<E.Either<A, B>>) => [Event<A>, Event<B>] = (
  e,
) => [
  {
    value: pipe(e.value, O.chain(flow(E.swap, O.fromEither))),
    get next() {
      return fan(e.next)[0];
    },
  },
  {
    value: pipe(e.value, O.chain(O.fromEither)),
    get next() {
      return fan(e.next)[1];
    },
  },
];

export const switchHold: <A>(
  init: Event<A>,
) => (e: Event<Event<A>>) => Event<A> = (init) => (e) => ({
  value: init.value,
  get next() {
    return pipe(
      e.value,
      O.map((ev) => ev.next),
      O.getOrElse(() => init.next),
      (i) => switchHold(i)(e.next),
    );
  },
});

export const tag: <A>(b: B.Behaviour<A>) => (e: Event<unknown>) => Event<A> = (
  b,
) => (e) => ({
  value: pipe(
    e.value,
    O.map(() => b.value),
  ),
  get next() {
    return tag(b.next)(e.next);
  },
});

export const tagOption: <A>(
  b: B.Behaviour<O.Option<A>>,
) => (e: Event<unknown>) => Event<A> = (b) => (e) => ({
  value: pipe(e.value, O.apSecond(b.value)),
  get next() {
    return tagOption(b.next)(e.next);
  },
});

export const gate: (b: B.Behaviour<boolean>) => <A>(e: Event<A>) => Event<A> = (
  b,
) => (e) => ({
  value: pipe(
    e.value,
    O.filter(() => b.value),
  ),
  get next() {
    return gate(b.next)(e.next);
  },
});
