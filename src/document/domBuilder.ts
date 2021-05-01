import { Tag } from "./core";

/**
 * An instruction to insert an element into the DOM.
 *
 * It will insert a new element at the current index of the child list of the current element.
 * If there is already a node at this index, the new element will be placed before it.
 */
export interface InsertElementInstruction {
  readonly type: "InsertElement";
  readonly tag: Tag;
}

/**
 * An instruction to update the DOM builder's state.
 */
export type DomBuilderInstruction = InsertElementInstruction;

/**
 * Create an InsertElementInstruction
 */
export function InsertElement(tag: Tag): DomBuilderInstruction {
  return { type: "InsertElement", tag };
}

/**
 * The state of a DOM builder.
 */
export interface DomBuilderContext {
  /**
   * The index currently under focus.
   */
  currentIndex: number;
  /**
   * The current element which nodes will be appended to as children.
   */
  currentElement: HTMLElement;
  /**
   * The document.
   */
  document: Document;
}

/**
 * Run an instruction and update the context.
 */
export function runDomBuilderInstruction(
  context: DomBuilderContext,
  instruction: DomBuilderInstruction,
): void {
  switch (instruction.type) {
    case "InsertElement":
      runInsertInstruction(context, instruction.tag);
  }
}

function runInsertInstruction(context: DomBuilderContext, tag: Tag): void {
  const { document, currentElement, currentIndex } = context;
  const element = document.createElement(tag);
  const nodeAtIndex = currentElement.childNodes[currentIndex] ?? null;
  currentElement.insertBefore(element, nodeAtIndex);
}
