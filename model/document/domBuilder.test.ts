import fc from "fast-check";
import { flow, identity } from "fp-ts/function";
import * as M from "fp-ts/Monoid";
import { Tag } from "../../src/document";

import {
  DomBuilder,
  DomBuilderMonoid,
  emptyDocument,
  end,
  insertElement,
  insertText,
  next,
  prev,
  removeAttribute,
  removeChild,
  removeProp,
  run,
  setAttribute,
  setProp,
  start,
  updateElement,
  updateText,
} from "./domBuilder";

const arbTag = fc.constantFrom<Tag[]>(
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

const arbInsertElement = (size = 4): fc.Arbitrary<[DomBuilder, string]> =>
  arbTag.chain((tag) =>
    arbDomBuilder_(Math.max(0, size - 1)).map(([builder, s]) => [
      insertElement(tag, builder),
      `insertElement(${tag},${s})`,
    ]),
  );

const arbUpdateElement = (size = 4): fc.Arbitrary<[DomBuilder, string]> =>
  fc
    .constant(undefined)
    .chain(() =>
      arbDomBuilder_(Math.max(0, size - 1)).map(([builder, s]) => [
        updateElement(builder),
        `updateElement(${s})`,
      ]),
    );

const arbInsertText: fc.Arbitrary<
  [DomBuilder, string]
> = fc.lorem().map((t) => [insertText(t), `insertText(${t})`]);
const arbUpdateText: fc.Arbitrary<
  [DomBuilder, string]
> = fc.lorem().map((t) => [updateText(t), `updateText(${t})`]);

const arbSetAttribute: fc.Arbitrary<[DomBuilder, string]> = fc
  .tuple(fc.string({ maxLength: 2 }), fc.string())
  .map((args) => [setAttribute(...args), `setAttribute(${args.join(",")})`]);

const arbRemoveAttribute: fc.Arbitrary<[DomBuilder, string]> = fc
  .string({ maxLength: 2 })
  .map((name) => [removeAttribute(name), `removeAttribute(${name})`]);

const arbSetProp: fc.Arbitrary<[DomBuilder, string]> = fc
  .tuple(fc.string({ maxLength: 2 }), fc.string())
  .map((args) => [setProp(...args), `setProp(${args.join(",")})`]);

const arbRemoveProp: fc.Arbitrary<[DomBuilder, string]> = fc
  .string({ maxLength: 2 })
  .map((name) => [removeProp(name), `removeProp(${name})`]);

const arbDomBuilder_ = (size = 4): fc.Arbitrary<[DomBuilder, string]> =>
  fc
    .array(
      fc.oneof(
        arbInsertElement(size).withBias(5),
        arbUpdateElement(size),
        arbSetAttribute.withBias(5),
        arbSetProp.withBias(5),
        arbRemoveAttribute.withBias(5),
        arbRemoveProp.withBias(5),
        arbInsertText,
        arbUpdateText,
        fc.constantFrom<[DomBuilder, string][]>(
          [prev, "prev"],
          [next, "next"],
          [start, "start"],
          [end, "end"],
          [removeChild, "removeChild"],
        ),
      ),
      { maxLength: size * 5 },
    )
    .map((builders) => [
      M.concatAll(DomBuilderMonoid)(builders.map(([b]) => b)),
      `[${builders.map(([, s]) => s).join(", ")}]`,
    ]);

const arbDomBuilder: fc.Arbitrary<DomBuilder> = arbDomBuilder_().map(
  ([b, s]) => {
    b.toString = () => s;
    return b;
  },
);

describe("DomBuilder", () => {
  it("obeys law: insertChild / prev / removeChild", () => {
    fc.assert(
      fc.property(arbDomBuilder, arbTag, arbDomBuilder, (b, tag, cb) => {
        expectBuildersEqual(
          flow(b, insertElement(tag, cb), prev, removeChild),
          b,
        );
      }),
    );
  });
  it("obeys law: insertChild / prev / updateElement", () => {
    fc.assert(
      fc.property(
        arbDomBuilder,
        arbTag,
        arbDomBuilder,
        arbDomBuilder,
        (b, tag, cb1, cb2) => {
          expectBuildersEqual(
            flow(b, insertElement(tag, cb1), prev, updateElement(cb2)),
            flow(b, insertElement(tag, flow(cb1, start, cb2))),
          );
        },
      ),
    );
  });
  it("obeys law: insertText / prev / removeChild", () => {
    fc.assert(
      fc.property(arbDomBuilder, fc.lorem(), (b, text) => {
        expectBuildersEqual(flow(b, insertText(text), prev, removeChild), b);
      }),
    );
  });
  it("obeys law: insertText / prev / updateText", () => {
    fc.assert(
      fc.property(arbDomBuilder, fc.lorem(), fc.lorem(), (b, t1, t2) => {
        expectBuildersEqual(
          flow(b, insertText(t1), prev, updateText(t2)),
          flow(b, insertText(t2)),
        );
      }),
    );
  });
  it("obeys law: empty + removeNode: identity", () => {
    expectBuildersEqual(removeChild, identity);
  });
  it("obeys law: setAttribute / removeAttribute", () => {
    fc.assert(
      fc.property(
        arbDomBuilder,
        fc.string({ maxLength: 2 }),
        fc.string(),
        (b, name, value) => {
          expectBuildersEqual(
            flow(
              b,
              removeAttribute(name),
              setAttribute(name, value),
              removeAttribute(name),
            ),
            flow(b, removeAttribute(name)),
          );
        },
      ),
    );
  });
  it("obeys law: removeAttribute / setAttribute", () => {
    fc.assert(
      fc.property(
        arbDomBuilder,
        fc.string({ maxLength: 2 }),
        fc.string(),
        (b, name, value) => {
          expectBuildersEqual(
            flow(
              b,
              setAttribute(name, value),
              removeAttribute(name),
              setAttribute(name, value),
            ),
            flow(b, setAttribute(name, value)),
          );
        },
      ),
    );
  });
  it("obeys law: setProp / removeProp", () => {
    fc.assert(
      fc.property(
        arbDomBuilder,
        fc.string({ maxLength: 2 }),
        fc.string(),
        (b, name, value) => {
          expectBuildersEqual(
            flow(b, removeProp(name), setProp(name, value), removeProp(name)),
            flow(b, removeProp(name)),
          );
        },
      ),
    );
  });
  it("obeys law: removeProp / setProp", () => {
    fc.assert(
      fc.property(
        arbDomBuilder,
        fc.string({ maxLength: 2 }),
        fc.string(),
        (b, name, value) => {
          expectBuildersEqual(
            flow(
              b,
              setProp(name, value),
              removeProp(name),
              setProp(name, value),
            ),
            flow(b, setProp(name, value)),
          );
        },
      ),
    );
  });
  it("obeys law: setAttribute: idempotent", () => {
    fc.assert(
      fc.property(
        arbDomBuilder,
        fc.string({ maxLength: 2 }),
        fc.string(),
        (b, name, value) => {
          expectBuildersEqual(
            flow(b, setAttribute(name, value), setAttribute(name, value)),
            flow(b, setAttribute(name, value)),
          );
        },
      ),
    );
  });
  it("obeys law: removeAttribute: idempotent", () => {
    fc.assert(
      fc.property(arbDomBuilder, fc.string({ maxLength: 2 }), (b, name) => {
        expectBuildersEqual(
          flow(b, removeAttribute(name), removeAttribute(name)),
          flow(b, removeAttribute(name)),
        );
      }),
    );
  });
  it("obeys law: setProp: idempotent", () => {
    fc.assert(
      fc.property(
        arbDomBuilder,
        fc.string({ maxLength: 2 }),
        fc.string(),
        (b, name, value) => {
          expectBuildersEqual(
            flow(b, setProp(name, value), setProp(name, value)),
            flow(b, setProp(name, value)),
          );
        },
      ),
    );
  });
  it("obeys law: removeProp: idempotent", () => {
    fc.assert(
      fc.property(arbDomBuilder, fc.string({ maxLength: 2 }), (b, name) => {
        expectBuildersEqual(
          flow(b, removeProp(name), removeProp(name)),
          flow(b, removeProp(name)),
        );
      }),
    );
  });
  it("prev does not affect generated document", () => {
    fc.assert(
      fc.property(arbDomBuilder, (b) => {
        expectBuildersProduceSame(flow(b, prev), b);
      }),
    );
  });
  it("next does not affect generated document", () => {
    fc.assert(
      fc.property(arbDomBuilder, (b) => {
        expectBuildersProduceSame(flow(b, next), b);
      }),
    );
  });
  it("start does not affect generated document", () => {
    fc.assert(
      fc.property(arbDomBuilder, (b) => {
        expectBuildersProduceSame(flow(b, start), b);
      }),
    );
  });
  it("end does not affect generated document", () => {
    fc.assert(
      fc.property(arbDomBuilder, (b) => {
        expectBuildersProduceSame(flow(b, end), b);
      }),
    );
  });
});

function expectBuildersEqual(a: DomBuilder, b: DomBuilder): void {
  expect(a(emptyDocument("body"))).toEqual(b(emptyDocument("body")));
}

function expectBuildersProduceSame(a: DomBuilder, b: DomBuilder): void {
  expect(run("body")(a)).toEqual(run("body")(b));
}
