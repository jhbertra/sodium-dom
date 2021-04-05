import { StreamSink, Transaction, Unit } from "sodiumjs";
import { el, mainWidget, text } from "../../src";

function repeatEvery(ms: number, f: () => void) {
  const go = () => {
    f();
    setTimeout(go, ms);
  };
  setTimeout(go, ms);
}

Transaction.run(() =>
  mainWidget(() => {
    // Setup state and events
    // Setup a stream of ticks to go off every 100 ms
    const sTick = new StreamSink<Unit>();
    repeatEvery(100, () => sTick.send(Unit.UNIT));

    // Every time the tick occurs, shift the text 1 char to the left
    const cText = sTick.accum(
      "__HELLO_REACTIVE_WORLD__",
      (_, str) => str.slice(1) + str.charAt(0),
    );

    // Build UI
    text("Hello, world!");
    el("br");
    text(cText);
  }),
);
