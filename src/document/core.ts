import { StreamMap } from "../utils";

/**
 * All defined HTML tag names.
 */
export type Tag = keyof HTMLElementTagNameMap;

/**
 * The element type for a given tag.
 */
export type Element<T extends Tag> = HTMLElementTagNameMap[T];

type FixEventElementTypes<T extends Tag> = {
  [event in keyof HTMLElementEventMap]: Omit<
    HTMLElementTagNameMap[T],
    "target"
  > & { target: Element<T> };
};

/**
 * A record containing the set of events available for each DOM element.
 */
export type DomEventStreamMap<T extends Tag> = StreamMap<
  FixEventElementTypes<T>
>;

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
