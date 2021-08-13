import { constant, flow, identity, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/lib/Array";
import * as C from "fp-ts/lib/Chain";
import * as Ap from "fp-ts/lib/Apply";
import * as Apl from "fp-ts/lib/Applicative";
import * as Mo from "fp-ts/lib/Monad";
import * as Mon from "fp-ts/lib/Monoid";
import * as P from "fp-ts/lib/Pointed";
import * as F from "fp-ts/lib/Functor";
import * as Sem from "fp-ts/lib/Semigroup";
import * as Wr from "fp-ts/lib/Writer";
import { Tag } from "../../src/document";
import { Attribute, Attributes, tokens } from "./Attributes";
import * as B from "./Behaviour";
import * as E from "./Event";
import * as D from "./domBuilder";
import { concatAll } from "fp-ts/lib/Monoid";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

const sym = Symbol("Widget");
export type Widget<A> = Wr.Writer<B.Behaviour<D.DomBuilder>, A> & {
  _brand: typeof sym;
};

const ApplicativeW = Wr.getApplicative(B.getMonoid(D.Monoid));
const MonadW = Wr.getMonad(B.getMonoid(D.Monoid));

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const W = <A>(b: Wr.Writer<B.Behaviour<D.DomBuilder>, A>): Widget<A> =>
  b as Widget<A>;

export const unW: <A>(
  widget: Widget<A>,
) => Wr.Writer<B.Behaviour<D.DomBuilder>, A> = identity;

// -------------------------------------------------------------------------------------
// non-pipeables
// -------------------------------------------------------------------------------------

const _map: F.Functor1<URI>["map"] = (fa, f) => pipe(fa, map(f));
const _ap: Ap.Apply1<URI>["ap"] = (fab, fa) => pipe(fab, ap(fa));
const _chain: C.Chain1<URI>["chain"] = (ma, f) => pipe(ma, chain(f));

// -------------------------------------------------------------------------------------
// type class members
// -------------------------------------------------------------------------------------

export const map: <A, B>(f: (a: A) => B) => (fa: Widget<A>) => Widget<B> = (
  f,
) => (fa) => {
  const w = pipe(fa, Wr.map(f), W);
  w.toString = () => `${f.toString()} <$> ${fa.toString()}`;
  return w;
};

export const ap: <A>(
  fa: Widget<A>,
) => <B>(fab: Widget<(a: A) => B>) => Widget<B> = (fa) => (fab) => {
  const w = pipe(fab, unW, (fab) => ApplicativeW.ap(fab, unW(fa)), W);
  w.toString = () => `${fab.toString()} <*> ${fa.toString()}`;
  return w;
};

export const of: P.Pointed1<URI>["of"] = (a) => {
  const w = W(ApplicativeW.of(a));
  w.toString = () => `pure ${String(a)}`;
  return w;
};

export const chain: <A, B>(
  f: (a: A) => Widget<B>,
) => (ma: Widget<A>) => Widget<B> = (f) => (ma) => {
  const w = pipe(ma, unW, (ma) => MonadW.chain(ma, f), W);
  w.toString = () => `${ma.toString()} >>= ${f.toString()}`;
  return w;
};

export const flatten: <A>(mma: Widget<Widget<A>>) => Widget<A> = chain(
  identity,
);

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const URI = "sodium-dom/model/Widget";

export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    readonly [URI]: Widget<A>;
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
  semigroupA: Sem.Semigroup<A>,
): Sem.Semigroup<Widget<A>> {
  return {
    concat: (wx, wy) =>
      pipe(
        Ap.sequenceT(Apply)(wx, wy),
        map(([x, y]) => semigroupA.concat(x, y)),
      ),
  };
}

export function getMonoid<A>(monoidA: Mon.Monoid<A>): Mon.Monoid<Widget<A>> {
  return {
    ...getSemigroup(monoidA),
    empty: of(monoidA.empty),
  };
}

// -------------------------------------------------------------------------------------
// utilities
// -------------------------------------------------------------------------------------

export const sequence = <A>(ws: Widget<A>[]): Widget<A[]> => {
  const w = ws.reduce(
    (was, wa) =>
      pipe(
        wa,
        chain((a) =>
          pipe(
            was,
            map((as) => [...as, a]),
          ),
        ),
      ),
    of<A[]>([]),
  );
  w.toString = () => `sequence $ [${ws.toString()}]`;
  return w;
};

export const text: (data: B.Behaviour<string>) => Widget<void> = (data) => {
  const w = pipe(D.insertText, B.of, B.ap(data), Wr.tell, W);
  W.toString = () => `text $ ${data.toString()}`;
  return w;
};

export const el: <T extends Tag, A>(
  tag: Tag,
  attr: Attributes<T>,
  children: Widget<A>,
) => Widget<A> = (tag, attr, children) => {
  const [a, bChildren] = MonadW.chain(
    unW(runAttributes(attr)),
    constant(children),
  )();
  const w = pipe(
    tag,
    D.insertElement,
    B.of,
    B.ap(bChildren),
    Wr.tell,
    W,
    map(constant(a)),
  );
  w.toString = () =>
    `el "${tag}" ${attr.toString()} do \n  ${children
      .toString()
      .replace("\n", "\n  ")})`;
  return w;
};

export const switchWidget = <A>(
  bWidget: B.Behaviour<Widget<A>>,
): Widget<B.Behaviour<A>> => {
  const w = pipe(
    bWidget,
    B.chain((w) => {
      const [a, bBuilder] = w();
      return pipe(
        bBuilder,
        B.map((builder) => [a, builder] as [A, D.DomBuilder]),
      );
    }),
    B.unzip,
    constant,
    W,
  );
  w.toString = () => `switchWidget $ ${bWidget.toString()}`;
  return w;
};

export const list: <I, A>(
  itemWidget: (item: I) => Widget<A>,
) => (bList: B.Behaviour<I[]>) => Widget<B.Behaviour<A[]>> = (itemWidget) => (
  bList,
) => {
  const w = pipe(bList, B.map(flow(A.map(itemWidget), sequence)), switchWidget);
  w.toString = () => `list (${itemWidget.toString()}) $ ${bList.toString()}`;
  return w;
};

export const holdWidget: <A>(
  initial: Widget<A>,
) => (eWidget: E.Event<Widget<A>>) => Widget<B.Behaviour<A>> = (initial) => (
  eWidget,
) => {
  const w = pipe(eWidget, E.hold(initial), switchWidget);
  w.toString = () =>
    `holdWidget (${initial.toString()}) $ ${eWidget.toString()}`;
  return w;
};

const runAttribute: (attribute: Attribute<Tag>) => Widget<void> = (
  attribute,
) => {
  switch (attribute.type) {
    case "Prop":
      return pipe(
        attribute.name,
        D.setAttribute,
        B.of,
        B.ap(B.map(String)(attribute.value)),
        Wr.tell,
        W,
      );
    case "Style":
      return pipe(
        attribute.name,
        D.setStyle,
        B.of,
        B.ap(attribute.value),
        Wr.tell,
        W,
      );
    case "Tokens":
      return pipe(
        attribute.value,
        B.map(flow(A.map(D.addToken(attribute.name)), concatAll(D.Monoid))),
        Wr.tell,
        W,
      );
    case "TokenList":
      return pipe(
        attribute.value,
        (a) => Object.entries(a),
        A.map(([token, on]) =>
          pipe(
            on,
            B.map((on) => ({ token, on })),
          ),
        ),
        B.sequenceArray,
        B.map(
          flow(
            A.filter(({ on }) => on),
            A.map(({ token }) => token),
          ),
        ),
        tokens(attribute.name),
        runAttribute,
      );
  }
};

const runAttributes: (attributes: Attributes<Tag>) => Widget<void> = flow(
  B.chain(
    flow(
      A.map(runAttribute),
      sequence,
      map(constant(undefined)),
      unW,
      Wr.execute,
    ),
  ),
  Wr.tell,
  W,
);
