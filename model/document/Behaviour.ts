/**
 * @description An inefficient semantic reference model for building a DOM.
 */

import { identity, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/lib/Array";
import * as C from "fp-ts/lib/Chain";
import * as Ap from "fp-ts/lib/Apply";
import * as Apl from "fp-ts/lib/Applicative";
import * as Mo from "fp-ts/lib/Monad";
import * as P from "fp-ts/lib/Pointed";
import * as F from "fp-ts/lib/Functor";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

// Model of a Behaviour (Cell) as an infinite stream of values.
export interface Behaviour<A> {
  readonly value: A;
  readonly next: Behaviour<A>;
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const constant: <A>(a: A) => Behaviour<A> = (a) => ({
  value: a,
  get next() {
    return constant(a);
  },
});

export const listToInfStream: <A>(a: NonEmptyArray<A>) => Behaviour<A> = ([
  a,
  ...as
]) => ({
  value: a,
  get next() {
    return A.isNonEmpty(as) ? listToInfStream(as) : constant(a);
  },
});

// -------------------------------------------------------------------------------------
// non-pipeables
// -------------------------------------------------------------------------------------

const _map: F.Functor1<URI>["map"] = (fa, f) => pipe(fa, map(f));
const _ap: Ap.Apply1<URI>["ap"] = (fab, fa) => pipe(fab, ap(fa));
const _chain: C.Chain1<URI>["chain"] = (ma, f) => pipe(ma, chain(f));

// -------------------------------------------------------------------------------------
// type class members
// -------------------------------------------------------------------------------------

export const map: <A, B>(
  f: (a: A) => B,
) => (fa: Behaviour<A>) => Behaviour<B> = (f) => (fa) => ({
  value: f(fa.value),
  get next() {
    return map(f)(fa.next);
  },
});

export const ap: <A>(
  fa: Behaviour<A>,
) => <B>(fab: Behaviour<(a: A) => B>) => Behaviour<B> = (fa) => (fab) => ({
  value: fab.value(fa.value),
  get next() {
    return ap(fa.next)(fab.next);
  },
});

export const of: P.Pointed1<URI>["of"] = constant;

export const chain: <A, B>(
  f: (a: A) => Behaviour<B>,
) => (ma: Behaviour<A>) => Behaviour<B> = (f) => (ma) => ({
  value: f(ma.value).value,
  get next() {
    return chain(f)(ma.next);
  },
});

export const flatten: <A>(mma: Behaviour<Behaviour<A>>) => Behaviour<A> = chain(
  identity,
);

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const URI = "sodium-dom/model/Behaviour";

export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    readonly [URI]: Behaviour<A>;
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

/**
 * @category instances
 * @since 2.10.0
 */
export const Pointed: P.Pointed1<URI> = {
  URI,
  of,
};

/**
 * @category instances
 * @since 2.10.0
 */
export const Apply: Ap.Apply1<URI> = {
  ...Functor,
  ap: _ap,
};

export const Applicative: Apl.Applicative1<URI> = {
  ...Functor,
  ...Apply,
  ...Pointed,
};

/**
 * @category instances
 * @since 2.10.0
 */
export const Chain: C.Chain1<URI> = {
  ...Apply,
  chain: _chain,
};

/**
 * @category instances
 * @since 2.7.0
 */
export const Monad: Mo.Monad1<URI> = {
  ...Chain,
  ...Applicative,
};

// -------------------------------------------------------------------------------------
// Utilities
// -------------------------------------------------------------------------------------

export const sample: <A>(b: Behaviour<A>) => A = ({ value }) => value;
