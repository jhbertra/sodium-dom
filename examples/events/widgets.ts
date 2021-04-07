import { Cell, CellLoop, Stream } from "sodiumjs";
import { el, text, Widget } from "../../src/document";
import { type } from "../../src/document/attributes";

export function controlsWidget(cCount: Cell<number>): Widget<Stream<number>> {
  return () => {
    const [subBtn] = el("button", new Cell([type("button")]), () => text("-"));
    text(cCount.map((count) => `Current value: ${count}`));
    const [addBtn] = el("button", [type("button")], () => text("+"));

    const sSub = subBtn("click").mapTo(-1);
    const sAdd = addBtn("click").mapTo(1);

    return sSub.orElse(sAdd);
  };
}

const switchWidget: Widget<Cell<boolean>> = () => {
  const cOn = new CellLoop<boolean>();
  const [onBtn] = el("button", [type("button")], () =>
    text(
      cOn.map<string>((on) => (on ? "disable" : "enable")),
    ),
  );
  cOn.loop(onBtn("click").accum<boolean>(true, (_, b) => !b));
  return cOn;
};

export const appWidget: Widget<void> = () => {
  // Setup local state
  const cCount = new CellLoop<number>();

  // Render UI
  el("h1", [], () => text("Obligatory counter example"));
  const [, sDelta] = el("div", [], controlsWidget(cCount));
  const [, cOn] = el("div", [], switchWidget);

  // Setup event handlers. Note - we could have used sDelta.gate(cOn) to turn
  // the counter on / off, but doing it this way actually modifies the FRP
  // network using higher-order FRP. The sDelta event gets removed from the
  // network, which results in the "click" event listener on the - / + button
  // elements getting removed, which can be seen in the DOM inspector in browser
  // dev tools.
  //
  // Of course, the price we pay here is that we loose the state gathered in
  // accum, so the counter resets to 0. Using .gate would maintain the counter
  // value, and just supress the firing of the sDelta stream.
  //
  // On another note, Sodium should definitely provide a `flatMap` method on
  // Cells :/ here is the code...
  //
  // ```ts
  // flatMap<B>(f: (a: A) => Cell<B>): Cell<B> {
  //   return Cell.switchC(this.map(f));
  // }
  // ```
  //
  // This would also fit the signature of fantasy-land/chain
  cCount.loop(
    Cell.switchC(
      cOn.map((on) => (on ? sDelta.accum(0, (a, b) => a + b) : new Cell(0))),
    ),
  );
};