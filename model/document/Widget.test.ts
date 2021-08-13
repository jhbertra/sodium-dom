import fc, { Arbitrary } from "fast-check";
import { Endomorphism, flow, identity, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/lib/Array";
import { concatAll } from "fp-ts/lib/Monoid";
import * as S from "fp-ts/lib/string";
import { Tag } from "../../src/document";
import {
  Attribute,
  Attributes,
  prop,
  style,
  tokenList,
  tokens,
} from "./Attributes";
import * as B from "./Behaviour";
import * as E from "./Event";
import {
  ap,
  el,
  getMonoid,
  holdWidget,
  list,
  map,
  of,
  switchWidget,
  text,
  Widget,
} from "./Widget";
import { renderWidget } from "./helpers";

export const arbTag = fc.constantFrom<Tag[]>(
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "p",
  "hr",
  "pre",
  "blockquote",
  "span",
  "a",
  "code",
  "em",
  "strong",
  "i",
  "b",
  "u",
  "sub",
  "sup",
  "br",
  "ins",
  "del",
  "small",
  "cite",
  "dfn",
  "abbr",
  "time",
  "var",
  "samp",
  "kbd",
  "s",
  "q",
  "mark",
  "ruby",
  "rt",
  "rp",
  "bdi",
  "bdo",
  "wbr",
  "ol",
  "ul",
  "li",
  "dl",
  "dt",
  "dd",
  "img",
  "iframe",
  "canvas",
  "form",
  "input",
  "textarea",
  "button",
  "select",
  "option",
  "fieldset",
  "legend",
  "label",
  "datalist",
  "optgroup",
  "output",
  "progress",
  "meter",
  "section",
  "nav",
  "article",
  "aside",
  "header",
  "footer",
  "address",
  "main",
  "figure",
  "figcaption",
  "table",
  "caption",
  "colgroup",
  "col",
  "tbody",
  "thead",
  "tfoot",
  "tr",
  "td",
  "th",
  "audio",
  "video",
  "source",
  "track",
  "embed",
  "object",
  "param",
  "details",
  "summary",
  "menu",
  "applet",
  "area",
  "base",
  "basefont",
  "body",
  "data",
  "dialog",
  "dir",
  "font",
  "frame",
  "frameset",
  "head",
  "hgroup",
  "html",
  "link",
  "map",
  "marquee",
  "meta",
  "noscript",
  "picture",
  "script",
  "slot",
  "style",
  "template",
  "title",
);

const arbBehaviour = <A>(arbA: Arbitrary<A>): Arbitrary<B.Behaviour<A>> =>
  fc
    .array(arbA, { minLength: 1 })
    .map((arr) => B.B((t) => arr[Math.min(t, arr.length)] as A));

const arbEvent = <A>(arbA: Arbitrary<A>) =>
  fc.array(fc.tuple(fc.boolean(), arbA)).map(
    flow(
      A.chainWithIndex((t, [fires, a]) =>
        fires ? [[t, a] as [number, A]] : [],
      ),
      E.E,
    ),
  );

const arbProp: Arbitrary<Attribute<Tag>> = fc
  .tuple(fc.constantFrom("id", "title"), arbBehaviour(fc.anything()))
  .map((args) => prop(...args));

const arbToken = fc.string({ minLength: 1 }).filter((s) => !s.includes(" "));

const arbTokens: Arbitrary<Attribute<Tag>> = arbBehaviour(
  fc.array(arbToken),
).map((value) => tokens("classList")(value));

const arbTokenList: Arbitrary<Attribute<Tag>> = fc
  .dictionary(arbToken, arbBehaviour(fc.boolean()))
  .map((value) => tokenList("classList", value));

const arbStyle: Arbitrary<Attribute<Tag>> = fc
  .tuple(
    fc.constantFrom("background-color", "color"),
    arbBehaviour(fc.string()),
  )
  .map((args) => style(...args));

const arbAttribute: Arbitrary<Attribute<Tag>> = fc.oneof(
  arbProp,
  arbTokens,
  arbTokenList,
  arbStyle,
);

const arbAttributes: Arbitrary<Attributes<Tag>> = arbBehaviour(
  fc.array(arbAttribute),
);

const arbText: Arbitrary<Widget<B.Behaviour<string>>> = fc
  .tuple(arbBehaviour(fc.string()), arbBehaviour(fc.string()))
  .map(([s, t]) =>
    pipe(
      text(t),
      map(() => s),
    ),
  );

const arbEl: (size: number) => Arbitrary<Widget<B.Behaviour<string>>> = (
  size,
) =>
  fc
    .tuple(
      arbTag,
      arbAttributes,
      fc.constant(undefined).chain(() => arbWidget(size / 2)),
    )
    .map(([tag, attr, children]) => el(tag, attr, children));

const arbSwitchWidget: (
  size: number,
) => Arbitrary<Widget<B.Behaviour<string>>> = (size) =>
  arbBehaviour(fc.constant(undefined).chain(() => arbWidget(size / 2)))
    .map(switchWidget)
    .map(map(B.flatten));

const arbList: (size: number) => Arbitrary<Widget<B.Behaviour<string>>> = (
  size,
) =>
  arbBehaviour(fc.array(fc.anything()))
    .chain((bs) => arbWidget(size / 2).map((w) => list(() => w)(bs)))
    .map(
      map(
        flow(
          B.map(
            flow(
              B.sequenceArray,
              B.map((ss) => ss.join("")),
            ),
          ),
          B.flatten,
        ),
      ),
    );

const arbHoldWidget: (
  size: number,
) => Arbitrary<Widget<B.Behaviour<string>>> = (size) =>
  fc
    .constant(undefined)
    .chain(() => fc.tuple(arbWidget(size / 2), arbEvent(arbWidget(size / 2))))
    .map(([init, ew]) => holdWidget(init)(ew))
    .map(map(B.flatten));

const arbConcat: (size: number) => Arbitrary<Widget<B.Behaviour<string>>> = (
  size,
) =>
  fc
    .constant(undefined)
    .chain(() => fc.array(arbWidget(size / 2), { maxLength: 3 }))
    .map(concatAll(getMonoid(B.getMonoid(S.Monoid))));

const arbWidget: (size?: number) => Arbitrary<Widget<B.Behaviour<string>>> = (
  size = 5,
) =>
  size < 1
    ? fc.oneof(arbText, fc.string().map(flow(B.of, of)))
    : fc.oneof(
        arbEl(size),
        // arbSwitchWidget(size),
        // arbList(size),
        // arbHoldWidget(size),
        // arbConcat(size),
      );

export const arbWidget_: (
  size?: number,
) => Arbitrary<Widget<B.Behaviour<string>>> = (size = 5) =>
  size < 1
    ? fc.oneof(arbText, fc.string().map(flow(B.of, of)))
    : fc.oneof(
        arbEl(size),
        arbSwitchWidget(size),
        arbList(size),
        arbHoldWidget(size),
        arbConcat(size),
      );

function assertWidgetEq<A>(
  a: Widget<B.Behaviour<A>>,
  b: Widget<B.Behaviour<A>>,
  t: number,
): void {
  const [va, bea] = renderWidget(a);
  const [vb, beb] = renderWidget(b);
  expect(bea(t)).toEqual(beb(t));
  expect(va(t)).toEqual(vb(t));
}

describe("Widget", () => {
  describe("Functor", () => {
    it("fmap id == id", () => {
      fc.assert(
        fc.property(arbWidget(), fc.nat(25), (w, t) =>
          assertWidgetEq(pipe(w, map(identity)), w, t),
        ),
      );
    });
    it("fmap (f . g) == fmap f . fmap g", () => {
      fc.assert(
        fc.property(
          arbWidget(),
          fc.func(arbBehaviour(fc.nat())),
          fc.func(fc.date()),
          fc.nat(25),
          (w, f, g, t) =>
            assertWidgetEq(
              pipe(w, map(flow(g, f))),
              pipe(w, map(g), map(f)),
              t,
            ),
        ),
      );
    });
  });
  describe("Applicative", () => {
    it("pure id <*> v = v", () => {
      fc.assert(
        fc.property(arbWidget(), fc.nat(25), (m, t) =>
          assertWidgetEq(
            pipe(of<Endomorphism<B.Behaviour<string>>>(identity), ap(m)),
            m,
            t,
          ),
        ),
      );
    });
    // it("pure (.) <*> u <*> v <*> w == u <*> (v <*> w)", () => {
    //   fc.assert(
    //     fc.property(
    //       arbWidget(),
    //       arbWidget(),
    //       arbWidget(),
    //       fc.nat(),
    //       (u, v, w, t) =>
    //         assertWidgetEq(
    //           pipe(compose, of, ap(u), ap(v), ap(w)),
    //           pipe(u, ap(pipe(v, ap(w)))),
    //           t,
    //         ),
    //     ),
    //   );
    // });
    // it("pure f <*> pure x == pure (f x)", () => {
    //   fc.assert(
    //     fc.property(fc.func(fc.date()), fc.string(), fc.nat(25), (f, x, t) =>
    //       assertWidgetEq(pipe(of(f), ap(of(x))), of(f(x)), t),
    //     ),
    //   );
    // });
    // it("u <*> pure y = pure ($ y) <*> u", () => {
    //   fc.assert(
    //     fc.property(arbWidget(), fc.string(), fc.nat(), (u, y, t) =>
    //       assertWidgetEq(
    //         pipe(u, ap(of(y))),
    //         pipe(
    //           of((f: (s: string) => Date) => f(y)),
    //           ap(u),
    //         ),
    //         t,
    //       ),
    //     ),
    //   );
    // });
  });
  //   describe("Monad", () => {
  //     it("return a >>= k = k a", () => {
  //       fc.assert(
  //         fc.property(fc.string(), fc.nat(25), (a, t) =>
  //           assertWidgetEq(
  //             pipe(
  //               a,
  //               of,
  //               chain((s) => of(s.length)),
  //             ),
  //             of(a.length),
  //             t,
  //           ),
  //         ),
  //       );
  //     });
  //     it("m >>= return = m", () => {
  //       fc.assert(
  //         fc.property(arbWidget(), fc.nat(25), (m, t) =>
  //           assertWidgetEq(pipe(m, chain(of)), m, t),
  //         ),
  //       );
  //     });
  //     it("m >>= (x -> k x >>= h)  =  (m >>= k) >>= h", () => {
  //       fc.assert(
  //         fc.property(arbWidget(), fc.nat(25), (m, t) => {
  //           const famb = () => of(3);
  //           const fbmc = (b: number) => of(b.toString());
  //           assertWidgetEq(
  //             pipe(
  //               m,
  //               chain(() => pipe(famb(), chain(fbmc))),
  //             ),
  //             pipe(m, chain(famb), chain(fbmc)),
  //             t,
  //           );
  //         }),
  //       );
  //     });
  //   });
});
