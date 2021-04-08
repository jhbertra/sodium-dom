import { Cell, Operational, Stream, StreamSink, Vertex } from "sodiumjs";

// Sodium helpers

// TODO OBVIOUSLY This should not live here!!! This is copy-pasted from
// sodium-typescript, which does not export Source. It definitely should, as it
// is part of the public API. Exporting Vertex constructors without exporting
// Source makes no sense. This needs to be fixed in a PR.
//
// For now, we are lucky enough that this class doesn't depend on any module
// state in Vertex... or we'd be really hooped.
class Source {
  // Note:
  // When register_ == null, a rank-independent source is constructed (a vertex which is just kept alive for the
  // lifetime of vertex that contains this source).
  // When register_ != null it is likely to be a rank-dependent source, but this will depend on the code inside register_.
  //
  // rank-independent souces DO NOT bump up the rank of the vertex containing those sources.
  // rank-depdendent sources DO bump up the rank of the vertex containing thoses sources when required.
  constructor(origin: Vertex, register_: () => () => void) {
    if (origin === null) throw new Error("null origin!");
    this.origin = origin;
    this.register_ = register_;
  }
  origin: Vertex;
  private register_: () => () => void;
  private registered = false;
  private deregister_?: () => void = undefined;
  register(target: Vertex): void {
    if (!this.registered) {
      this.registered = true;
      if (this.register_ !== null) this.deregister_ = this.register_();
      else {
        // Note: The use of Vertex.NULL here instead of "target" is not a bug, this is done to create a
        // rank-independent source. (see note at constructor for more details.). The origin vertex still gets
        // added target vertex's children for the memory management algorithm.
        this.origin.increment(Vertex.NULL);
        target.childrn.push(this.origin);
        this.deregister_ = () => {
          this.origin.decrement(Vertex.NULL);
          for (let i = target.childrn.length - 1; i >= 0; --i) {
            if (target.childrn[i] === this.origin) {
              target.childrn.splice(i, 1);
              break;
            }
          }
        };
      }
    }
  }
  deregister(): void {
    if (this.registered) {
      this.registered = false;
      if (this.deregister_ !== undefined) this.deregister_();
    }
  }
}

export type Sink<T> = (t: T) => void;
export function streamSource<T>(
  name: string,
  setup: SetupTask<Sink<T>>,
): Stream<T>;
export function streamSource<T>(setup: SetupTask<Sink<T>>): Stream<T>;
export function streamSource<T>(
  arg1: string | SetupTask<Sink<T>>,
  arg2?: SetupTask<Sink<T>>,
): Stream<T> {
  const name = typeof arg1 === "string" ? arg1 : "IO source";
  const setup = typeof arg1 === "function" ? arg1 : arg2;
  if (!setup) {
    throw new Error("A setup task is required to create a stream source");
  }
  const stream = new StreamSink<T>();
  stream.setVertex__(
    new Vertex(name, 0, [
      // eslint-disable-next-line
      new Source(Vertex.NULL, () => setup((x) => stream.send(x))) as any,
    ]),
  );
  return stream;
}

export function cellSource<T>(
  initial: T,
  name: string,
  setup: SetupTask<Sink<T>>,
): Cell<T>;
export function cellSource<T>(initial: T, setup: SetupTask<Sink<T>>): Cell<T>;
export function cellSource<T>(
  initial: T,
  arg2: string | SetupTask<Sink<T>>,
  arg3?: SetupTask<Sink<T>>,
): Cell<T> {
  const name = typeof arg2 === "string" ? arg2 : "IO source";
  const setup = typeof arg2 === "function" ? arg2 : arg3;
  if (!setup) {
    throw new Error("A setup task is required to create a cell source");
  }
  return streamSource(name, setup).hold(initial);
}

export type CleanupTask = () => void;
export type SetupTask<T> = (context: T) => CleanupTask;

export const pass: CleanupTask = () => undefined;

export function performEffect<T>(
  stream: Stream<T>,
  effect: SetupTask<T>,
): CleanupTask {
  return stream.listen(effect);
}

export function bind<T>(
  value: Cell<T>,
  updateTarget: SetupTask<T>,
): CleanupTask {
  updateTarget(value.sample());
  return performEffect(Operational.updates(value), updateTarget);
}

export type StreamMap<T> = {
  readonly [stream in keyof T]: Stream<T[stream]>;
};

export type StreamCreators<T> = {
  readonly [stream in keyof T]: () => Stream<T[stream]>;
};

export function streamMapFactory<T>(
  creator: <K extends keyof T>(key: K) => Stream<T[K]>,
): StreamMap<T> {
  return new Proxy({} as StreamMap<T>, {
    get(target, p) {
      if (!target[p as keyof T]) {
        // eslint-disable-next-line
        // @ts-ignore
        target[p as keyof T] = creator(p as keyof T);
      }
      return target[p as keyof T];
    },
  });
}

export function streamMap<T>(creatorMap: StreamCreators<T>): StreamMap<T> {
  return streamMapFactory(
    (key) => creatorMap[key]?.() as Stream<T[typeof key]>,
  );
}

// Value type

export type Value<T> = T | Cell<T>;

export function wrapValue<T>(value: Value<T>): Cell<T> {
  return value instanceof Cell ? value : new Cell(value);
}

export function mapValue<T, U>(value: Value<T>, f: (t: T) => U): Value<U> {
  return value instanceof Cell ? value.map(f) : f(value);
}

export function bindValue<T>(
  value: Value<T>,
  bindTarget: SetupTask<T>,
): CleanupTask {
  if (value instanceof Cell) {
    return bind(value, bindTarget);
  } else {
    return bindTarget(value);
  }
}
