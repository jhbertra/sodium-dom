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

interface SetTextInstruction {
  readonly type: "SetText";
  readonly content: string;
}

interface RemoveNodeInstruction {
  readonly type: "RemoveNode";
}

interface MoveCursorEndInstruction {
  readonly type: "MoveCursorEnd";
  readonly delta: number;
}

interface MoveCursorInstruction {
  readonly type: "MoveCursor";
  readonly delta: number;
}

interface MoveCursorStartInstruction {
  readonly type: "MoveCursorStart";
  readonly delta: number;
}

/**
 * An instruction to update the DOM builder's state.
 */
export type DomBuilderInstruction =
  | MoveCursorEndInstruction
  | MoveCursorInstruction
  | MoveCursorStartInstruction
  | InsertElementInstruction
  | InsertTextInstruction
  | SetTextInstruction
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
 * An instruction to move the end of the cursor.
 *
 * The cursor is clamped to the range [cursorStart, currentParent.childNodes.length].
 * If the end would end up before the start, the start is moved to that position and
 * the end is moved to the current start.
 */
export function MoveCursorEnd(delta: number): DomBuilderInstruction {
  return { type: "MoveCursorEnd", delta };
}

/**
 * An instruction to move the start of the cursor.
 *
 * The cursor is clamped to the range [cursorStart, currentParent.childNodes.length].
 * If the end would end up before the start, the start is moved to that position and
 * the end is moved to the current start.
 */
export function MoveCursorStart(delta: number): DomBuilderInstruction {
  return { type: "MoveCursorStart", delta };
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
 * An instruction to set the content of the text node under the cursor.
 *
 * Throws an exception if the cursor is in span mode, or if it is not currently over a text node.
 */
export function SetText(content: string): DomBuilderInstruction {
  return { type: "SetText", content };
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

interface CursorSingle {
  readonly type: "Single";
  index: number;
}

interface CursorSpan {
  readonly type: "Span";
  start: number;
  end: number;
}

type Cursor = CursorSingle | CursorSpan;

function CursorSingle(index: number): Cursor {
  return { type: "Single", index };
}

function CursorSpan(start: number, end: number): Cursor {
  return { type: "Span", start, end };
}

/**
 * The state of a DOM builder.
 */
interface DomBuilderContext {
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

class InternalDomBuilderException extends Error {
  constructor(message: string, public readonly context: DomBuilderContext) {
    super(message);
  }
}

export class DomBuilderException extends InternalDomBuilderException {
  constructor(
    message: string,
    public readonly context: DomBuilderContext,
    public readonly instructions: DomBuilderInstruction[],
  ) {
    super(message, context);
  }
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
  try {
    instructions.forEach((instruction) =>
      runDomBuilderInstruction(context, instruction),
    );
  } catch (e) {
    if (e instanceof InternalDomBuilderException) {
      throw new DomBuilderException(e.message, context, instructions);
    }
    throw e;
  }
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
    case "MoveCursorEnd":
      runMoveCursorEnd(context, instruction.delta);
      break;
    case "MoveCursorStart":
      runMoveCursorStart(context, instruction.delta);
      break;
    case "InsertElement":
      runInsertElementInstruction(context, instruction.tag);
      break;
    case "InsertText":
      runInsertTextInstruction(context, instruction.content);
      break;
    case "SetText":
      runSetTextInstruction(context, instruction.content);
      break;
    case "RemoveNode":
      runRemoveNodeInstruction(context);
      break;
  }
}

function runMoveCursor(context: DomBuilderContext, delta: number): void {
  const { cursor } = context;
  const index = cursor.type === "Span" ? cursor.start : cursor.index;
  const newIndex = movePosition(context, index, delta);
  if (cursor.type === "Single") {
    cursor.index = newIndex;
  } else {
    context.cursor = CursorSingle(newIndex);
  }
}

function runMoveCursorEnd(context: DomBuilderContext, delta: number): void {
  const { cursor } = context;
  const start = cursor.type === "Span" ? cursor.start : cursor.index;
  const end = cursor.type === "Span" ? cursor.end : cursor.index;
  const movedEnd = movePosition(context, end, delta);
  const newStart = Math.min(start, movedEnd);
  const newEnd = Math.max(start, movedEnd);
  if (cursor.type === "Single") {
    context.cursor = CursorSpan(newStart, newEnd);
  } else {
    cursor.start = newStart;
    cursor.end = newEnd;
  }
}

function runMoveCursorStart(context: DomBuilderContext, delta: number): void {
  const { cursor } = context;
  const start = cursor.type === "Span" ? cursor.start : cursor.index;
  const end = cursor.type === "Span" ? cursor.end : cursor.index;
  const movedStart = movePosition(context, start, delta);
  const newStart = Math.min(end, movedStart);
  const newEnd = Math.max(end, movedStart);
  if (cursor.type === "Single") {
    context.cursor = CursorSpan(newStart, newEnd);
  } else {
    cursor.start = newStart;
    cursor.end = newEnd;
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

function runSetTextInstruction(
  context: DomBuilderContext,
  content: string,
): void {
  const { currentParent, cursor } = context;
  if (cursor.type === "Span") {
    throw new InternalDomBuilderException(
      "Cannot set text when cursor is in span mode",
      context,
    );
  }
  const text = currentParent.childNodes[cursor.index];
  if (!(text instanceof Text)) {
    throw new InternalDomBuilderException(
      "Cannot set text on a non-text node",
      context,
    );
  }
  text.textContent = content;
}

function runRemoveNodeInstruction(context: DomBuilderContext): void {
  const { currentParent, cursor } = context;
  const newRegister = [];
  const start = cursor.type === "Single" ? cursor.index : cursor.start;
  const end = cursor.type === "Single" ? cursor.index : cursor.end;
  for (let i = start; i <= end; ++i) {
    const nodeUnderCursor = currentParent.childNodes[start];
    nodeUnderCursor?.remove();
    if (nodeUnderCursor) {
      newRegister.push(nodeUnderCursor);
    }
  }
  if (newRegister.length > 0) {
    context.register = newRegister;
  }
  context.cursor = CursorSingle(start);
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

function movePosition(
  context: DomBuilderContext,
  position: number,
  delta: number,
): number {
  const { currentParent } = context;
  return Math.max(
    0,
    Math.min(currentParent.childNodes.length, Math.floor(position + delta)),
  );
}
