import fc from "fast-check";
import { flow, identity, pipe } from "fp-ts/lib/function";
import { map, of, ap, fromArray, take, LazyList } from "./LazyList";

export const arbLazyList = <A>(a: fc.Arbitrary<A>): fc.Arbitrary<LazyList<A>> =>
  fc.tuple(a, fc.array(a)).map(([x, xs]) => fromArray([x, ...xs]));

const compose: <B, C>(g: (b: B) => C) => <A>(f: (a: A) => B) => (a: A) => C = (
  g,
) => (f) => (a) => g(f(a));

function assertLazyListEq(
  a: LazyList<unknown>,
  b: LazyList<unknown>,
  t: number,
): void {
  expect(take(t)(a)).toEqual(take(t)(b));
}

describe("LazyList", () => {
  describe("Functor", () => {
    it("fmap id == id", () => {
      fc.assert(
        fc.property(arbLazyList(fc.string()), fc.nat(100), (m, t) =>
          assertLazyListEq(pipe(m, map(identity)), m, t),
        ),
      );
    });
    it("fmap (f . g) == fmap f . fmap g", () => {
      fc.assert(
        fc.property(
          arbLazyList(fc.string()),
          fc.func(fc.nat()),
          fc.func(fc.date()),
          fc.nat(100),
          (m, f, g, t) =>
            assertLazyListEq(
              pipe(m, map(flow(g, f))),
              pipe(m, flow(map(g), map(f))),
              t,
            ),
        ),
      );
    });
  });
  describe("Applicative", () => {
    it("pure id <*> v = v", () => {
      fc.assert(
        fc.property(arbLazyList(fc.string()), fc.nat(100), (m, t) =>
          assertLazyListEq(pipe(identity, of, ap(m)), m, t),
        ),
      );
    });
    it("pure (.) <*> u <*> v <*> w == u <*> (v <*> w)", () => {
      fc.assert(
        fc.property(
          arbLazyList(fc.func(fc.nat())),
          arbLazyList(fc.func(fc.date())),
          arbLazyList(fc.string()),
          fc.nat(100),
          (u, v, w, t) =>
            assertLazyListEq(
              pipe(compose, of, ap(u), ap(v), ap(w)),
              pipe(u, ap(pipe(v, ap(w)))),
              t,
            ),
        ),
      );
    });
    it("pure f <*> pure x == pure (f x)", () => {
      fc.assert(
        fc.property(fc.func(fc.date()), fc.string(), fc.nat(100), (f, x, t) =>
          assertLazyListEq(pipe(of(f), ap(of(x))), of(f(x)), t),
        ),
      );
    });
    it("u <*> pure y = pure ($ y) <*> u", () => {
      fc.assert(
        fc.property(
          arbLazyList(fc.func(fc.date())),
          fc.string(),
          fc.nat(100),
          (u, y, t) =>
            assertLazyListEq(
              pipe(u, ap(of(y))),
              pipe(
                of((f: (s: string) => Date) => f(y)),
                ap(u),
              ),
              t,
            ),
        ),
      );
    });
  });
});
