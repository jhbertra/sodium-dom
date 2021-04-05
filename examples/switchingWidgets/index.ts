import { Cell, CellLoop, lambda1, Stream } from "sodiumjs";
import { el, mainWidget, switchW, text, Widget } from "../../src";
import { controlsWidget } from "../events/widgets";

function pagerWidget(cWidget: Cell<number>): Widget<Stream<number>> {
  return () => {
    const [prevBtn] = el("button", { type: "button" }, () =>
      text("< previous"),
    );
    text(cWidget.map((count) => `Widget: ${count + 1}`));
    const [nextBtn] = el("button", { type: "button" }, () => text("next >"));

    const sPrev = prevBtn.events("click").mapTo(-1);
    const sNext = nextBtn.events("click").mapTo(1);

    return sPrev.orElse(sNext);
  };
}

const widget1: Widget<Stream<number>> = () => {
  text("Widget 1");
  return new Stream();
};

const widget2: Widget<Stream<number>> = () => {
  text("Widget 2");
  return new Stream();
};

const appWidget: Widget<void> = () => {
  // Setup local state
  const cWidget = new CellLoop<number>();
  const cCount = new CellLoop<number>();

  // Render UI
  el("h1", () => text("Switching between widgets"));
  const [, csDelta] = el(
    "div",
    switchW(
      cWidget.map(
        lambda1(
          (widget) => {
            switch (widget) {
              case 0:
                return widget1;
              case 1:
                return widget2;
              default:
                return controlsWidget(cCount);
            }
          },
          [cCount],
        ),
      ),
    ),
  );
  const [, sDelta] = el("div", pagerWidget(cWidget));
  text(cCount.map((i) => `Aggregate data: ${i}`));

  cWidget.loop(
    sDelta.accum(0, (a, b) => {
      const result = a + b;
      return result < 0 ? 2 : result > 2 ? 0 : result;
    }),
  );
  cCount.loop(Cell.switchS(csDelta).accum(0, (a, b) => a + b));
};

mainWidget(appWidget);
