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

export const insertChild = (tag: Tag) => (
  childBuilder: DomBuilder,
): DomBuilder => (draft) =>
  pipe(tag, emptyDocument, childBuilder, (childDraft) => ({
    ...draft,
    leftChildren: [...draft.leftChildren, publish(childDraft)],
  }));

// export function updateElement(elementBuilder: DraftElement): DomBuilder {
//   return (draft) => draft;
// }

// export function appendText(data: string): DomBuilder {
//   return (draft) => draft;
// }

// export function updateText(data: string): DomBuilder {
//   return (draft) => draft;
// }

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

// export function setAttribute(name: string, value: string): DomBuilder {
//   return (draft) => draft;
// }

// export function setAttributeNS(
//   namespace: string,
//   name: string,
//   value: string,
// ): DomBuilder {
//   return (draft) => draft;
// }

// export function setProp(name: string, value: string): DomBuilder {
//   return (draft) => draft;
// }

// export function addToken(name: string, value: string): DomBuilder {
//   return (draft) => draft;
// }

// export function removeAttribute(name: string, value: string): DomBuilder {
//   return (draft) => draft;
// }

// export function removeAttributeNS(
//   namespace: string,
//   name: string,
//   value: string,
// ): DomBuilder {
//   return (draft) => draft;
// }

// export function removeProp(name: string, value: string): DomBuilder {
//   return (draft) => draft;
// }

// export function addToken(name: string, value: string): DomBuilder {
//   return (draft) => draft;
// }

export const DomBuilderMonoid: Monoid<DomBuilder> = {
  empty: identity,
  concat: (a, b) => flow(a, b),
};
