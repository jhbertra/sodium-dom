import { Cell, CellLoop, Transaction } from "sodiumjs";
import {
  button,
  disabled,
  div,
  h1,
  li,
  mainWidget,
  list,
  type,
  ul,
  Widget,
} from "../../src/document";
import { streamMap } from "../../src/utils";

const controlsWidget = (cCount: Cell<number>) => () => {
  const cDisabled = cCount.map((count) => count === 0);
  const [remove] = button([type("button"), disabled(cDisabled)], "Remove");
  const [add] = button([type("button")], "Add");

  return streamMap({
    add: () => add.click,
    remove: () => remove.click.gate(cDisabled.map((x) => !x)),
  });
};

const itemWidget = (item: number): Widget<void> => () => {
  li([], `Item #${item}`);
};

const appWidget: Widget<void> = () => {
  // Setup local state
  const cList = new CellLoop<number[]>();
  const cCount = cList.map((list) => list.length);

  // Render UI
  h1([], "Lists of dynamic content");
  const [, { add, remove }] = div([], controlsWidget(cCount));
  ul([], list(cList, itemWidget));

  const sUpdateList = add
    .mapTo((a: number[]) => [...a, a.length])
    .orElse(remove.mapTo(([, ...t]: number[]) => t));
  cList.loop(sUpdateList.accum([] as number[], (update, list) => update(list)));
};

Transaction.run(() => mainWidget(appWidget));
