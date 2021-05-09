/**
 * @description An inefficient semantic reference model for building a DOM.
 */

import { constant, flow, identity, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/lib/Array";
import { Tag } from "../../src/document/core";
import { Monoid } from "fp-ts/lib/Monoid";

interface Text {
  readonly type: "Text";
  readonly data: string;
}

interface Element {
  readonly type: "Element";
  readonly tag: Tag;
  readonly props: Record<string, string>;
  readonly attributes: Record<string, string>;
  readonly children: Node[];
}

type Node = Text | Element;

const isElement = (node: Node): node is Element => node.type === "Element";
const isText = (node: Node): node is Text => node.type === "Text";

interface DraftElement {
  readonly tag: Tag;
  readonly props: Record<string, string>;
  readonly attributes: Record<string, string>;
  readonly leftChildren: Node[];
  readonly rightChildren: Node[];
}

function publish(draft: DraftElement): Element {
  return {
    type: "Element",
    tag: draft.tag,
    attributes: draft.attributes,
    props: draft.props,
    children: [...draft.leftChildren, ...draft.rightChildren],
  };
}

function edit(element: Element): DraftElement {
  return {
    tag: element.tag,
    attributes: element.attributes,
    props: element.props,
    leftChildren: [],
    rightChildren: element.children,
  };
}

export type DomBuilder = (draft: DraftElement) => DraftElement;

export const run = (tag: Tag) => (builder: DomBuilder): Element =>
  publish(builder(emptyDocument(tag)));

// terms

export const emptyDocument = (tag: Tag): DraftElement => ({
  leftChildren: [],
  rightChildren: [],
  tag,
  attributes: {},
  props: {},
});

// Child navigation operations

export const next: DomBuilder = (draft) =>
  pipe(
    draft.rightChildren,
    A.matchLeft(constant(draft), (c, cs) => ({
      ...draft,
      leftChildren: [...draft.leftChildren, c],
      rightChildren: cs,
    })),
  );

export const prev: DomBuilder = (draft) =>
  pipe(
    draft.leftChildren,
    A.matchRight(constant(draft), (cs, c) => ({
      ...draft,
      leftChildren: cs,
      rightChildren: [c, ...draft.rightChildren],
    })),
  );

export const end: DomBuilder = (draft) =>
  A.isEmpty(draft.rightChildren) ? draft : pipe(draft, next, end);

export const start: DomBuilder = (draft) =>
  A.isEmpty(draft.leftChildren) ? draft : pipe(draft, prev, start);

// Child node operations

export const insertElement = (
  tag: Tag,
  childBuilder: DomBuilder,
): DomBuilder => (draft) =>
  pipe(tag, emptyDocument, childBuilder, (childDraft) => ({
    ...draft,
    leftChildren: [...draft.leftChildren, publish(childDraft)],
  }));

export const updateElement = (elementBuilder: DomBuilder): DomBuilder => (
  draft,
) =>
  pipe(
    draft.rightChildren,
    A.matchLeft(constant(draft), (n, ns) =>
      isElement(n)
        ? {
            ...draft,
            leftChildren: [
              ...draft.leftChildren,
              publish(elementBuilder(edit(n))),
            ],
            rightChildren: ns,
          }
        : draft,
    ),
  );

export const insertText = (data: string): DomBuilder => (draft) => ({
  ...draft,
  leftChildren: [...draft.leftChildren, { type: "Text", data }],
});

export const updateText = (data: string): DomBuilder => (draft) =>
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
  );

export const removeChild: DomBuilder = (draft) =>
  pipe(
    draft.rightChildren,
    A.matchLeft(constant(draft), (_, rightChildren) => ({
      ...draft,
      rightChildren,
    })),
  );

export const putNode: DomBuilder = (draft) => draft;

// Element operations
export const setAttribute = (name: string, value: string): DomBuilder => ({
  attributes,
  ...draft
}) => ({
  ...draft,
  attributes: { ...attributes, [name]: value },
});

export const removeAttribute = (name: string): DomBuilder => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  attributes: { [name]: _, ...attributes },
  ...draft
}) => ({
  ...draft,
  attributes,
});

export const setProp = (name: string, value: string): DomBuilder => ({
  props,
  ...draft
}) => ({
  ...draft,
  props: { ...props, [name]: value },
});

export const removeProp = (name: string): DomBuilder => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: { [name]: _, ...props },
  ...draft
}) => ({
  ...draft,
  props,
});

// export function addToken(name: string, value: string): DomBuilder {
//   return (draft) => draft;
// }

// export function removeToken(name: string, value: string): DomBuilder {
//   return (draft) => draft;
// }

export const DomBuilderMonoid: Monoid<DomBuilder> = {
  empty: identity,
  concat: (a, b) => flow(a, b),
};
