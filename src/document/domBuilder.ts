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
 * An instruction to insert a text node into the DOM.
 *
 * It will insert the text node at the current index of the child list of the current element.
 * If there is already a node at this index, the new text node will be placed before it.
 */
export interface InsertTextInstruction {
  readonly type: "InsertText";
  readonly content: string;
}

/**
 * An instruction to remove a node from the DOM.
 *
 * If there is no node at the current index in the current element's child list, nothing will be changed.
 */
export interface RemoveNodeInstruction {
  readonly type: "RemoveNode";
}

/**
 * An instruction to increment the current index by 1.
 *
 * If the current index already equals currentElement.childList.length, this is a no-op.
 */
export interface IncrementIndexInstruction {
  readonly type: "IncrementIndex";
}

/**
 * An instruction to update the DOM builder's state.
 */
export type DomBuilderInstruction =
  | IncrementIndexInstruction
  | InsertElementInstruction
  | InsertTextInstruction
  | RemoveNodeInstruction;

/**
 * Create a IncrementIndexInstruction
 */
export function IncrementIndex(): DomBuilderInstruction {
  return { type: "IncrementIndex" };
}

/**
 * Create an InsertElementInstruction
 */
export function InsertElement(tag: Tag): DomBuilderInstruction {
  return { type: "InsertElement", tag };
}

/**
 * Create an InsertTextInstruction
 */
export function InsertText(content: string): DomBuilderInstruction {
  return { type: "InsertText", content };
}

/**
 * Create a RemoveNodeInstruction
 */
export function RemoveNode(): DomBuilderInstruction {
  return { type: "RemoveNode" };
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
    case "IncrementIndex":
      runIncrementIndex(context);
      break;
    case "InsertElement":
      runInsertElementInstruction(context, instruction.tag);
      break;
    case "InsertText":
      runInsertTextInstruction(context, instruction.content);
      break;
    case "RemoveNode":
      runRemoveNodeInstruction(context);
      break;
  }
}

function runIncrementIndex(context: DomBuilderContext): void {
  const { currentElement, currentIndex } = context;
  context.currentIndex = Math.min(
    currentElement.childNodes.length,
    currentIndex + 1,
  );
}

function runInsertElementInstruction(
  context: DomBuilderContext,
  tag: Tag,
): void {
  const { document, currentElement, currentIndex } = context;
  const element = document.createElement(tag);
  const nodeAtIndex = currentElement.childNodes[currentIndex] ?? null;
  currentElement.insertBefore(element, nodeAtIndex);
}

function runInsertTextInstruction(
  context: DomBuilderContext,
  content: string,
): void {
  const { document, currentElement, currentIndex } = context;
  const text = document.createTextNode(content);
  const nodeAtIndex = currentElement.childNodes[currentIndex] ?? null;
  currentElement.insertBefore(text, nodeAtIndex);
}

function runRemoveNodeInstruction(context: DomBuilderContext): void {
  const { currentElement, currentIndex } = context;
  const nodeAtIndex = currentElement.childNodes[currentIndex] ?? null;
  nodeAtIndex?.remove();
}
