import { Cell, Stream } from "sodiumjs";

import { Widget } from "./core";
import { withCurrentBuilder } from "./builder";

/**
 * Given a time-varying widget, produce a widget which produces the time varying results of those widgets.
 * Used to swap out widgets at runtime (e.g. can be used to implement SPA routers or tabbed UIs).
 */
export function switchWidget<T>(cWidget: Cell<Widget<T>>): Widget<Cell<T>> {
  return withCurrentBuilder("switchW", (builder) => builder.switchW(cWidget));
}

/**
 * Produce a widget from a stream of widgets. The last widget fired by the stream will be held. The initial widget
 * provided will be shown until the stream fires. The result of the resulting widget will change when sWidget changes.
 *
 * @param initial the initial widget to display. Its results will be the initial value of the resulting widget's Cell result.
 * @param sWidget a stream of widgets.
 */
export function holdWidget<T>(
  initial: Widget<T>,
  sWidget: Stream<Widget<T>>,
): Widget<Cell<T>> {
  return switchWidget(sWidget.hold(initial));
}
