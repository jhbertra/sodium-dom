import { Cell, Operational, Transaction, Unit } from "sodiumjs";

// Public API

/**
 * An attribute value can either be a static or a dynamic string.
 */
export type AttributeValue = string | Cell<string>;

/**
 * A map of attribute names to values.
 */
export type Attributes = Record<string, AttributeValue>;

/**
 * A record containing the set of events available for each DOM element.
 */
export interface DomEvents {}

export interface El {
  readonly element: HTMLElement;
  readonly events: DomEvents;
}

/**
 * A "widget" is just a parameterless function that returns some result, where the
 * following rules apply:
 *
 * 1. Widgets can call other widgets directly.
 * 2. Widgets can call DOM-building functions like text, el.
 * 3. The top / app-level widget should be passed as an argument to a widget rendering
 *    function sich as `mainWidget` or `renderWidget`.
 */
export type Widget<T> = () => T;

/**
 * Render a widget in the `body` element of the current document.
 *
 * @param widget the top-level widget of your application.
 */
export function mainWidget(widget: Widget<void>): void {
  return renderWidget(document.body, widget);
}

/**
 * Render a widget inside a specific rootElement.
 *
 * @param rootElement an HTML element that will contain your application's DOM structure.
 * @param widget the top-level widget of your application.
 */
export function renderWidget(
  rootElement: HTMLElement,
  widget: Widget<void>,
): void {
  return renderWidgetInternal(DomBuilder(rootElement), widget);
}

/**
 * Appends a text node to the current document element.
 *
 * WARNING - must be called witin a widget.
 *
 * @param value the static or dynamic string value to render inside the text node.
 */
export function text(value: string | Cell<string>): Unit {
  return withCurrentBuilder("text", (builder) => builder.text(value));
}

/**
 * Appends an element node to the current document element.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 */
export function el(tagName: string): El;

/**
 * Appends an element node to the current document element with a className.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param className the class name(s) to add to the element. Can be a static or dynamic value.
 */
export function el(tagName: string, className: string | Cell<string>): El;

/**
 * Appends an element node to the current document element with a set of attributes.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param attributes a map of name / value attributes to add to the element. The valyes can be static or dynamic values.
 */
export function el(tagName: string, attributes: Attributes): El;

/**
 * Appends an element node to the current document element containing a child widget.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param children a child widget to render inside this element.
 */
export function el<T>(tagName: string, children: Widget<T>): [El, T];

/**
 * Appends an element node with a class name to the current document element containing a child widget.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param className the class name(s) to add to the element. Can be a static or dynamic value.
 * @param children a child widget to render inside this element.
 */
export function el<T>(
  tagName: string,
  className: string | Cell<string>,
  children: Widget<T>,
): [El, T];

/**
 * Appends an element node to the current document element with a set of attributes containing a child widget.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param attributes a map of name / value attributes to add to the element. The valyes can be static or dynamic values.
 * @param children a child widget to render inside this element.
 */
export function el<T>(
  tagName: string,
  attributes: Attributes,
  children: Widget<T>,
): [El, T];
export function el<T>(
  tagName: string,
  arg2?: Attributes | string | Cell<string> | Widget<T>,
  children?: Widget<T>,
): El | [El, T] {
  const attr: Attributes =
    typeof arg2 === "function" || arg2 === undefined
      ? {}
      : typeof arg2 === "string" || arg2 instanceof Cell
      ? { class: arg2 }
      : arg2;
  const childrenLocal = typeof arg2 === "function" ? arg2 : children;
  const [el, result] = withCurrentBuilder("el", (builder) =>
    builder.el(
      tagName,
      attr,
      childrenLocal ?? (() => (undefined as unknown) as T),
    ),
  );
  return childrenLocal ? [el, result] : el;
}

// Internal API

const InternalStaticState = {
  currentBuilder: null as DomBuilder | null,
};

function withCurrentBuilder<T>(
  opName: string,
  run: (builder: DomBuilder) => T,
): T {
  if (!InternalStaticState.currentBuilder) {
    throw new Error(
      `${opName} must be run within a widget block passed to mainWidget, renderWidget, or similar`,
    );
  }
  return run(InternalStaticState.currentBuilder);
}

interface DomBuilder {
  text(text: string | Cell<string>): Unit;
  el<T>(tag: string, attr: Attributes, children?: Widget<T>): [El, T];
  dispose: () => Unit;
}

function DomBuilder(root: HTMLElement): DomBuilder {
  // Local state
  const document = root.ownerDocument;
  const disposers: (() => void)[] = [];
  let isDisposed = false;

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
          const childrenBuilder = DomBuilder(element);
          const childrenResult = renderWidgetInternal(
            childrenBuilder,
            children,
          );
          return [
            [
              {
                element,
                events: {},
              },
              childrenResult,
            ],
            childrenBuilder.dispose,
          ];
        },
      );
    },
  };
}

function renderWidgetInternal<T>(builder: DomBuilder, widget: Widget<T>): T {
  return Transaction.run(() => {
    const prevBuilder = InternalStaticState.currentBuilder;
    InternalStaticState.currentBuilder = builder;
    try {
      return widget();
    } catch (e) {
      builder.dispose();
      throw e;
    } finally {
      InternalStaticState.currentBuilder = prevBuilder;
    }
  });
}
