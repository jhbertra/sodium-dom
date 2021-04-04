import { Cell, Operational, Transaction, Unit } from "sodiumjs";
import { Attributes } from "./Attributes";
import { El } from "./El";

// Public API

export interface DomBuilder {
  text(text: string | Cell<string>): Unit;
  el<T>(tag: string, attr: Attributes, children?: Widget<T>): [El, T];
}

export type Widget<T> = (builder: DomBuilder) => T;

export function renderWidget<T>(
  rootElement: HTMLElement,
  widget: Widget<T>,
): [T, () => void] {
  return Transaction.run(() => {
    const { complete, dispose, ...builder } = DocumentDomBuilder(rootElement);
    try {
      const result = widget(builder);
      complete();
      return [result, dispose];
    } catch (e) {
      dispose();
      throw e;
    }
  });
}

export function mainWidget(widget: Widget<void>): void {
  return renderWidget(document.body, widget)[0];
}

// Internal API

interface DomBuilderInternal extends DomBuilder {
  complete: () => Unit;
  dispose: () => Unit;
}

function DocumentDomBuilder(root: HTMLElement): DomBuilderInternal {
  // Local state
  const document = root.ownerDocument;
  const disposers: (() => void)[] = [];
  let isDisposed = false;
  let isAppending = true;
  let isAppendingChild = false;

  // Private methods
  function append<T extends Node>(
    node: () => T,
    handleNode?: (node: T) => () => void,
  ): void;
  function append<T extends Node, A>(
    node: () => T,
    handleNode: (node: T) => [A] | [A, () => void],
  ): A;
  function append<T extends Node, A>(
    node: () => T,
    handleNode?: (node: T) => (() => void) | [A] | [A, () => void],
  ): A | void {
    if (isDisposed) {
      throw new Error("This appender has been disposed");
    }
    if (!isAppending) {
      throw new Error("This appender may no longer be appended to");
    }
    if (isAppendingChild) {
      throw new Error(
        "Parent DOM builder called from a child widget - did you accidentally call a method on the wrong builder?",
      );
    }
    const n = node();
    root.appendChild(n);

    if (handleNode) {
      const handleResult = handleNode(n);
      const disposer =
        typeof handleResult === "function" ? handleResult : handleResult[1];
      if (disposer) {
        disposers.push(disposer);
      }
      if (Array.isArray(handleResult)) {
        return handleResult[0];
      }
    }
  }

  function bind<T>(value: T | Cell<T>, doBind: (v: T) => void) {
    if (value instanceof Cell) {
      doBind(value.sample());
      disposers.push(Operational.updates(value).listen(doBind));
    } else {
      doBind(value);
    }
  }

  return {
    // Internal methods
    complete() {
      isAppending = false;
      return Unit.UNIT;
    },

    dispose() {
      for (const disposer of disposers) {
        disposer();
      }
      isDisposed = true;
      return Unit.UNIT;
    },

    // Public methods
    text(text) {
      append<Text, void>(
        () => document.createTextNode(""),
        (node) => [bind(text, (value) => (node.textContent = value))],
      );
      return Unit.UNIT;
    },
    el<T>(tag: string, attr: Attributes, children: Widget<T>): [El, T] {
      return append<HTMLElement, [El, T]>(
        () => document.createElement(tag),
        (element) => {
          for (const key of Object.keys(attr)) {
            bind(attr[key] as string | Cell<string>, (value) =>
              element.setAttribute(key, value),
            );
          }

          isAppendingChild = true;
          const [childrenResult, disposeChildren] = renderWidget(
            element,
            children,
          );
          isAppendingChild = false;
          return [
            [
              {
                element,
                events: {},
              },
              childrenResult,
            ],
            disposeChildren,
          ];
        },
      );
    },
  };
}
