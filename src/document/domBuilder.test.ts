import { CellSink, Operational } from "sodiumjs";
import { Tag } from "./core";
import {
  commitDomTransaction,
  InsertElement,
  RemoveNode,
  InsertText,
  DomBuilderInstruction,
  MoveCursor,
  MoveCursorEnd,
  MoveCursorStart,
  SetText,
  Push,
  Pop,
  Put,
  React,
  SetAttribute,
  SetAttributeNS,
  RemoveAttribute,
  RemoveAttributeNS,
  SetProp,
  RemoveProp,
} from "./domBuilder";

test("InsertElement", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(InsertElement("div"));
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <div />
    </body>
  `);
});

test("InsertElement; InsertElement", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("div"),
    InsertElement("p"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <p />
      <div />
    </body>
  `);
});

test("InsertElement; RemoveNode", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(InsertElement("div"), RemoveNode());
  expect(finalBody).toMatchInlineSnapshot(`<body />`);
});

test("InsertElement; Move +1; InsertElement", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("div"),
    MoveCursor(1),
    InsertElement("p"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <div />
      <p />
    </body>
  `);
});

test("InsertElement; Move +1; InsertElement; RemoveNode", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("div"),
    MoveCursor(1),
    InsertElement("p"),
    RemoveNode(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <div />
    </body>
  `);
});

test("InsertElement; Move +1; InsertElement; Move -1; RemoveNode", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("div"),
    MoveCursor(1),
    InsertElement("p"),
    MoveCursor(-1),
    RemoveNode(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <p />
    </body>
  `);
});

test("InsertElement; Move +2; InsertElement; Move -1; RemoveNode", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("div"),
    MoveCursor(2),
    InsertElement("p"),
    MoveCursor(-1),
    RemoveNode(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <p />
    </body>
  `);
});

test("InsertElement; Move +1; InsertElement; Move -2; RemoveNode", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("div"),
    MoveCursor(2),
    InsertElement("p"),
    MoveCursor(-1),
    RemoveNode(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <p />
    </body>
  `);
});

test("InsertText", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(InsertText("Hello, world"));
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      Hello, world
    </body>
  `);
});

test("InsertElement; Move +1; InsertText; Move -1; RemoveNode", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("div"),
    MoveCursor(1),
    InsertText("Hello, world"),
    MoveCursor(-1),
    RemoveNode(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      Hello, world
    </body>
  `);
});

test("InsertText; Move +1; InsertElement; Move -1; RemoveNode", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertText("Hello, world"),
    MoveCursor(1),
    InsertElement("div"),
    MoveCursor(-1),
    RemoveNode(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <div />
    </body>
  `);
});

test("SetAttribute", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("main"),
    SetAttribute("id", "app"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <main
        id="app"
      />
    </body>
  `);
});

test("RemoveAttribute", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("main"),
    RemoveAttribute("id"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <main />
    </body>
  `);
});

test("SetAttribute; RemoveAttribute", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("main"),
    SetAttribute("id", "app"),
    RemoveAttribute("id"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <main />
    </body>
  `);
});

test("SetAttributeNS", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("main"),
    SetAttributeNS(
      "http://www.mozilla.org/ns/specialspace",
      "spec:align",
      "center",
    ),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <main
        spec:align="center"
      />
    </body>
  `);
});

test("RemoveAttributeNS", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("main"),
    RemoveAttributeNS("http://www.mozilla.org/ns/specialspace", "spec:align"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <main />
    </body>
  `);
});

test("SetAttributeNS; RemoveAttributeNS", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("main"),
    SetAttributeNS(
      "http://www.mozilla.org/ns/specialspace",
      "spec:align",
      "center",
    ),
    RemoveAttributeNS("http://www.mozilla.org/ns/specialspace", "align"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <main />
    </body>
  `);
});

test("SetProp", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("main"),
    SetProp("id", "app"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <main
        id="app"
      />
    </body>
  `);
});

test("RemoveProp", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(InsertElement("main"), RemoveProp("id"));
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <main />
    </body>
  `);
});

test("SetProp; RemoveProp", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("main"),
    SetProp("id", "app"),
    RemoveProp("id"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <main />
    </body>
  `);
});
test("MoveCursorEnd +3; InsertElement", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  const finalBody = testDomTransaction(MoveCursorEnd(3), InsertElement("div"));
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <div />
      <section />
    </body>
  `);
});

test("MoveCursorEnd +3; RemoveNode", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  const finalBody = testDomTransaction(MoveCursorEnd(3), RemoveNode());
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <section />
    </body>
  `);
});

test("MoveCursor +1; MoveCursorEnd +2; InsertElement", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  const finalBody = testDomTransaction(
    MoveCursor(1),
    MoveCursorEnd(2),
    InsertElement("div"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <a />
      <div />
      <section />
    </body>
  `);
});

test("MoveCursor +1; MoveCursorEnd +2; RemoveNode", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  const finalBody = testDomTransaction(
    MoveCursor(1),
    MoveCursorEnd(2),
    RemoveNode(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <a />
      <section />
    </body>
  `);
});

test("MoveCursor +2; MoveCursorEnd -1; InsertElement", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  const finalBody = testDomTransaction(
    MoveCursor(2),
    MoveCursorEnd(-1),
    InsertElement("div"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <a />
      <div />
      <article />
      <section />
    </body>
  `);
});

test("MoveCursor +2; MoveCursorEnd -1; InsertElement", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  const finalBody = testDomTransaction(
    MoveCursor(2),
    MoveCursorEnd(-1),
    RemoveNode(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <a />
      <article />
      <section />
    </body>
  `);
});

test("MoveCursorEnd +3; MoveCursorStart +1; RemoveNode", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  const finalBody = testDomTransaction(
    MoveCursorEnd(3),
    MoveCursorStart(1),
    RemoveNode(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <a />
      <section />
    </body>
  `);
});

test("MoveCursorEnd +3; MoveCursorStart +4; RemoveNode", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  const finalBody = testDomTransaction(
    MoveCursorEnd(3),
    MoveCursorStart(4),
    RemoveNode(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <a />
      <p />
      <span />
    </body>
  `);
});

test("MoveCursorEnd +3; InsertElement; InsertElement;", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  const finalBody = testDomTransaction(
    MoveCursorEnd(3),
    InsertElement("div"),
    InsertElement("div"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <div />
      <div />
      <section />
    </body>
  `);
});

test("InsertText; SetText", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertText("Hello, world"),
    SetText("Hello, universe"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      Hello, universe
    </body>
  `);
});

test("InsertText; MoveCursor +1; InsertElement; SetText", () => {
  document.body.innerHTML = "";
  expect(() =>
    testDomTransaction(
      InsertText("Hello, world"),
      MoveCursor(1),
      InsertElement("div"),
      SetText("Hello, universe"),
    ),
  ).toThrowErrorMatchingInlineSnapshot(`"Cannot set text on a non-text node"`);
});

test("InsertText; MoveCursorEnd +1; SetText", () => {
  document.body.innerHTML = "";
  expect(() =>
    testDomTransaction(
      InsertText("Hello, world"),
      MoveCursorEnd(1),
      SetText("Hello, universe"),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `"Cannot set text when cursor is in span mode"`,
  );
});

test("InsertElement; Push; InsertElement", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("div"),
    Push(),
    InsertElement("p"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <div>
        <p />
      </div>
    </body>
  `);
});

test("InsertElement; Push; InsertElement; Pop; MoveCursor +1; InsertElement", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("div"),
    Push(),
    InsertElement("p"),
    Pop(),
    MoveCursor(1),
    InsertElement("article"),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <div>
        <p />
      </div>
      <article />
    </body>
  `);
});

test("InsertElement; Push; InsertElement; Pop; MoveCursor +1; Push", () => {
  document.body.innerHTML = "";
  expect(() =>
    testDomTransaction(
      InsertElement("div"),
      Push(),
      InsertElement("p"),
      Pop(),
      MoveCursor(1),
      Push(),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `"Cannot push state when focused on a non-element node"`,
  );
});

test("InsertElement; Push; InsertElement; Pop; MoveCursorEnd +1; Push", () => {
  document.body.innerHTML = "";
  expect(() =>
    testDomTransaction(
      InsertElement("div"),
      Push(),
      InsertElement("p"),
      Pop(),
      MoveCursorEnd(1),
      Push(),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `"Cannot push state when cursor is in span mode"`,
  );
});

test("Build a realistic static document", () => {
  document.body.innerHTML = "";
  const finalBody = testDomTransaction(
    InsertElement("header"),
    Push(),
    InsertElement("h1"),
    Push(),
    InsertText("My awesome webpage"),
    Pop(),
    MoveCursor(1),
    InsertElement("p"),
    Push(),
    InsertText("Isn't it beautiful?"),
    Pop(),
    Pop(),
    MoveCursor(1),
    InsertElement("main"),
    Push(),
    InsertElement("h1"),
    Push(),
    InsertText("Using the DOM builder sure is tedious and error-prone"),
    Pop(),
    MoveCursor(1),
    InsertElement("p"),
    Push(),
    InsertText(
      "Good thing this is not a public API, and that computers are excellent at performing tedious, error-prone tasks.",
    ),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <header>
        <h1>
          My awesome webpage
        </h1>
        <p>
          Isn't it beautiful?
        </p>
      </header>
      <main>
        <h1>
          Using the DOM builder sure is tedious and error-prone
        </h1>
        <p>
          Good thing this is not a public API, and that computers are excellent at performing tedious, error-prone tasks.
        </p>
      </main>
    </body>
  `);
});

test("Cut span, Put single", () => {
  document.body.innerHTML = "<h1/><h2/><h3/><h4/><h5/>";
  const finalBody = testDomTransaction(
    MoveCursorEnd(3),
    MoveCursorStart(1),
    RemoveNode(),
    MoveCursor(-1),
    Put(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <h2 />
      <h3 />
      <h4 />
      <h1 />
      <h5 />
    </body>
  `);
});

test("Cut single, Put single", () => {
  document.body.innerHTML = "<h1/><h2/><h3/><h4/><h5/>";
  const finalBody = testDomTransaction(
    MoveCursor(3),
    RemoveNode(),
    MoveCursor(-3),
    Put(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <h4 />
      <h1 />
      <h2 />
      <h3 />
      <h5 />
    </body>
  `);
});

test("Cut single, Put span, Put single", () => {
  document.body.innerHTML = "<h1/><h2/><h3/><h4/><h5/>";
  const finalBody = testDomTransaction(
    MoveCursor(3),
    RemoveNode(),
    MoveCursorStart(-3),
    MoveCursorEnd(-2),
    Put(),
    MoveCursor(3),
    Put(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <h4 />
      <h3 />
      <h5 />
      <h1 />
      <h2 />
    </body>
  `);
});

test("Cut span, Put span", () => {
  document.body.innerHTML = "<h1/><h2/><h3/><h4/><h5/>";
  const finalBody = testDomTransaction(
    MoveCursorEnd(3),
    MoveCursorStart(2),
    RemoveNode(),
    MoveCursorStart(-2),
    MoveCursorEnd(-1),
    Put(),
  );
  expect(finalBody).toMatchInlineSnapshot(`
    <body>
      <h3 />
      <h4 />
      <h5 />
    </body>
  `);
});

test("Dynamic text", () => {
  document.body.innerHTML = "";
  const cText = new CellSink<string>("Hello, world!");
  const rollback = commitDomTransaction(document.body, {
    offset: 0,
    instructions: [
      InsertElement("p"),
      Push(),
      InsertText(""),
      React(cText.map((s) => ({ offset: 0, instructions: [SetText(s)] }))),
    ],
  });
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <p>
        Hello, world!
      </p>
    </body>
  `);
  cText.send("Hello, universe!");
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <p>
        Hello, universe!
      </p>
    </body>
  `);
  rollback();
  expect(document.body).toMatchInlineSnapshot(`<body />`);
});

test("Dynamic text, middle node", () => {
  document.body.innerHTML = "";
  const cText = new CellSink<string>("Hello, reactive world!");
  const rollback = commitDomTransaction(document.body, {
    offset: 0,
    instructions: [
      InsertElement("p"),
      MoveCursor(1),
      InsertElement("p"),
      Push(),
      InsertText("Hello, world!"),
      MoveCursor(1),
      InsertText(""),
      React(cText.map((s) => ({ offset: 1, instructions: [SetText(s)] }))),
      MoveCursor(1),
      InsertText("Hello, universe!"),
    ],
  });
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <p />
      <p>
        Hello, world!
        Hello, reactive world!
        Hello, universe!
      </p>
    </body>
  `);
  cText.send("HELLO, REACTIVE WORLD!");
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <p />
      <p>
        Hello, world!
        HELLO, REACTIVE WORLD!
        Hello, universe!
      </p>
    </body>
  `);
  rollback();
  expect(document.body).toMatchInlineSnapshot(`<body />`);
});

test("Dynamic element", () => {
  document.body.innerHTML = "";
  const cTag = new CellSink<Tag>("p");
  const rollback = commitDomTransaction(document.body, {
    offset: 0,
    instructions: [
      React(
        cTag.map((tag) => ({
          offset: 0,
          instructions: [RemoveNode(), InsertElement(tag)],
        })),
      ),
    ],
  });
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <p />
    </body>
  `);
  cTag.send("div");
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <div />
    </body>
  `);
  rollback();
  expect(document.body).toMatchInlineSnapshot(`<body />`);
});

test("Dynamic fragment", () => {
  document.body.innerHTML = "";
  const cTags = new CellSink<Tag[]>(["p", "a"]);
  const rollback = commitDomTransaction(document.body, {
    offset: 0,
    instructions: [
      InsertElement("h1"),
      MoveCursor(1),
      InsertElement("h2"),
      MoveCursor(1),
      React(
        Operational.updates(cTags)
          .snapshot(cTags, (tags, prevTags) => [tags, prevTags] as const)
          .holdLazy(cTags.sampleLazy().map((tags) => [tags, []]))
          .map(([tags, prevTags]) => ({
            offset: 2,
            instructions: [
              ...(prevTags.length ? [MoveCursorEnd(prevTags.length - 1)] : []),
              ...tags.flatMap((tag) => [InsertElement(tag), MoveCursor(1)]),
            ],
          })),
      ),
      MoveCursor(1),
      InsertElement("h3"),
      MoveCursor(1),
      InsertElement("h4"),
    ],
  });
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <h1 />
      <h2 />
      <p />
      <a />
      <h3 />
      <h4 />
    </body>
  `);
  cTags.send(["span"]);
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <h1 />
      <h2 />
      <span />
      <h3 />
      <h4 />
    </body>
  `);
  rollback();
  expect(document.body).toMatchInlineSnapshot(`<body />`);
});

function testDomTransaction(
  ...instructions: DomBuilderInstruction[]
): HTMLElement {
  const initialBody = document.body.cloneNode(true) as HTMLElement;
  try {
    const rollback = commitDomTransaction(document.body, {
      offset: 0,
      instructions,
    });
    const finalBody = document.body.cloneNode(true) as HTMLElement;
    rollback();
    return finalBody;
  } finally {
    expect(document.body).toEqual(initialBody);
  }
}
