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
  removeChild,
  run,
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

const arbInsertChild = (size = 4): fc.Arbitrary<[DomBuilder, string]> =>
  arbTag.chain((tag) =>
    arbDomBuilder_(Math.max(0, size - 1)).map(([builder, s]) => [
      insertElement(tag, builder),
      `insertChild(${tag},${s})`,
    ]),
  );

const arbDomBuilder_ = (size = 4): fc.Arbitrary<[DomBuilder, string]> =>
  fc
    .array(
      fc.oneof(
        arbInsertChild(size),
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
