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
  if (!Transaction.currentTransaction) {
    throw new Error("renderWidget must be called in a Sodium transaction");
  }
  const builder = DomBuilder();
  renderWidgetInternal(builder, widget);
  Transaction.currentTransaction.post(0, () => {
    const performWork = builder.collectWork();
    performWork({ rootElement });
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
export function el(tagName: string): [DomEvents, Unit];

/**
 * Appends an element node to the current document element with a className.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param className the class name(s) to add to the element. Can be a static or dynamic value.
 */
export function el(
  tagName: string,
  className: string | Cell<string>,
): [DomEvents, Unit];

/**
 * Appends an element node to the current document element with a set of attributes.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param attributes a map of name / value attributes to add to the element. The valyes can be static or dynamic values.
 */
export function el(tagName: string, attributes: Attributes): [DomEvents, Unit];

/**
 * Appends an element node to the current document element containing a child widget.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param children a child widget to render inside this element.
 */
export function el<T>(tagName: string, children: Widget<T>): [DomEvents, T];

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
): [DomEvents, T];

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
): [DomEvents, T];
export function el<T>(
  tagName: string,
  arg2?: Attributes | string | Cell<string> | Widget<T>,
  children?: Widget<T>,
): [DomEvents, T] {
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
      childrenLocal ?? (() => (Unit.UNIT as unknown) as T),
    ),
  );
  return [el, result];
}

/**
 * Given a time-varying widget, produce a widget which produces time varying results of those widgets.
 * Used to swap out widgets at runtime.
 */
export function switchW<T>(cWidget: Cell<Widget<T>>): Widget<Cell<T>> {
  return withCurrentBuilder("switchW", (builder) => builder.switchW(cWidget));
}

// Convenience functions

/**
 * Produce a widget from a stream of widgets. The last widget fired by the stream will be held. The initial widget
 * provided will be shown until the stream fires. The result of the resulting widget will change when sWidget changes.
 *
 * @param initial the initial widget to display. Its results will be the initial value of the resulting widget's Cell result.
 * @param sWidget a stream of widgets.
 */
export function holdW<T>(
  initial: Widget<T>,
  sWidget: Stream<Widget<T>>,
): Widget<Cell<T>> {
  return switchW(sWidget.hold(initial));
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

interface DomBuilderContext<E> {
  readonly rootElement: E;
}

type UnitOfWork<E> = (ctx: DomBuilderContext<E>) => () => void;

interface DomBuilder<E = HTMLElement> {
  collectWork(): UnitOfWork<E>;
  el<T>(tag: string, attr: Attributes, children?: Widget<T>): [DomEvents, T];
  pushUnitOfWork(unit: UnitOfWork<E>): void;
  switchW<T>(cWidget: Cell<Widget<T>>): Widget<Cell<T>>;
  text(text: string | Cell<string>): Unit;
}

const pass = () => undefined;

function DomBuilder(): DomBuilder {
  // Local state
  const work: UnitOfWork<HTMLElement>[] = [];
  let isWorkComplete = false;

  function pushUnitOfWork(unit: UnitOfWork<HTMLElement>) {
    if (isWorkComplete) {
      throw new Error("This DOM Builder can no longer be appended to.");
    }
    work.push(unit);
  }

  function bind<T>(value: T | Cell<T>, doBind: (v: T) => void): () => void {
    if (value instanceof Cell) {
      doBind(value.sample());
      return Operational.updates(value).listen(doBind);
    } else {
      doBind(value);
      return pass;
    }
  }

  // Public Methods
  const builder: DomBuilder = {
    collectWork() {
      if (isWorkComplete) {
        throw new Error("Work has already been collected.");
      }
      isWorkComplete = true;
      return (ctx) => {
        const disposers: (() => void)[] = [];
        for (const unit of work) {
          disposers.push(unit(ctx));
        }
        return () => {
          for (const dispose of disposers) {
            dispose();
          }
        };
      };
    },

    text(text) {
      pushUnitOfWork((ctx) => {
        const node = ctx.rootElement.ownerDocument.createTextNode("");
        const unbind = bind(text, (value) => (node.textContent = value));
        ctx.rootElement.appendChild(node);
        return () => {
          ctx.rootElement.removeChild(node);
          unbind();
        };
      });
      return Unit.UNIT;
    },

    el<T>(tag: string, attr: Attributes, children: Widget<T>): [DomEvents, T] {
      const eventCache: { [key: string]: Stream<Event> } = {};
      let resolveEl: (element: HTMLElement) => void;
      const elementPromise = new Promise<HTMLElement>(
        (resolve) => (resolveEl = resolve),
      );
      const events = <T extends keyof HTMLElementEventMap>(
        event: T,
      ): Stream<HTMLElementEventMap[T]> => {
        let stream = eventCache[event];
        if (!stream) {
          const sink = new StreamSink<Event>();
          sink.setVertex__(
            new Vertex(event, 0, [
              (new Source(Vertex.NULL, () => {
                const l: EventListener = (e) => sink.send(e);
                const addEventListenerPromise = elementPromise.then(
                  (element) => {
                    element.addEventListener(event, l);
                    return element;
                  },
                );
                return () =>
                  addEventListenerPromise.then((element) =>
                    element.removeEventListener(event, l),
                  );
              }) as unknown) as import("sodiumjs/dist/typings/sodium/Vertex").Source,
            ]),
          );
          stream = sink;
          eventCache[event] = stream;
        }
        return (stream as unknown) as Stream<HTMLElementEventMap[T]>;
      };
      const childrenBuilder = DomBuilder();
      const childrenResult = renderWidgetInternal(childrenBuilder, children);
      pushUnitOfWork((ctx) => {
        const element = ctx.rootElement.ownerDocument.createElement(tag);
        const disposers: (() => void)[] = [];
        for (const key of Object.keys(attr)) {
          disposers.push(
            bind(attr[key] as string | Cell<string>, (value) =>
              element.setAttribute(key, value),
            ),
          );
        }
        const performChildrenWork = childrenBuilder.collectWork();
        const disposeChildren = performChildrenWork({ rootElement: element });
        resolveEl(element);
        ctx.rootElement.appendChild(element);
        return () => {
          ctx.rootElement.removeChild(element);
          disposeChildren();
          for (const dispose of disposers) {
            dispose();
          }
        };
      });

      return [events, childrenResult];
    },

    switchW(cWidget) {
      return () => {
        // Because this will be run as a widget, the current builder may not be this one.
        const currentBuilder = InternalStaticState.currentBuilder ?? builder;
        const cResultXBuilder = cWidget.map((widget) => {
          const widgetBuilder = DomBuilder();
          return [
            widgetBuilder,
            renderWidgetInternal(widgetBuilder, widget),
          ] as const;
        });
        const cResult = cResultXBuilder.map(([, t]) => t);
        const cBuilder = cResultXBuilder.map(([builder]) => builder);
        currentBuilder.pushUnitOfWork(({ rootElement }) => {
          const cDisposer = cBuilder.map((builder) =>
            builder.collectWork()({ rootElement }),
          );
          let currentDispose = cDisposer.sample();
          const unlisten = Operational.updates(cDisposer)
            .snapshot(
              cDisposer,
              (dispose, previousDispose) => [previousDispose, dispose] as const,
            )
            .listen(([previousDispose, dispose]) => {
              previousDispose();
              currentDispose = dispose;
            });
          return () => {
            unlisten();
            currentDispose();
          };
        });
        return cResult;
      };
    },

    pushUnitOfWork,
  };

  return builder;
}

function renderWidgetInternal<T>(builder: DomBuilder, widget: Widget<T>): T {
  const prevBuilder = InternalStaticState.currentBuilder;
  InternalStaticState.currentBuilder = builder;
  try {
    return widget();
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
