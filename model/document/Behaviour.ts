/**
 * @description An inefficient semantic reference model for building a DOM.
 */

import { constant, flow, identity, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/lib/Array";
import * as C from "fp-ts/lib/Chain";
import * as Ap from "fp-ts/lib/Apply";
import * as Apl from "fp-ts/lib/Applicative";
import * as Mo from "fp-ts/lib/Monad";
import * as Mon from "fp-ts/lib/Monoid";
import * as P from "fp-ts/lib/Pointed";
import * as F from "fp-ts/lib/Functor";
import * as S from "fp-ts/lib/Semigroup";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

// Model of a Behaviour as a function from time to a value.
const sym = Symbol("Behaviour");
export interface Behaviour<A> {
  (tine: number): A;
  readonly _brand: typeof sym;
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
export const B: <A>(m: (time: number) => A) => Behaviour<A> = (m) => m as any;

export const unB: <A>(moment: Behaviour<A>) => (time: number) => A = identity;

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
) => (fa: Behaviour<A>) => Behaviour<B> = (f) => (fa) => B(flow(unB(fa), f));

export const ap: <A>(
  fa: Behaviour<A>,
) => <B>(fab: Behaviour<(a: A) => B>) => Behaviour<B> = (fa) => (fab) =>
  B((t) => unB(fab)(t)(unB(fa)(t)));

export const of: P.Pointed1<URI>["of"] = flow(constant, B);

export const chain: <A, B>(
  f: (a: A) => Behaviour<B>,
) => (ma: Behaviour<A>) => Behaviour<B> = (f) => (ma) =>
  B((t) => unB(f(unB(ma)(t)))(t));

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

export function getSemigroup<A>(
  semigroupA: S.Semigroup<A>,
): S.Semigroup<Behaviour<A>> {
  return {
    concat(bx, by) {
      return zipWith((x: A) => (y: A) => semigroupA.concat(x, y))(bx)(by);
    },
  };
}

export function getMonoid<A>(monoidA: Mon.Monoid<A>): Mon.Monoid<Behaviour<A>> {
  return {
    ...getSemigroup(monoidA),
    empty: B(constant(monoidA.empty)),
  };
}

// -------------------------------------------------------------------------------------
// Utilities
// -------------------------------------------------------------------------------------

export const take: (n: number) => <A>(b: Behaviour<A>) => A[] = (n) => (b) =>
  pipe(A.range(0, n), A.map(b));

export const drop: (n: number) => <A>(b: Behaviour<A>) => Behaviour<A> = (
  n,
) => (b) => B((t) => b(t - n));

export const sequenceArray: <A>(bs: Behaviour<A>[]) => Behaviour<A[]> = <A>(
  bs: Behaviour<A>[],
) => B((t) => bs.map((b) => b(t)));

export const unzip: <A, B>(
  b: Behaviour<[A, B]>,
) => [Behaviour<A>, Behaviour<B>] = (b) => [
  B((t) => b(t)[0]),
  B((t) => b(t)[1]),
];

export const zip = <A>(as: Behaviour<A>) => <B>(
  bs: Behaviour<B>,
): Behaviour<[A, B]> => B((t) => [as(t), bs(t)]);

export const zipWith: <A, B, C>(
  f: (a: A) => (b: B) => C,
) => (as: Behaviour<A>) => (bs: Behaviour<B>) => Behaviour<C> = (f) => (as) => (
  bs,
) => B((t) => f(as(t))(bs(t)));

export const divide: (
  pivot: number,
) => <A>(left: Behaviour<A>) => (right: Behaviour<A>) => Behaviour<A> = (
  pivot,
) => (left) => (right) => B((t) => (t < pivot ? left(t) : right(t)));
