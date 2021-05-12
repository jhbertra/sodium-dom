/**
 * @description An inefficient semantic reference model for building a DOM.
 */

import { constant, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/lib/Array";
import * as C from "fp-ts/lib/Chain";
import * as Ap from "fp-ts/lib/Apply";
import * as Apl from "fp-ts/lib/Applicative";
import * as O from "fp-ts/lib/Option";
import * as S from "fp-ts/lib/State";
import * as T from "fp-ts/lib/Tuple";
import * as Md from "fp-ts/lib/Monoid";
import * as Mo from "fp-ts/lib/Monad";
import * as P from "fp-ts/lib/Pointed";
import * as F from "fp-ts/lib/Functor";
import { Tag } from "../../src/document/core";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export interface Text {
  readonly type: "Text";
  readonly data: string;
}

export interface Element {
  readonly type: "Element";
  readonly tag: Tag;
  readonly props: Record<string, string>;
  readonly attributes: Record<string, string>;
  readonly style: Record<string, string>;
  readonly children: Node[];
  readonly classList: Record<string, undefined>;
}

export type Node = Text | Element;

export const isElement = (node: Node): node is Element =>
  node.type === "Element";
export const isText = (node: Node): node is Text => node.type === "Text";

interface DraftElement {
  readonly tag: Tag;
  readonly props: Record<string, string>;
  readonly attributes: Record<string, string>;
  readonly style: Record<string, string>;
  readonly leftChildren: Node[];
  readonly rightChildren: Node[];
  readonly classList: Record<string, undefined>;
}

function publish(draft: DraftElement): Element {
  return {
    attributes: draft.attributes,
    classList: draft.classList,
    children: [...draft.leftChildren, ...draft.rightChildren],
    props: draft.props,
    tag: draft.tag,
    style: draft.style,
    type: "Element",
  };
}

function edit(element: Element): DraftElement {
  return {
    attributes: element.attributes,
    classList: element.classList,
    leftChildren: [],
    props: element.props,
    rightChildren: element.children,
    style: element.style,
    tag: element.tag,
  };
}

export type DomBuilder<A> = S.State<DraftElement, A>;

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const next: DomBuilder<void> = S.modify((draft) =>
  pipe(
    draft.rightChildren,
    A.matchLeft(constant(draft), (c, cs) => ({
      ...draft,
      leftChildren: [...draft.leftChildren, c],
      rightChildren: cs,
    })),
  ),
);

export const prev: DomBuilder<void> = S.modify((draft) =>
  pipe(
    draft.leftChildren,
    A.matchRight(constant(draft), (cs, c) => ({
      ...draft,
      leftChildren: cs,
      rightChildren: [c, ...draft.rightChildren],
    })),
  ),
);

export const end: DomBuilder<void> = pipe(
  S.get<DraftElement>(),
  S.chain((draft) =>
    A.isEmpty(draft.rightChildren) ? S.put(draft) : pipe(next, S.apSecond(end)),
  ),
);

export const start: DomBuilder<void> = pipe(
  S.get<DraftElement>(),
  S.chain((draft) =>
    A.isEmpty(draft.leftChildren)
      ? S.put(draft)
      : pipe(prev, S.apSecond(start)),
  ),
);

export const insertElement = <A>(
  tag: Tag,
  childBuilder: DomBuilder<A>,
): DomBuilder<A> => {
  const [a, child] = pipe(childBuilder, run(tag));
  return pipe(
    S.modify<DraftElement>((draft) => ({
      ...draft,
      leftChildren: [...draft.leftChildren, child],
    })),
    S.apSecond(S.of(a)),
  );
};

export const updateElement = <A>(
  elementBuilder: DomBuilder<A>,
): DomBuilder<O.Option<A>> =>
  pipe(
    S.gets((draft: DraftElement) => draft.rightChildren),
    S.chain((rightChildren) =>
      pipe(
        rightChildren,
        A.matchLeft(constant(S.of(O.none)), (n, ns) =>
          pipe(
            O.of(n),
            O.filter(isElement),
            O.map((e) => pipe(e, edit, elementBuilder, T.mapSnd(publish))),
            O.match(constant(S.of(O.none)), ([a, e]) =>
              pipe(
                S.modify<DraftElement>((draft) => ({
                  ...draft,
                  leftChildren: [...draft.leftChildren, e],
                  rightChildren: ns,
                })),
                S.apSecond(S.of(O.some(a))),
              ),
            ),
          ),
        ),
      ),
    ),
  );

export const insertText = (data: string): DomBuilder<void> =>
  S.modify((draft) => ({
    ...draft,
    leftChildren: [...draft.leftChildren, { type: "Text", data }],
  }));

export const updateText = (data: string): DomBuilder<void> =>
  S.modify((draft) =>
    pipe(
      draft.rightChildren,
      A.matchLeft(constant(draft), (n, ns) =>
        isText(n)
          ? {
              ...draft,
              leftChildren: [...draft.leftChildren, { type: "Text", data }],
              rightChildren: ns,
            }
          : draft,
      ),
    ),
  );

export const removeChild: DomBuilder<void> = S.modify((draft) =>
  pipe(
    draft.rightChildren,
    A.matchLeft(constant(draft), (_, rightChildren) => ({
      ...draft,
      rightChildren,
    })),
  ),
);

export const setAttribute = (name: string, value: string): DomBuilder<void> =>
  S.modify(({ attributes, ...draft }) => ({
    ...draft,
    attributes: { ...attributes, [name]: value },
  }));

export const removeAttribute = (name: string): DomBuilder<void> =>
  S.modify(({ // eslint-disable-next-line @typescript-eslint/no-unused-vars
    attributes: { [name]: _, ...attributes }, ...draft }) => ({
    ...draft,
    attributes,
  }));

export const setProp = (name: string, value: string): DomBuilder<void> =>
  S.modify(({ props, ...draft }) => ({
    ...draft,
    props: { ...props, [name]: value },
  }));

export const removeProp = (name: string): DomBuilder<void> =>
  S.modify(({ // eslint-disable-next-line @typescript-eslint/no-unused-vars
    props: { [name]: _, ...props }, ...draft }) => ({
    ...draft,
    props,
  }));

export const setStyle = (name: string, value: string): DomBuilder<void> =>
  S.modify(({ style, ...draft }) => ({
    ...draft,
    style: { ...style, [name]: value },
  }));

export const removeStyle = (name: string): DomBuilder<void> =>
  S.modify(({ // eslint-disable-next-line @typescript-eslint/no-unused-vars
    style: { [name]: _, ...style }, ...draft }) => ({
    ...draft,
    style,
  }));

export const addToken = (name: string, value: string): DomBuilder<void> =>
  name === "classList"
    ? S.modify(({ classList, ...draft }) => ({
        ...draft,
        classList: { ...classList, [value]: undefined },
      }))
    : S.of(undefined);

export const removeToken = (name: string, value: string): DomBuilder<void> =>
  name === "classList"
    ? S.modify(({ classList: { [value]: _, ...classList }, ...draft }) => ({
        ...draft,
        classList,
      }))
    : S.of(undefined);

export const getMonoid = <A>(ma: Md.Monoid<A>): Md.Monoid<DomBuilder<A>> => ({
  empty: S.of(ma.empty),
  concat: (a, b) => (draft) => {
    const [a1, d1] = a(draft);
    const [a2, d2] = b(d1);
    return [ma.concat(a1, a2), d2];
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
) => (fa: DomBuilder<A>) => DomBuilder<B> = S.map;

export const ap: <A>(
  fa: DomBuilder<A>,
) => <B>(fab: DomBuilder<(a: A) => B>) => DomBuilder<B> = S.ap;

export const of: P.Pointed1<URI>["of"] = (a) => (s) => [a, s];

export const chain: <A, B>(
  f: (a: A) => DomBuilder<B>,
) => (ma: DomBuilder<A>) => DomBuilder<B> = S.chain;

export const flatten: <A>(mma: DomBuilder<DomBuilder<A>>) => DomBuilder<A> =
  S.flatten;

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const URI = "sodium-dom/model/DomBuilder";

export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    readonly [URI]: DomBuilder<A>;
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
// utils
// -------------------------------------------------------------------------------------

export const run = (tag: Tag) => <A>(builder: DomBuilder<A>): [A, Element] => {
  const [a, d] = builder({
    attributes: {},
    classList: {},
    leftChildren: [],
    props: {},
    rightChildren: [],
    style: {},
    tag,
  });
  return [a, publish(d)];
};

export const get: () => DomBuilder<DraftElement> = S.get;
export const gets: <A>(f: (draft: DraftElement) => A) => DomBuilder<A> = S.gets;
export const put: (draft: DraftElement) => DomBuilder<void> = S.put;
export const modify: (
  f: (draft: DraftElement) => DraftElement,
) => DomBuilder<void> = S.modify;
