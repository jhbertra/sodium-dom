import { Cell, Operational, Stream, Transaction, Unit } from "sodiumjs";
import { streamMapFactory, StreamMap, streamSource } from "../utils";

import { Attributes, bindAttributes } from "./attributes";

export {
  Attribute,
  Attributes,
  TokenListMap,
  accept,
  acceptCharset,
  accessKey,
  action,
  align,
  alt,
  autocomplete,
  autofocus,
  autoplay,
  checked,
  cite,
  classList,
  className,
  colSpan,
  cols,
  contentEditable,
  controls,
  coords,
  dateTime,
  default_,
  dir,
  disabled,
  download,
  draggable,
  enctype,
  headers,
  height,
  hidden,
  href,
  hreflang,
  htmlFor,
  id,
  isMap,
  kind,
  lang,
  loop,
  max,
  maxLength,
  media,
  method,
  min,
  minLength,
  multiple,
  name,
  novalidate,
  pattern,
  ping,
  placeholder,
  poster,
  preload,
  readonly,
  rel,
  required,
  reversed,
  rows,
  rowspan,
  sandbox,
  sandboxList,
  scope,
  selected,
  setProperty,
  shape,
  size,
  spellcheck,
  src,
  srcdoc,
  srclang,
  start,
  step,
  style,
  tabIndex,
  target,
  title,
  tokens,
  tokensList,
  type,
  useMap,
  value,
  width,
  wrap,
} from "./attributes";

// Public API

// Types

/**
 * A record containing the set of events available for each DOM element.
 */
export type DomEventStreamMap = StreamMap<HTMLElementEventMap>;

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

type Tag = keyof HTMLElementTagNameMap;

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
export function el<T extends Tag>(tagName: T): [DomEventStreamMap, Unit];

/**
 * Appends an element node to the current document element with a set of attributes.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param attributes a map of name / value attributes to add to the element. The valyes can be static or dynamic values.
 */
export function el<T extends Tag>(
  tagName: string,
  attributes: Attributes<T>,
): [DomEventStreamMap, Unit];

/**
 * Appends an element node to the current document element with a set of attributes containing a child widget.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param attributes a map of name / value attributes to add to the element. The valyes can be static or dynamic values.
 * @param children a child widget to render inside this element.
 */
export function el<T extends Tag, A>(
  tagName: T,
  attributes: Attributes<T>,
  children: Widget<A>,
): [DomEventStreamMap, A];
export function el<T extends Tag, A>(
  tagName: T,
  attributes?: Attributes<T>,
  children?: Widget<A>,
): [DomEventStreamMap, A] {
  return withCurrentBuilder("el", (builder) =>
    builder.el(tagName, attributes ?? [], children),
  );
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
  el<T extends Tag, A>(
    tag: T,
    attr: Attributes<T>,
    children?: Widget<A>,
  ): [DomEventStreamMap, A];
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

    el<T extends Tag, A>(
      tag: T,
      attr: Attributes<T>,
      children?: Widget<A>,
    ): [DomEventStreamMap, A] {
      let resolveEl: (element: HTMLElement) => void;
      const elementPromise = new Promise<HTMLElement>(
        (resolve) => (resolveEl = resolve),
      );
      const events = streamMapFactory<HTMLElementEventMap>((event) =>
        streamSource(event, (send) => {
          const addEventListenerPromise = elementPromise.then((element) => {
            element.addEventListener(event, send);
            return element;
          });
          return () =>
            addEventListenerPromise.then((element) =>
              element.removeEventListener(event, send),
            );
        }),
      );
      const childrenBuilder = children && DomBuilder();
      const childrenResult =
        children && childrenBuilder
          ? renderWidgetInternal(childrenBuilder, children)
          : (Unit.UNIT as A);
      pushUnitOfWork((ctx) => {
        const element = ctx.rootElement.ownerDocument.createElement(tag);
        const disposers: (() => void)[] = [];
        const disposeAttributes = bindAttributes(element, attr);
        const performChildrenWork = childrenBuilder?.collectWork();
        const disposeChildren = performChildrenWork?.({ rootElement: element });
        resolveEl(element);
        ctx.rootElement.appendChild(element);
        return () => {
          ctx.rootElement.removeChild(element);
          disposeChildren?.();
          disposeAttributes();
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
