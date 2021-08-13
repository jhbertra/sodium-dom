import fc from "fast-check";
import { flow, identity, pipe } from "fp-ts/lib/function";
import { Behaviour, map, B, unB, of, ap, chain } from "./Behaviour";

const arbMoment = <A>(a: fc.Arbitrary<A>) => fc.func(a).map(B);

const compose: <B, C>(g: (b: B) => C) => <A>(f: (a: A) => B) => (a: A) => C = (
  g,
) => (f) => (a) => g(f(a));

function assertMomentEq(
  a: Behaviour<unknown>,
  b: Behaviour<unknown>,
  t: number,
): void {
  expect(unB(a)(t)).toEqual(unB(b)(t));
}

describe("Behaviour", () => {
  describe("Functor", () => {
    it("fmap id == id", () => {
      fc.assert(
        fc.property(arbMoment(fc.string()), fc.nat(), (m, t) =>
          assertMomentEq(map(identity)(m), m, t),
        ),
      );
    });
    it("fmap (f . g) == fmap f . fmap g", () => {
      fc.assert(
        fc.property(
          arbMoment(fc.string()),
          fc.func(fc.nat()),
          fc.func(fc.date()),
          fc.nat(),
          (m, f, g, t) =>
            assertMomentEq(map(flow(g, f))(m), flow(map(g), map(f))(m), t),
        ),
      );
    });
  });
  describe("Applicative", () => {
    it("pure id <*> v = v", () => {
      fc.assert(
        fc.property(arbMoment(fc.string()), fc.nat(), (m, t) =>
          assertMomentEq(pipe(identity, of, ap(m)), m, t),
        ),
      );
    });
    it("pure (.) <*> u <*> v <*> w == u <*> (v <*> w)", () => {
      fc.assert(
        fc.property(
          arbMoment(fc.func(fc.nat())),
          arbMoment(fc.func(fc.date())),
          arbMoment(fc.string()),
          fc.nat(),
          (u, v, w, t) =>
            assertMomentEq(
              pipe(compose, of, ap(u), ap(v), ap(w)),
              pipe(u, ap(pipe(v, ap(w)))),
              t,
            ),
        ),
      );
    });
    it("pure f <*> pure x == pure (f x)", () => {
      fc.assert(
        fc.property(fc.func(fc.date()), fc.string(), fc.nat(), (f, x, t) =>
          assertMomentEq(pipe(of(f), ap(of(x))), of(f(x)), t),
        ),
      );
    });
    it("u <*> pure y = pure ($ y) <*> u", () => {
      fc.assert(
        fc.property(
          arbMoment(fc.func(fc.date())),
          fc.string(),
          fc.nat(),
          (u, y, t) =>
            assertMomentEq(
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
  describe("Monad", () => {
    it("return a >>= k = k a", () => {
      fc.assert(
        fc.property(fc.string(), fc.nat(), (a, t) =>
          assertMomentEq(
            pipe(
              a,
              of,
              chain((s) => of(s.length)),
            ),
            of(a.length),
            t,
          ),
        ),
      );
    });
    it("m >>= return = m", () => {
      fc.assert(
        fc.property(arbMoment(fc.string()), fc.nat(), (m, t) =>
          assertMomentEq(pipe(m, chain(of)), m, t),
        ),
      );
    });
    it("m >>= (x -> k x >>= h)  =  (m >>= k) >>= h", () => {
      fc.assert(
        fc.property(arbMoment(fc.string()), fc.nat(), (m, t) => {
          const famb = (a: string) => of(a.length);
          const fbmc = (b: number) => of(b.toString());
          assertMomentEq(
            pipe(
              m,
              chain((x) => pipe(famb(x), chain(fbmc))),
            ),
            pipe(m, chain(famb), chain(fbmc)),
            t,
          );
        }),
      );
    });
  });
});
