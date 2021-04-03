import { Cell, Operational, Transaction, Unit } from "sodiumjs";

// Public API

export interface DomBuilder {
  text(text: string | Cell<string>): Unit;
}

export type Widget<T> = (builder: DomBuilder) => T;

export function renderWidget<T>(
  rootElement: HTMLElement,
  widget: Widget<T>,
): T {
  return Transaction.run(() => {
    const { complete, dispose, ...builder } = DocumentDomBuilder(rootElement);
    try {
      const result = widget(builder);
      complete();
      return result;
    } catch (e) {
      dispose();
      throw e;
    }
  });
}

export function mainWidget(widget: Widget<void>): void {
  return renderWidget(document.body, widget);
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

  // Private methods
  const append = <T extends Node>(
    node: () => T,
    dispose?: (node: T) => () => void,
  ) => {
    if (isDisposed) {
      throw new Error("This appender has been disposed");
    }
    if (!isAppending) {
      throw new Error("This appender may no longer be appended to");
    }
    const n = node();
    root.appendChild(n);
    if (dispose) {
      disposers.push(dispose(n));
    }
  };

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
      if (typeof text === "string") {
        append(() => document.createTextNode(text));
      } else {
        append(
          () => document.createTextNode(text.sample()),
          (node) =>
            Operational.updates(text).listen((s) => {
              node.textContent = s;
            }),
        );
      }
      return Unit.UNIT;
    },
  };
}
