import { flow, identity, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/lib/Array";
import * as S from "fp-ts/lib/State";
import * as C from "fp-ts/lib/Chain";
import * as Ap from "fp-ts/lib/Apply";
import * as Apl from "fp-ts/lib/Applicative";
import * as Mo from "fp-ts/lib/Monad";
import * as P from "fp-ts/lib/Pointed";
import * as F from "fp-ts/lib/Functor";
import { Tag } from "../../src/document";
import { Attribute, Attributes, tokens } from "./Attributes";
import * as B from "./Behaviour";
import * as E from "./Event";
import * as D from "./domBuilder";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

const wsym = Symbol("wsym");
export type Widget<A> = B.Behaviour<D.DomBuilder<A>> & { _brand: typeof wsym };

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

const unsafeWidget = <A>(b: B.Behaviour<D.DomBuilder<A>>): Widget<A> =>
  b as Widget<A>;

export const liftBehaviour: <A>(b: B.Behaviour<A>) => Widget<A> = flow(
  B.map(D.of),
  unsafeWidget,
);

export const liftDomBuilder: <A>(builder: D.DomBuilder<A>) => Widget<A> = flow(
  B.of,
  unsafeWidget,
);

export const runWidget: <A>(
  widget: Widget<A>,
) => B.Behaviour<D.DomBuilder<A>> = identity;

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
) => flow(pipe(f, D.map, B.map), unsafeWidget);

export const ap: <A>(
  fa: Widget<A>,
) => <B>(fab: Widget<(a: A) => B>) => Widget<B> = (fa) => (fab) =>
  unsafeWidget({
    value: pipe(fab, runWidget, B.sample, D.ap(pipe(fa, runWidget, B.sample))),
    get next() {
      return ap(unsafeWidget(runWidget(fa).next))(
        unsafeWidget(runWidget(fab).next),
      );
    },
  });

export const of: P.Pointed1<URI>["of"] = flow(D.of, B.of, unsafeWidget);

export const chain: <A, B>(
  f: (a: A) => Widget<B>,
) => (ma: Widget<A>) => Widget<B> = (f) => (ma) =>
  unsafeWidget({
    value: pipe(ma, runWidget, B.sample, D.chain(flow(f, runWidget, B.sample))),
    get next() {
      return chain(f)(unsafeWidget(runWidget(ma).next));
    },
  });

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

// -------------------------------------------------------------------------------------
// utilities
// -------------------------------------------------------------------------------------

export const sequence: <A>(ws: Widget<A>[]) => Widget<readonly A[]> = flow(
  B.sequence,
  B.map(S.sequenceArray),
  unsafeWidget,
);

export const text: (data: B.Behaviour<string>) => Widget<void> = flow(
  liftBehaviour,
  chain(flow(D.insertText, liftDomBuilder)),
);

export const el: <T extends Tag, A>(
  tag: Tag,
  attr: Attributes<T>,
  children: Widget<A>,
) => Widget<A> = (tag, attr, children) =>
  pipe(
    liftBehaviour(attr),
    chain(
      flow(
        A.map(runAttribute),
        sequence,
        map(() => undefined),
      ),
    ),
    runWidget,
    B.chain((attrBuilder) =>
      pipe(
        children,
        runWidget,
        B.map((childrenBuilder) =>
          D.insertElement(tag, pipe(attrBuilder, S.apSecond(childrenBuilder))),
        ),
      ),
    ),
    unsafeWidget,
  );

export const switchWidget = <A>(
  bWidget: B.Behaviour<Widget<A>>,
): Widget<B.Behaviour<A>> =>
  pipe(
    bWidget,
    B.chain(
      (widget: Widget<A>): B.Behaviour<D.DomBuilder<B.Behaviour<A>>> => ({
        value: pipe(widget, runWidget, (bBuilder) => {
          return pipe(
            D.get(),
            D.map((draft) =>
              pipe(
                bBuilder,
                B.map((builder) => builder(draft)),
                B.split,
              ),
            ),
            D.chain(([ba, bd]) =>
              pipe(bd, B.sample, D.put, S.apSecond(D.of(ba))),
            ),
          );
        }),
        get next() {
          return runWidget(switchWidget(bWidget.next));
        },
      }),
    ),
    unsafeWidget,
  );

export const list: <I, A>(
  itemWidget: (item: I) => Widget<A>,
) => (bList: B.Behaviour<I[]>) => Widget<B.Behaviour<readonly A[]>> = (
  itemWidget,
) => flow(B.map(flow(A.map(itemWidget), sequence)), switchWidget);

export const holdWidget: <A>(
  initial: Widget<A>,
) => (eWidget: E.Event<Widget<A>>) => Widget<B.Behaviour<A>> = (initial) =>
  flow(E.hold(initial), switchWidget);

const runAttribute: (attribute: Attribute<Tag>) => Widget<void> = (
  attribute,
) => {
  switch (attribute.type) {
    case "Prop":
      return pipe(
        attribute.value,
        B.map((value) => D.setProp(attribute.name, String(value))),
        unsafeWidget,
      );
    case "Style":
      return pipe(
        attribute.value,
        B.map((value) => D.setAttribute(attribute.name, value)),
        unsafeWidget,
      );
    case "Tokens":
      return pipe(
        attribute.value,
        B.map((values) =>
          S.sequenceArray(
            values.map((value) => D.addToken(attribute.name, value)),
          ),
        ),
        B.map(() => D.of(undefined)),
        unsafeWidget,
      );
    case "TokenList":
      return pipe(
        B.sequence(
          Object.entries(attribute.value).map(([key, value]) =>
            pipe(
              value,
              B.map((on) => ({ on, key })),
            ),
          ),
        ),
        B.map((cs) => cs.filter(({ on }) => on).map(({ key }) => key)),
        (value) => runAttribute(tokens(attribute.name, value)),
      );
  }
};
