import fc from "fast-check";
import { constant, identity, pipe } from "fp-ts/function";
import * as M from "fp-ts/Monoid";
import { Tag } from "../../src/document";

import {
  DomBuilder,
  end,
  getMonoid,
  insertElement,
  insertText,
  map,
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

const arbInsertElement = (size = 4): fc.Arbitrary<[DomBuilder<void>, string]> =>
  arbTag.chain((tag) =>
    arbDomBuilder_(Math.max(0, size - 1)).map(([builder, s]) => [
      insertElement(tag, builder),
      `insertElement(${tag},${s})`,
    ]),
  );

const arbUpdateElement = (size = 4): fc.Arbitrary<[DomBuilder<void>, string]> =>
  fc.constant(undefined).chain(() =>
    arbDomBuilder_(Math.max(0, size - 1)).map(([builder, s]) => [
      pipe(
        updateElement(builder),
        map(() => undefined),
      ),
      `updateElement(${s})`,
    ]),
  );

const arbInsertText: fc.Arbitrary<
  [DomBuilder<void>, string]
> = fc.lorem().map((t) => [insertText(t), `insertText(${t})`]);
const arbUpdateText: fc.Arbitrary<
  [DomBuilder<void>, string]
> = fc.lorem().map((t) => [updateText(t), `updateText(${t})`]);

const arbSetAttribute: fc.Arbitrary<[DomBuilder<void>, string]> = fc
  .tuple(fc.string({ maxLength: 2 }), fc.string())
  .map((args) => [setAttribute(...args), `setAttribute(${args.join(",")})`]);

const arbRemoveAttribute: fc.Arbitrary<[DomBuilder<void>, string]> = fc
  .string({ maxLength: 2 })
  .map((name) => [removeAttribute(name), `removeAttribute(${name})`]);

const arbSetProp: fc.Arbitrary<[DomBuilder<void>, string]> = fc
  .tuple(fc.string({ maxLength: 2 }), fc.string())
  .map((args) => [setProp(...args), `setProp(${args.join(",")})`]);

const arbRemoveProp: fc.Arbitrary<[DomBuilder<void>, string]> = fc
  .string({ maxLength: 2 })
  .map((name) => [removeProp(name), `removeProp(${name})`]);

const testMonoid = getMonoid(M.monoidVoid);

const seqBuilders = (...bs: DomBuilder<void>[]) => M.concatAll(testMonoid)(bs);

const arbDomBuilder_ = (size = 4): fc.Arbitrary<[DomBuilder<void>, string]> =>
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
        fc.constantFrom<[DomBuilder<void>, string][]>(
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
      M.concatAll(testMonoid)(builders.map(([b]) => b)),
      `[${builders.map(([, s]) => s).join(", ")}]`,
    ]);

const arbDomBuilder: fc.Arbitrary<DomBuilder<void>> = arbDomBuilder_().map(
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
          M.concatAll(testMonoid)([
            b,
            insertElement(tag, cb),
            prev,
            removeChild,
          ]),
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
            seqBuilders(
              b,
              insertElement(tag, cb1),
              prev,
              pipe(updateElement(cb2), map(constant(undefined))),
            ),
            seqBuilders(b, insertElement(tag, seqBuilders(cb1, start, cb2))),
          );
        },
      ),
    );
  });
  it("obeys law: insertText / prev / removeChild", () => {
    fc.assert(
      fc.property(arbDomBuilder, fc.lorem(), (b, text) => {
        expectBuildersEqual(
          seqBuilders(b, insertText(text), prev, removeChild),
          b,
        );
      }),
    );
  });
  it("obeys law: insertText / prev / updateText", () => {
    fc.assert(
      fc.property(arbDomBuilder, fc.lorem(), fc.lorem(), (b, t1, t2) => {
        expectBuildersEqual(
          seqBuilders(b, insertText(t1), prev, updateText(t2)),
          seqBuilders(b, insertText(t2)),
        );
      }),
    );
  });
  it("obeys law: empty + removeNode: identity", () => {
    expectBuildersEqual(removeChild, testMonoid.empty);
  });
  it("obeys law: setAttribute / removeAttribute", () => {
    fc.assert(
      fc.property(
        arbDomBuilder,
        fc.string({ maxLength: 2 }),
        fc.string(),
        (b, name, value) => {
          expectBuildersEqual(
            seqBuilders(
              b,
              removeAttribute(name),
              setAttribute(name, value),
              removeAttribute(name),
            ),
            seqBuilders(b, removeAttribute(name)),
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
            seqBuilders(
              b,
              setAttribute(name, value),
              removeAttribute(name),
              setAttribute(name, value),
            ),
            seqBuilders(b, setAttribute(name, value)),
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
            seqBuilders(
              b,
              removeProp(name),
              setProp(name, value),
              removeProp(name),
            ),
            seqBuilders(b, removeProp(name)),
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
            seqBuilders(
              b,
              setProp(name, value),
              removeProp(name),
              setProp(name, value),
            ),
            seqBuilders(b, setProp(name, value)),
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
            seqBuilders(
              b,
              setAttribute(name, value),
              setAttribute(name, value),
            ),
            seqBuilders(b, setAttribute(name, value)),
          );
        },
      ),
    );
  });
  it("obeys law: removeAttribute: idempotent", () => {
    fc.assert(
      fc.property(arbDomBuilder, fc.string({ maxLength: 2 }), (b, name) => {
        expectBuildersEqual(
          seqBuilders(b, removeAttribute(name), removeAttribute(name)),
          seqBuilders(b, removeAttribute(name)),
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
            seqBuilders(b, setProp(name, value), setProp(name, value)),
            seqBuilders(b, setProp(name, value)),
          );
        },
      ),
    );
  });
  it("obeys law: removeProp: idempotent", () => {
    fc.assert(
      fc.property(arbDomBuilder, fc.string({ maxLength: 2 }), (b, name) => {
        expectBuildersEqual(
          seqBuilders(b, removeProp(name), removeProp(name)),
          seqBuilders(b, removeProp(name)),
        );
      }),
    );
  });
  it("prev does not affect generated document", () => {
    fc.assert(
      fc.property(arbDomBuilder, (b) => {
        expectBuildersEqual(seqBuilders(b, prev), b);
      }),
    );
  });
  it("next does not affect generated document", () => {
    fc.assert(
      fc.property(arbDomBuilder, (b) => {
        expectBuildersEqual(seqBuilders(b, next), b);
      }),
    );
  });
  it("start does not affect generated document", () => {
    fc.assert(
      fc.property(arbDomBuilder, (b) => {
        expectBuildersEqual(seqBuilders(b, start), b);
      }),
    );
  });
  it("end does not affect generated document", () => {
    fc.assert(
      fc.property(arbDomBuilder, (b) => {
        expectBuildersEqual(seqBuilders(b, end), b);
      }),
    );
  });
});

function expectBuildersEqual(a: DomBuilder<void>, b: DomBuilder<void>): void {
  expect(run("body")(a)).toEqual(run("body")(b));
}
