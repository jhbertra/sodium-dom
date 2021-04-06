import { Cell, CellLoop, lambda1, Stream, Transaction, Unit } from "sodiumjs";
import { el, mainWidget, switchW, text, Widget } from "../../src";
import { controlsWidget } from "../events/widgets";

const pagerWidget = () => {
  const [prevBtn] = el("button", { type: "button" }, () => text("< previous"));
  const [nextBtn] = el("button", { type: "button" }, () => text("next >"));

  const prev = prevBtn("click").mapTo(Unit.UNIT);
  const next = nextBtn("click").mapTo(Unit.UNIT);

  return { prev, next };
};

const widget1: Widget<Stream<number>> = () => {
  text("Widget 1");
  return new Stream();
};

const widget2: Widget<Stream<number>> = () => {
  text("Widget 2");
  return new Stream();
};

const widgets = (cCount: Cell<number>) => [
  widget1,
  widget2,
  controlsWidget(cCount),
];

const appWidget: Widget<void> = () => {
  // Setup local state
  const cWidget = new CellLoop<Widget<Stream<number>>>();
  const cCount = new CellLoop<number>();

  // Render UI
  el("h1", () => text("Switching between widgets"));
  const [, csDelta] = el("div", switchW(cWidget));
  const [, { prev, next }] = el("div", pagerWidget);
  text(cCount.map((i) => `Aggregate data: ${i}`));

  const sWidgetDelta = prev.mapTo(-1).orElse(next.mapTo(1));
  const cWidgetIndex = sWidgetDelta.accum(0, (a, b) => {
    const i = a + b;
    return i < 0 ? 2 : i > 2 ? 0 : i;
  });
  cWidget.loop(
    cWidgetIndex.map(
      lambda1((i) => widgets(cCount)[i] as Widget<Stream<number>>, [cCount]),
    ),
  );
  cCount.loop(Cell.switchS(csDelta).accum(0, (a, b) => a + b));
};

Transaction.run(() => mainWidget(appWidget));
