import {
  Cell,
  Operational,
  Stream,
  StreamSink,
  Transaction,
  Unit,
  Vertex,
} from "sodiumjs";

// Public API

// Types

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
export interface DomEvents {
  <T extends keyof HTMLElementEventMap>(name: T): Stream<
    HTMLElementEventMap[T]
  >;
}

export interface El {
  readonly element: HTMLElement;
  readonly events: DomEvents;
}

/**
 * A "widget" is just a parameterless function that returns some result, where
 * the following rules apply:
 *
 * 1. Widgets can call other widgets directly.
 * 2. Widgets can call DOM-building functions like text, el.
 * 3. The top / app-level widget should be passed as an argument to a widget
 *    rendering function sich as `mainWidget` or `renderWidget`.
 */
export type Widget<T> = () => T;

// Entry-points

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
 * @param rootElement an HTML element that will contain your application's DOMstructure.
 * @param widget the top-level widget of your application.
 */
export function renderWidget(
  rootElement: HTMLElement,
  widget: Widget<void>,
): void {
  return Transaction.run(() => {
    return renderWidgetInternal(DomBuilder(rootElement), widget);
  });
}

// UI Primatives

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

/**
 * Given a time-varying widget, produce a widget which produces time varying results of those widgets.
 * Used to swap out widgets at runtime.
 */
export function switchW<T>(cWidget: Cell<Widget<T>>): Widget<Cell<T>> {
  return withCurrentBuilder("switchW", (builder) => builder.switchW(cWidget));
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

interface DomBuilder<E = HTMLElement> {
  dispose: () => Unit;
  el<T>(tag: string, attr: Attributes, children?: Widget<T>): [El, T];
  text(text: string | Cell<string>): Unit;
  switchW<T>(cWidget: Cell<Widget<T>>): Widget<Cell<T>>;
  root: E;
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
      throw new Error("This DOM builder has been disposed");
    }
    const n = node();
    root.appendChild(n);
    disposers.push(() => root.removeChild(n));

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
      Transaction.currentTransaction.post(0, () => {
        doBind(value.sample());
      });
      disposers.push(Operational.updates(value).listen(doBind));
    } else {
      doBind(value);
    }
  }

  // Public Methods
  const builder: DomBuilder = {
    dispose() {
      for (const disposer of disposers) {
        disposer();
      }
      isDisposed = true;
      return Unit.UNIT;
    },

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
          const eventCache: {
            [key in keyof HTMLElementEventMap]?: StreamSink<
              HTMLElementEventMap[key]
            >;
          } = {};
          const events = <T extends keyof HTMLElementEventMap>(
            event: T,
          ): Stream<HTMLElementEventMap[T]> => {
            let stream = (eventCache[event] as unknown) as StreamSink<
              HTMLElementEventMap[T]
            >;
            if (!stream) {
              stream = new StreamSink<HTMLElementEventMap[T]>();
              stream.setVertex__(
                new Vertex(event, 0, [
                  (new Source(Vertex.NULL, () => {
                    if (isDisposed) {
                      throw new Error(
                        "This widget has been disposed. You cannot listen to its events anymore.",
                      );
                    }
                    const l: EventListener = (e) =>
                      stream.send(e as HTMLElementEventMap[T]);
                    element.addEventListener(event, l);
                    return () => element.removeEventListener(event, l);
                  }) as unknown) as import("sodiumjs/dist/typings/sodium/Vertex").Source,
                ]),
              );
              eventCache[event] = (stream as unknown) as typeof eventCache[T];
            }
            return stream;
          };
          const el: El = {
            element,
            events,
          };
          return [[el, childrenResult], childrenBuilder.dispose];
        },
      );
    },

    switchW<T>(cWidget: Cell<Widget<T>>): Widget<Cell<T>> {
      if (isDisposed) {
        throw new Error("This DOM builder has been disposed");
      }

      return () => {
        const localRoot = InternalStaticState.currentBuilder?.root;
        let lastHandleResult = null as [DomBuilder, T] | null;
        let lastWidget = null as Widget<T> | null;

        function handleNewWidget(widget: Widget<T>): [DomBuilder, T] {
          if (lastHandleResult && lastWidget === widget) {
            return lastHandleResult;
          }
          if (isDisposed) {
            throw new Error("This DOM builder has been disposed");
          }
          if (!localRoot) {
            throw new Error(
              "switchW must be run within a widget rendering function.",
            );
          }

          const builder = DomBuilder(localRoot);
          lastHandleResult = [builder, renderWidgetInternal(builder, widget)];
          lastWidget = widget;
          return lastHandleResult;
        }

        const cOut = Operational.updates(cWidget)
          .accumLazy(
            cWidget.sampleLazy().map(handleNewWidget),
            (widget, [builder]) => {
              builder.dispose();
              return handleNewWidget(widget);
            },
          )
          .map(([, t]) => t);

        // Add a dumy listener to keep this alive
        disposers.push(cOut.listen(() => undefined));
        return cOut;
      };
    },
    root,
  };

  return builder;
}

function renderWidgetInternal<T>(builder: DomBuilder, widget: Widget<T>): T {
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
}

// TODO OBVIOUSLY This should not live here!!! This is copy-pasted from
// sodium-typescript, which does not export Source. It definitely should, as it
// is part of the public API. Exporting Vertex constructors without exporting
// Source makes no sense. This needs to be fixed in a PR.
//
// For now, we are lucky enough that this class doesn't depend on any module
// state in Vertex... or we'd be really hooped.
class Source {
  // Note:
  // When register_ == null, a rank-independent source is constructed (a vertex which is just kept alive for the
  // lifetime of vertex that contains this source).
  // When register_ != null it is likely to be a rank-dependent source, but this will depend on the code inside register_.
  //
  // rank-independent souces DO NOT bump up the rank of the vertex containing those sources.
  // rank-depdendent sources DO bump up the rank of the vertex containing thoses sources when required.
  constructor(origin: Vertex, register_: () => () => void) {
    if (origin === null) throw new Error("null origin!");
    this.origin = origin;
    this.register_ = register_;
  }
  origin: Vertex;
  private register_: () => () => void;
  private registered = false;
  private deregister_?: () => void = undefined;

  register(target: Vertex): void {
    if (!this.registered) {
      this.registered = true;
      if (this.register_ !== null) this.deregister_ = this.register_();
      else {
        // Note: The use of Vertex.NULL here instead of "target" is not a bug, this is done to create a
        // rank-independent source. (see note at constructor for more details.). The origin vertex still gets
        // added target vertex's children for the memory management algorithm.
        this.origin.increment(Vertex.NULL);
        target.childrn.push(this.origin);
        this.deregister_ = () => {
          this.origin.decrement(Vertex.NULL);
          for (let i = target.childrn.length - 1; i >= 0; --i) {
            if (target.childrn[i] === this.origin) {
              target.childrn.splice(i, 1);
              break;
            }
          }
        };
      }
    }
  }
  deregister(): void {
    if (this.registered) {
      this.registered = false;
      if (this.deregister_ !== undefined) this.deregister_();
    }
  }
}
