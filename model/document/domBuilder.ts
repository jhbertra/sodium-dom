/**
 * @description An inefficient semantic reference model for building a DOM.
 */

import { Endomorphism, flow, identity } from "fp-ts/lib/function";
import * as Md from "fp-ts/lib/Monoid";
import { Tag } from "../../src/document/core";
import { DraftElement, Element, publish } from "./Document";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export type DomBuilder = Endomorphism<DraftElement>;

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const insertElement = (tag: Tag) => (
  childBuilder: DomBuilder,
): DomBuilder => (draft) => ({
  ...draft,
  leftChildren: [...draft.leftChildren, run(tag)(childBuilder)],
});

export const insertText = (data: string): DomBuilder => (draft) => ({
  ...draft,
  leftChildren: [...draft.leftChildren, { type: "Text", data }],
});

export const setAttribute = (name: string) => (value: string): DomBuilder => ({
  attributes,
  ...draft
}) => ({
  ...draft,
  attributes: { ...attributes, [name]: value },
});

export const setProp = (name: string) => (value: string): DomBuilder => ({
  props,
  ...draft
}) => ({
  ...draft,
  props: { ...props, [name]: value },
});

export const setStyle = (name: string) => (value: string): DomBuilder => ({
  style,
  ...draft
}) => ({
  ...draft,
  style: { ...style, [name]: value },
});

export const addToken = (name: string) => (value: string): DomBuilder =>
  name === "classList"
    ? ({ classList, ...draft }) => ({
        ...draft,
        classList: { ...classList, [value]: undefined },
      })
    : identity;

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const Monoid: Md.Monoid<DomBuilder> = {
  empty: identity,
  concat: (x, y) => flow(x, y),
};

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

export const run = (tag: Tag) => (builder: DomBuilder): Element => {
  return publish(
    builder({
      attributes: {},
      classList: {},
      leftChildren: [],
      props: {},
      rightChildren: [],
      style: {},
      tag,
    }),
  );
};
