/**
 * @description An inefficient semantic reference model for building a DOM.
 */

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

export interface DraftElement {
  readonly tag: Tag;
  readonly props: Record<string, string>;
  readonly attributes: Record<string, string>;
  readonly style: Record<string, string>;
  readonly leftChildren: Node[];
  readonly rightChildren: Node[];
  readonly classList: Record<string, undefined>;
}

export function publish(draft: DraftElement): Element {
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

export function edit(element: Element): DraftElement {
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
