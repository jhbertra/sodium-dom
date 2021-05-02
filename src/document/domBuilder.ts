import { CleanupTask } from "../utils";
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

interface PushInstruction {
  readonly type: "Push";
}

interface PopInstruction {
  readonly type: "Pop";
}

interface PutInstruction {
  readonly type: "Put";
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
  | PushInstruction
  | PopInstruction
  | PutInstruction
  | RemoveNodeInstruction
  | SetTextInstruction;

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
 * An instruction to push the current context onto the stack and create a new one with the current
 * focus as the parent.
 *
 * Throws an exception if the cursor is in span mode, or if it is not currently over an element.
 */
export function Push(): DomBuilderInstruction {
  return { type: "Push" };
}

/**
 * An instruction to pop a context from the stack and replace the current context with that one.
 *
 * Throws an exception if the stack is empty.
 */
export function Pop(): DomBuilderInstruction {
  return { type: "Pop" };
}

/**
 * An instruction to put the contents of the register at the cursor position.
 */
export function Put(): DomBuilderInstruction {
  return { type: "Put" };
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
 * The state of a DOM builder while executing a transaction.
 */
interface DomTransactionState {
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
  readonly document: Document;
  /**
   * A collection of nodes that can be held in reserve to be put elsewhere.
   */
  register: Node[];
  /**
   * The stack of contexts created by descending into child elements.
   */
  readonly stack: DomTransactionState[];
  /**
   * A collection of cleanup tasks which will revert the DOM to the state it was
   * in before the transaction was run.
   */
  readonly rollbackStack: CleanupTask[];
}

class InternalDomBuilderException extends Error {
  constructor(message: string, public readonly context: DomTransactionState) {
    super(message);
  }
}

export class DomBuilderException extends InternalDomBuilderException {
  constructor(
    message: string,
    public readonly context: DomTransactionState,
    public readonly instructions: DomBuilderInstruction[],
  ) {
    super(message, context);
  }
}

/*
 * Transaction handlers
 */

export function commitDomTransaction(
  rootElement: HTMLElement,
  startAt: number,
  instructions: DomBuilderInstruction[],
): CleanupTask {
  const context: DomTransactionState = {
    currentParent: rootElement,
    cursor: CursorSingle(startAt),
    document: rootElement.ownerDocument,
    register: [],
    stack: [],
    rollbackStack: [],
  };
  const rollbackTransaction = () => {
    while (context.rollbackStack.length > 0) {
      context.rollbackStack.pop()?.();
    }
  };
  try {
    instructions.forEach((instruction) =>
      runDomBuilderInstruction(context, instruction),
    );
    return rollbackTransaction;
  } catch (e) {
    rollbackTransaction();
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
  context: DomTransactionState,
  instruction: DomBuilderInstruction,
): void {
  switch (instruction.type) {
    case "InsertElement":
      runInsertElementInstruction(context, instruction.tag);
      break;
    case "InsertText":
      runInsertTextInstruction(context, instruction.content);
      break;
    case "MoveCursor":
      runMoveCursorInstruction(context, instruction.delta);
      break;
    case "MoveCursorEnd":
      runMoveCursorEndInstruction(context, instruction.delta);
      break;
    case "MoveCursorStart":
      runMoveCursorStartInstruction(context, instruction.delta);
      break;
    case "Push":
      runPushInstruction(context);
      break;
    case "Pop":
      runPopInstruction(context);
      break;
    case "Put":
      runPutInstruction(context);
      break;
    case "RemoveNode":
      runRemoveNodeInstruction(context);
      break;
    case "SetText":
      runSetTextInstruction(context, instruction.content);
      break;
  }
}

function runMoveCursorInstruction(
  context: DomTransactionState,
  delta: number,
): void {
  const { cursor } = context;
  const index = cursor.type === "Span" ? cursor.start : cursor.index;
  const newIndex = movePosition(context, index, delta);
  if (cursor.type === "Single") {
    cursor.index = newIndex;
  } else {
    context.cursor = CursorSingle(newIndex);
  }
}

function runMoveCursorEndInstruction(
  context: DomTransactionState,
  delta: number,
): void {
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

function runMoveCursorStartInstruction(
  context: DomTransactionState,
  delta: number,
): void {
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
  context: DomTransactionState,
  tag: Tag,
): void {
  const { document } = context;
  const element = document.createElement(tag);
  runInsert(context, [element]);
}

function runInsertTextInstruction(
  context: DomTransactionState,
  content: string,
): void {
  const { document } = context;
  const text = document.createTextNode(content);
  runInsert(context, [text]);
}

function runSetTextInstruction(
  context: DomTransactionState,
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

function runPushInstruction(context: DomTransactionState): void {
  const { currentParent, cursor, stack } = context;
  if (cursor.type === "Span") {
    throw new InternalDomBuilderException(
      "Cannot push context when cursor is in span mode",
      context,
    );
  }
  const element = currentParent.childNodes[cursor.index];
  if (!(element instanceof HTMLElement)) {
    throw new InternalDomBuilderException(
      "Cannot push context when focused on a non-element node",
      context,
    );
  }
  stack.push({ ...context });
  context.currentParent = element;
  context.cursor = CursorSingle(0);
}

function runPopInstruction(context: DomTransactionState): void {
  const { stack } = context;
  const newContext = stack.pop();
  if (newContext === undefined) {
    throw new InternalDomBuilderException(
      "Cannot pop context when stack is empty",
      context,
    );
  }
  context.currentParent = newContext.currentParent;
  context.cursor = newContext.cursor;
}

function runPutInstruction(context: DomTransactionState): void {
  const { register } = context;
  context.register = [];
  runInsert(context, register);
}

function runRemoveNodeInstruction(context: DomTransactionState): void {
  const { currentParent, cursor, rollbackStack } = context;
  const newRegister = [];
  const start = cursor.type === "Single" ? cursor.index : cursor.start;
  const end = cursor.type === "Single" ? cursor.index : cursor.end;
  for (let i = start; i <= end; ++i) {
    const nodeUnderCursor = currentParent.childNodes[start];
    nodeUnderCursor?.remove();
    if (nodeUnderCursor) {
      rollbackStack.push(() =>
        currentParent.insertBefore(
          nodeUnderCursor,
          currentParent.childNodes[start] ?? null,
        ),
      );
      newRegister.push(nodeUnderCursor);
    }
  }
  if (newRegister.length > 0) {
    context.register = newRegister;
  }
  context.cursor = CursorSingle(start);
}

function runInsert(context: DomTransactionState, nodes: Node[]): void {
  const { currentParent, cursor, rollbackStack } = context;
  if (cursor.type === "Single") {
    const nodeUnderCursor = currentParent.childNodes[cursor.index] ?? null;
    nodes.forEach((node) => currentParent.insertBefore(node, nodeUnderCursor));
    rollbackStack.push(() =>
      nodes.forEach((node) => currentParent.removeChild(node)),
    );
  } else {
    runRemoveNodeInstruction(context);
    runInsert(context, nodes);
  }
}

function movePosition(
  context: DomTransactionState,
  position: number,
  delta: number,
): number {
  const { currentParent } = context;
  return Math.max(
    0,
    Math.min(currentParent.childNodes.length, Math.floor(position + delta)),
  );
}
