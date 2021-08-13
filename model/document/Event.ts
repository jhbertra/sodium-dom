/**
 * @description An inefficient semantic reference model for building a DOM.
 */

import { constant, flow, identity, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/lib/Array";
import * as Either from "fp-ts/lib/Either";
import * as F from "fp-ts/lib/Functor";
import * as O from "fp-ts/lib/Option";
import * as S from "fp-ts/lib/Semigroup";
import * as Mon from "fp-ts/lib/Monoid";
import * as T from "fp-ts/lib/Tuple";
import * as N from "fp-ts/lib/number";
import * as B from "./Behaviour";
import { Ord } from "fp-ts/lib/Ord";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

// Model of a Event (Stream) as an infinite stream of possible values.
const sym = Symbol("Event");
export type Event<A> = [t: number, a: A][] & { _brand: typeof sym };

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

const OrdTime: Ord<[number, unknown]> = {
  equals: ([t1], [t2]) => N.Ord.equals(t1, t2),
  compare: ([t1], [t2]) => N.Ord.compare(t1, t2),
};

export const E: <A>(l: [t: number, a: A][]) => Event<A> = (l) =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  pipe(l, A.sort(OrdTime)) as any;

export const unE: <A>(e: Event<A>) => [t: number, a: A][] = identity;

// -------------------------------------------------------------------------------------
// non-pipeables
// -------------------------------------------------------------------------------------

const _map: F.Functor1<URI>["map"] = (fa, f) => pipe(fa, map(f));

// -------------------------------------------------------------------------------------
// type class members
// -------------------------------------------------------------------------------------

export const map: <A, B>(f: (a: A) => B) => (fa: Event<A>) => Event<B> = (f) =>
  flow(A.map(T.mapSnd(f)), E);

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

export function getMonoid<A>(semigroupA: S.Semigroup<A>): Mon.Monoid<Event<A>> {
  return {
    concat(ex, ey) {
      return unionWith<A>((x) => (y) => semigroupA.concat(x, y))(ex)(ey);
    },
    empty: never,
  };
}

// -------------------------------------------------------------------------------------
// Utilities
// -------------------------------------------------------------------------------------

export const never: Event<never> = E([]);

export const unionWith = <A>(f: (a: A) => (a: A) => A) => (e1: Event<A>) => (
  e2: Event<A>,
): Event<A> =>
  E(
    e1.flatMap(([t1, a1]) =>
      e2.filter(([t2]) => t1 === t2).map(flow(T.mapSnd(f(a1)))),
    ),
  );

export const hold: <A>(init: A) => (e: Event<A>) => B.Behaviour<A> = (init) => (
  e,
) =>
  B.B((t) =>
    pipe(
      e,
      A.filter(([t_]) => t_ < t),
      A.last,
      O.map(T.snd),
      O.getOrElse(constant(init)),
    ),
  );

export const switchB: <A>(
  b: B.Behaviour<A>,
) => (e: Event<B.Behaviour<A>>) => B.Behaviour<A> = (b) => (e) =>
  pipe(hold(b)(e), B.flatten);

export const switchE: <A>(e: Event<Event<A>>) => Event<A> = flow(
  A.chain(([t, es]) =>
    pipe(
      es,
      A.findFirst(([t_]) => t_ === t),
      O.match(constant([]), A.of),
    ),
  ),
  E,
);

export const split: <A, B>(e: Event<[A, B]>) => [Event<A>, Event<B>] = (e) => [
  E(pipe(e, flow(A.map(T.mapSnd(T.fst))))),
  E(pipe(e, flow(A.map(T.mapSnd(T.snd))))),
];

export const fan: <A, B>(
  e: Event<Either.Either<A, B>>,
) => [Event<A>, Event<B>] = (e) => [
  E(
    pipe(
      e,
      flow(
        A.chain(([t, a]) =>
          pipe(
            a,
            Either.match((a) => [[t, a]], constant([])),
          ),
        ),
      ),
    ),
  ),
  E(
    pipe(
      e,
      flow(
        A.chain(([t, a]) =>
          pipe(
            a,
            Either.match(constant([]), (b) => [[t, b]]),
          ),
        ),
      ),
    ),
  ),
];

export const gate: (b: B.Behaviour<boolean>) => <A>(e: Event<A>) => Event<A> = (
  b,
) => (e) => E(e.filter(([t]) => b(t)));
