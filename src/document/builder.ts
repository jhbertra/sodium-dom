import { Cell, Operational, Unit } from "sodiumjs";

import { Attributes, bindAttributes } from "./attributes";
import { DomEventStreamMap, Tag, Widget } from "./core";
import {
  bindValue,
  SetupTask,
  streamMapFactory,
  streamSource,
  Value,
} from "../utils";

// Internal implementation details live here

const InternalStaticState = {
  currentBuilder: null as DomBuilder | null,
};

export function withCurrentBuilder<T>(
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

export interface DomBuilder<E = HTMLElement> {
  collectWork(): SetupTask<DomBuilderContext<E>>;
  el<T extends Tag, A>(
    tag: T,
    attr: Attributes<T>,
    children?: Widget<A>,
  ): [DomEventStreamMap<T>, A];
  pushUnitOfWork(unit: SetupTask<DomBuilderContext<E>>): void;
  switchW<T>(cWidget: Cell<Widget<T>>): Widget<Cell<T>>;
  text(text: Value<string>): Unit;
}

export function DomBuilder(): DomBuilder {
  // Local state
  const work: SetupTask<DomBuilderContext<HTMLElement>>[] = [];
  let isWorkComplete = false;

  function pushUnitOfWork(unit: SetupTask<DomBuilderContext<HTMLElement>>) {
    if (isWorkComplete) {
      throw new Error("This DOM Builder can no longer be appended to.");
    }
    work.push(unit);
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
        const unbind = bindValue(text, (value) => {
          node.textContent = value;
          return () => (node.textContent = "");
        });
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
    ): [DomEventStreamMap<T>, A] {
      let resolveEl: (element: HTMLElement) => void;
      const elementPromise = new Promise<HTMLElement>(
        (resolve) => (resolveEl = resolve),
      );
      const events = (streamMapFactory<HTMLElementEventMap>((event) =>
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
      ) as unknown) as DomEventStreamMap<T>;
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

export function renderWidgetInternal<T>(
  builder: DomBuilder,
  widget: Widget<T>,
): T {
  const prevBuilder = InternalStaticState.currentBuilder;
  InternalStaticState.currentBuilder = builder;
  try {
    return widget();
  } finally {
    InternalStaticState.currentBuilder = prevBuilder;
  }
}
