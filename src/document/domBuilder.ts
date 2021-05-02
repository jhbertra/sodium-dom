import { Tag } from "./core";

/*
 * Instruction types
 */

interface InsertElementInstruction {
  readonly type: "InsertElement";
  readonly tag: Tag;
}

interface InsertTextInstruction {
  readonly type: "InsertText";
  readonly content: string;
}

interface RemoveNodeInstruction {
  readonly type: "RemoveNode";
}

interface MoveCursorInstruction {
  readonly type: "MoveCursor";
  readonly delta: number;
}

/**
 * An instruction to update the DOM builder's state.
 */
export type DomBuilderInstruction =
  | MoveCursorInstruction
  | InsertElementInstruction
  | InsertTextInstruction
  | RemoveNodeInstruction;

/**
 * An instruction to move the cursor.
 *
 * The cursor is clamped to the range [0, currentParent.childNodes.length].
 *
 * Always resets the cursor to single mode.
 */
export function MoveCursor(delta: number): DomBuilderInstruction {
  return { type: "MoveCursor", delta };
}

/**
 * An instruction to insert an element into the DOM.
 *
 * It will insert a new element under the cursor of the child list of the current element.
 * If there is already a node under the cursor, the new element will be placed before it.
 *
 * Always resets the cursor to single mode.
 */
export function InsertElement(tag: Tag): DomBuilderInstruction {
  return { type: "InsertElement", tag };
}

/**
 * An instruction to insert a text node into the DOM.
 *
 * It will insert the text node under the cursor of the child list of the current element.
 * If there is already a node under the cursor, the new text node will be placed before it.
 *
 * Always resets the cursor to single mode.
 */
export function InsertText(content: string): DomBuilderInstruction {
  return { type: "InsertText", content };
}

/**
 * An instruction to remove a node from the DOM.
 *
 * If there is no node under the cursor in the current element's child list, nothing will be changed.
 *
 * Always resets the cursor to single mode.
 */
export function RemoveNode(): DomBuilderInstruction {
  return { type: "RemoveNode" };
}

/*
 * State types
 */

export interface CursorSingle {
  readonly type: "Single";
  index: number;
}

export interface CursorSpan {
  readonly type: "Span";
  start: number;
  end: number;
}

export type Cursor = CursorSingle | CursorSpan;

export function CursorSingle(index: number): Cursor {
  return { type: "Single", index };
}

export function CursorSpan(start: number, end: number): Cursor {
  return { type: "Span", start, end };
}

/**
 * The state of a DOM builder.
 */
export interface DomBuilderContext {
  /**
   * The the child or children currently under focus.
   */
  cursor: Cursor;
  /**
   * The element whose child nodes are being traversed.
   */
  currentParent: HTMLElement;
  /**
   * The document.
   */
  document: Document;
  /**
   * A collection of nodes that can be held in reserve to be put elsewhere.
   */
  register: Node[];
}

/*
 * Instruction handlers
 */

export function runDomBuilderInstructions(
  rootElement: HTMLElement,
  startAt: number,
  instructions: DomBuilderInstruction[],
): void {
  const context: DomBuilderContext = {
    register: [],
    document: rootElement.ownerDocument,
    currentParent: rootElement,
    cursor: CursorSingle(startAt),
  };
  instructions.forEach((instruction) =>
    runDomBuilderInstruction(context, instruction),
  );
}

/**
 * Run an instruction and update the context.
 */
function runDomBuilderInstruction(
  context: DomBuilderContext,
  instruction: DomBuilderInstruction,
): void {
  switch (instruction.type) {
    case "MoveCursor":
      runMoveCursor(context, instruction.delta);
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

function runMoveCursor(context: DomBuilderContext, delta: number): void {
  const { currentParent, cursor } = context;
  const currentIndex = cursor.type === "Span" ? cursor.start : cursor.index;
  const newIndex = Math.max(
    0,
    Math.min(currentParent.childNodes.length, Math.floor(currentIndex + delta)),
  );
  if (cursor.type === "Single") {
    cursor.index = newIndex;
  } else {
    context.cursor = CursorSingle(newIndex);
  }
}

function runInsertElementInstruction(
  context: DomBuilderContext,
  tag: Tag,
): void {
  const { document } = context;
  const element = document.createElement(tag);
  runInsert(context, element);
}

function runInsertTextInstruction(
  context: DomBuilderContext,
  content: string,
): void {
  const { document } = context;
  const text = document.createTextNode(content);
  runInsert(context, text);
}

function runRemoveNodeInstruction(context: DomBuilderContext): void {
  const { currentParent, cursor } = context;
  const newRegister = [];
  const start = cursor.type === "Single" ? cursor.index : cursor.start;
  const end = cursor.type === "Single" ? cursor.index : cursor.end;
  for (let i = start; i <= end; ++i) {
    const nodeUnderCursor = currentParent.childNodes[i];
    nodeUnderCursor?.remove();
    if (nodeUnderCursor) {
      newRegister.push(nodeUnderCursor);
    }
  }
  if (newRegister.length > 0) {
    context.register = newRegister;
  }
}

function runInsert(context: DomBuilderContext, node: Node): void {
  const { currentParent, cursor } = context;
  if (cursor.type === "Single") {
    const nodeUnderCursor = currentParent.childNodes[cursor.index] ?? null;
    currentParent.insertBefore(node, nodeUnderCursor);
  } else {
    runRemoveNodeInstruction(context);
    runInsert(context, node);
  }
}
