import { Cell } from "sodiumjs";
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

interface ReactInstruction {
  readonly type: "React";
  readonly cTransaction: Cell<DomTransaction>;
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
  | ReactInstruction
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
 * An instruction to push the current state onto the stack and create a new one with the current
 * focus as the parent.
 *
 * Throws an exception if the cursor is in span mode, or if it is not currently over an element.
 */
export function Push(): DomBuilderInstruction {
  return { type: "Push" };
}

/**
 * An instruction to pop a state from the stack and replace the current state with that one.
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
 * An instruction to react to a cell of transactions by running them.
 */
export function React(
  cTransaction: Cell<DomTransaction>,
): DomBuilderInstruction {
  return { type: "React", cTransaction };
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

export interface DomTransaction {
  readonly offset: number;
  readonly instructions: DomBuilderInstruction[];
}

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
  dead: boolean;
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

/*
 * Transaction handlers
 */

export function commitDomTransaction(
  rootElement: HTMLElement,
  transaction: DomTransaction,
): CleanupTask {
  const state: DomTransactionState = {
    currentParent: rootElement,
    cursor: CursorSingle(transaction.offset),
    dead: false,
    document: rootElement.ownerDocument,
    register: [],
    stack: [],
    rollbackStack: [],
  };
  try {
    const rollback = commitDomTransactionInternal(
      state,
      transaction.instructions,
    );
    return rollback;
  } finally {
    state.dead = true;
  }
}

function commitDomTransactionInternal(
  state: DomTransactionState,
  instructions: DomBuilderInstruction[],
): CleanupTask {
  const rollbackTransaction = () => {
    while (state.rollbackStack.length > 0) {
      state.rollbackStack.pop()?.();
    }
  };
  try {
    instructions.forEach((instruction) =>
      runDomBuilderInstruction(state, instruction),
    );
    return rollbackTransaction;
  } catch (e) {
    rollbackTransaction();
    throw e;
  }
}

/**
 * Run an instruction and update the state.
 */
function runDomBuilderInstruction(
  state: DomTransactionState,
  instruction: DomBuilderInstruction,
): void {
  switch (instruction.type) {
    case "InsertElement":
      runInsertElementInstruction(state, instruction.tag);
      break;
    case "InsertText":
      runInsertTextInstruction(state, instruction.content);
      break;
    case "MoveCursor":
      runMoveCursorInstruction(state, instruction.delta);
      break;
    case "MoveCursorEnd":
      runMoveCursorEndInstruction(state, instruction.delta);
      break;
    case "MoveCursorStart":
      runMoveCursorStartInstruction(state, instruction.delta);
      break;
    case "Push":
      runPushInstruction(state);
      break;
    case "Pop":
      runPopInstruction(state);
      break;
    case "Put":
      runPutInstruction(state);
      break;
    case "React":
      runReactInstruction(state, instruction.cTransaction);
      break;
    case "RemoveNode":
      runRemoveNodeInstruction(state);
      break;
    case "SetText":
      runSetTextInstruction(state, instruction.content);
      break;
  }
}

function runMoveCursorInstruction(
  state: DomTransactionState,
  delta: number,
): void {
  const { cursor } = state;
  const index = cursor.type === "Span" ? cursor.start : cursor.index;
  const newIndex = movePosition(state, index, delta);
  if (cursor.type === "Single") {
    cursor.index = newIndex;
  } else {
    state.cursor = CursorSingle(newIndex);
  }
}

function runMoveCursorEndInstruction(
  state: DomTransactionState,
  delta: number,
): void {
  const { cursor } = state;
  const start = cursor.type === "Span" ? cursor.start : cursor.index;
  const end = cursor.type === "Span" ? cursor.end : cursor.index;
  const movedEnd = movePosition(state, end, delta);
  const newStart = Math.min(start, movedEnd);
  const newEnd = Math.max(start, movedEnd);
  if (cursor.type === "Single") {
    state.cursor = CursorSpan(newStart, newEnd);
  } else {
    cursor.start = newStart;
    cursor.end = newEnd;
  }
}

function runMoveCursorStartInstruction(
  state: DomTransactionState,
  delta: number,
): void {
  const { cursor } = state;
  const start = cursor.type === "Span" ? cursor.start : cursor.index;
  const end = cursor.type === "Span" ? cursor.end : cursor.index;
  const movedStart = movePosition(state, start, delta);
  const newStart = Math.min(end, movedStart);
  const newEnd = Math.max(end, movedStart);
  if (cursor.type === "Single") {
    state.cursor = CursorSpan(newStart, newEnd);
  } else {
    cursor.start = newStart;
    cursor.end = newEnd;
  }
}

function runInsertElementInstruction(
  state: DomTransactionState,
  tag: Tag,
): void {
  const { document } = state;
  const element = document.createElement(tag);
  runInsert(state, [element]);
}

function runInsertTextInstruction(
  state: DomTransactionState,
  content: string,
): void {
  const { document } = state;
  const text = document.createTextNode(content);
  runInsert(state, [text]);
}

function runSetTextInstruction(
  state: DomTransactionState,
  content: string,
): void {
  const { currentParent, cursor } = state;
  if (cursor.type === "Span") {
    throw new Error("Cannot set text when cursor is in span mode");
  }
  const text = currentParent.childNodes[cursor.index];
  if (!(text instanceof Text)) {
    throw new Error("Cannot set text on a non-text node");
  }
  text.textContent = content;
}

function runPushInstruction(state: DomTransactionState): void {
  const { currentParent, cursor, stack } = state;
  if (cursor.type === "Span") {
    throw new Error("Cannot push state when cursor is in span mode");
  }
  const element = currentParent.childNodes[cursor.index];
  if (!(element instanceof HTMLElement)) {
    throw new Error("Cannot push state when focused on a non-element node");
  }
  stack.push({ ...state });
  state.currentParent = element;
  state.cursor = CursorSingle(0);
}

function runPopInstruction(state: DomTransactionState): void {
  const { stack } = state;
  const newContext = stack.pop();
  if (newContext === undefined) {
    throw new Error("Cannot pop state when stack is empty");
  }
  state.currentParent = newContext.currentParent;
  state.cursor = newContext.cursor;
}

function runPutInstruction(state: DomTransactionState): void {
  const { register } = state;
  state.register = [];
  runInsert(state, register);
}

function runReactInstruction(
  state: DomTransactionState,
  cTransaction: Cell<DomTransaction>,
): void {
  const { currentParent, document, rollbackStack } = state;
  const rollbacks: CleanupTask[] = [];
  rollbackStack.push(
    cTransaction.listen((transaction) => {
      const subState: DomTransactionState = state.dead
        ? {
            dead: false,
            currentParent,
            rollbackStack: [],
            register: [],
            cursor: CursorSingle(transaction.offset),
            stack: [],
            document,
          }
        : state;
      rollbacks.push(
        commitDomTransactionInternal(subState, transaction.instructions),
      );
    }),
  );
  rollbackStack.push(() => {
    while (rollbacks.length > 0) {
      rollbacks.pop()?.();
    }
  });
}

function runRemoveNodeInstruction(state: DomTransactionState): void {
  const { currentParent, cursor, rollbackStack } = state;
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
    state.register = newRegister;
  }
  state.cursor = CursorSingle(start);
}

function runInsert(state: DomTransactionState, nodes: Node[]): void {
  const { currentParent, cursor, rollbackStack } = state;
  if (cursor.type === "Single") {
    const nodeUnderCursor = currentParent.childNodes[cursor.index] ?? null;
    nodes.forEach((node) => currentParent.insertBefore(node, nodeUnderCursor));
    rollbackStack.push(() =>
      nodes.forEach((node) => currentParent.removeChild(node)),
    );
  } else {
    runRemoveNodeInstruction(state);
    runInsert(state, nodes);
  }
}

function movePosition(
  state: DomTransactionState,
  position: number,
  delta: number,
): number {
  const { currentParent } = state;
  return Math.max(
    0,
    Math.min(currentParent.childNodes.length, Math.floor(position + delta)),
  );
}
