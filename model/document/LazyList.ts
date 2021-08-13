/**
 * @description An inefficient semantic reference model for building a DOM.
 */

import { pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/lib/Array";
import * as RA from "fp-ts/lib/ReadOnlyArray";
import * as Ap from "fp-ts/lib/Apply";
import * as Apl from "fp-ts/lib/Applicative";
import * as P from "fp-ts/lib/Pointed";
import * as F from "fp-ts/lib/Functor";
import * as M from "fp-ts/lib/Monoid";
import * as S from "fp-ts/lib/Semigroup";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export interface LazyList<A> {
  readonly value: A;
  readonly next: LazyList<A>;
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const constant: <A>(a: A) => LazyList<A> = (a) => ({
  value: a,
  get next() {
    return constant(a);
  },
});

export const fromArray: <A>(a: NonEmptyArray<A>) => LazyList<A> = ([
  a,
  ...as
]) => ({
  value: a,
  get next() {
    return A.isNonEmpty(as) ? fromArray(as) : constant(a);
  },
});

// -------------------------------------------------------------------------------------
// non-pipeables
// -------------------------------------------------------------------------------------

const _map: F.Functor1<URI>["map"] = (fa, f) => pipe(fa, map(f));
const _ap: Ap.Apply1<URI>["ap"] = (fab, fa) => pipe(fab, ap(fa));

// -------------------------------------------------------------------------------------
// type class members
// -------------------------------------------------------------------------------------

export const map: <A, B>(f: (a: A) => B) => (fa: LazyList<A>) => LazyList<B> = (
  f,
) => (fa) => ({
  get value() {
    return f(fa.value);
  },
  get next() {
    return map(f)(fa.next);
  },
});

export const ap: <A>(
  fa: LazyList<A>,
) => <B>(fab: LazyList<(a: A) => B>) => LazyList<B> = (fa) => (fab) => ({
  get value() {
    return fab.value(fa.value);
  },
  get next() {
    return ap(fa.next)(fab.next);
  },
});

export const of: P.Pointed1<URI>["of"] = constant;

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const URI = "sodium-dom/model/LazyList";

export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    readonly [URI]: LazyList<A>;
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

export function getSemigroup<A>(
  semigroupA: S.Semigroup<A>,
): S.Semigroup<LazyList<A>> {
  return {
    concat(lx: LazyList<A>, ly: LazyList<A>): LazyList<A> {
      return zipWith<A, A, A>((x) => (y) => semigroupA.concat(x, y))(lx)(ly);
    },
  };
}

export function getMonoid<A>(monoidA: M.Monoid<A>): M.Monoid<LazyList<A>> {
  return {
    ...getSemigroup(monoidA),
    empty: of(monoidA.empty),
  };
}

// -------------------------------------------------------------------------------------
// Utilities
// -------------------------------------------------------------------------------------

export const take: (n: number) => <A>(b: LazyList<A>) => A[] = (n) => (b) =>
  n <= 0 ? [] : [b.value, ...take(n - 1)(b.next)];

export const drop: (n: number) => <A>(b: LazyList<A>) => LazyList<A> = (n) => (
  b,
) => (n > 0 ? drop(n - 1)(b.next) : b);

export const head: <A>(b: LazyList<A>) => A = ({ value }) => value;

export const tail: <A>(b: LazyList<A>) => LazyList<A> = drop(1);

export const sequenceArray: <A>(
  bs: readonly LazyList<A>[],
) => LazyList<readonly A[]> = <A>(bs: readonly LazyList<A>[]) =>
  pipe(
    bs,
    RA.reduce(of([] as readonly A[]), (bas, ba) =>
      pipe(ba, map(RA.append), ap(bas)),
    ),
  );

export const unzip: <A, B>(
  b: LazyList<[A, B]>,
) => [LazyList<A>, LazyList<B>] = (b) => [
  {
    get value() {
      return b.value[0];
    },
    get next() {
      return unzip(b.next)[0];
    },
  },
  {
    get value() {
      return b.value[1];
    },
    get next() {
      return unzip(b.next)[1];
    },
  },
];

export const zip = <A>(as: LazyList<A>) => <B>(
  bs: LazyList<B>,
): LazyList<[A, B]> => ({
  get value() {
    return [as.value, bs.value] as [A, B];
  },
  get next() {
    return zip(as.next)(bs.next);
  },
});

export const zipWith: <A, B, C>(
  f: (a: A) => (b: B) => C,
) => (as: LazyList<A>) => (bs: LazyList<B>) => LazyList<C> = (f) => (as) => (
  bs,
) => ({
  get value() {
    return f(as.value)(bs.value);
  },
  get next() {
    return zipWith(f)(as.next)(bs.next);
  },
});

export const diagonal: <A>(list: LazyList<LazyList<A>>) => LazyList<A> = (
  list,
) => ({
  get value() {
    return list.value.value;
  },
  get next() {
    return diagonal(list.next);
  },
});

export const overwrite: (
  i: number,
) => <A>(source: LazyList<A>) => (target: LazyList<A>) => LazyList<A> = (i) => (
  source,
) => (target) => ({
  get value() {
    return i <= 0 ? source.value : target.value;
  },
  get next() {
    return i <= 0 ? source.next : overwrite(i - 1)(target.next)(source);
  },
});

export const count: (start: number) => LazyList<number> = (n) => ({
  value: n,
  get next() {
    return count(n + 1);
  },
});

export const pivot: (
  i: number,
) => <A>(source: LazyList<A>) => (target: LazyList<A>) => LazyList<A> = (i) => (
  source,
) => overwrite(i)(pipe(source, drop(i)));
