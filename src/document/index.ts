import { Cell, Stream, Transaction, Unit } from "sodiumjs";

import { Attributes } from "./attributes";
import {
  DomBuilder,
  renderWidgetInternal,
  withCurrentBuilder,
} from "./builder";
import { DomEventStreamMap, Tag, Widget } from "./core";

export { DomEventStreamMap, Tag, Widget };

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
export function el<T extends Tag>(tagName: T): [DomEventStreamMap<T>, Unit];

/**
 * Appends an element node to the current document element with a set of attributes.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param attributes a map of name / value attributes to add to the element. The valyes can be static or dynamic values.
 */
export function el<T extends Tag>(
  tagName: T,
  attributes: Attributes<T>,
): [DomEventStreamMap<T>, Unit];

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
): [DomEventStreamMap<T>, A];
export function el<T extends Tag, A>(
  tagName: T,
  attributes?: Attributes<T>,
  children?: Widget<A>,
): [DomEventStreamMap<T>, A] {
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
