import {
  runDomBuilderInstructions,
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
} from "./domBuilder";

test("InsertElement", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(InsertElement("div"));
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <div />
    </body>
  `);
});

test("InsertElement; InsertElement", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(InsertElement("div"), InsertElement("p"));
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <p />
      <div />
    </body>
  `);
});

test("InsertElement; RemoveNode", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(InsertElement("div"), RemoveNode());
  expect(document.body).toMatchInlineSnapshot(`<body />`);
});

test("InsertElement; Move +1; InsertElement", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(InsertElement("div"), MoveCursor(1), InsertElement("p"));
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <div />
      <p />
    </body>
  `);
});

test("InsertElement; Move +1; InsertElement; RemoveNode", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(
    InsertElement("div"),
    MoveCursor(1),
    InsertElement("p"),
    RemoveNode(),
  );
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <div />
    </body>
  `);
});

test("InsertElement; Move +1; InsertElement; Move -1; RemoveNode", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(
    InsertElement("div"),
    MoveCursor(1),
    InsertElement("p"),
    MoveCursor(-1),
    RemoveNode(),
  );
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <p />
    </body>
  `);
});

test("InsertElement; Move +2; InsertElement; Move -1; RemoveNode", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(
    InsertElement("div"),
    MoveCursor(2),
    InsertElement("p"),
    MoveCursor(-1),
    RemoveNode(),
  );
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <p />
    </body>
  `);
});

test("InsertElement; Move +1; InsertElement; Move -2; RemoveNode", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(
    InsertElement("div"),
    MoveCursor(2),
    InsertElement("p"),
    MoveCursor(-1),
    RemoveNode(),
  );
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <p />
    </body>
  `);
});

test("InsertText", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(InsertText("Hello, world"));
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      Hello, world
    </body>
  `);
});

test("InsertElement; Move +1; InsertText; Move -1; RemoveNode", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(
    InsertElement("div"),
    MoveCursor(1),
    InsertText("Hello, world"),
    MoveCursor(-1),
    RemoveNode(),
  );
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      Hello, world
    </body>
  `);
});

test("InsertText; Move +1; InsertElement; Move -1; RemoveNode", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(
    InsertText("Hello, world"),
    MoveCursor(1),
    InsertElement("div"),
    MoveCursor(-1),
    RemoveNode(),
  );
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <div />
    </body>
  `);
});

test("MoveCursorEnd +3; InsertElement", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  runDomBuilderTest(MoveCursorEnd(3), InsertElement("div"));
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <div />
      <section />
    </body>
  `);
});

test("MoveCursorEnd +3; RemoveNode", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  runDomBuilderTest(MoveCursorEnd(3), RemoveNode());
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <section />
    </body>
  `);
});

test("MoveCursor +1; MoveCursorEnd +2; InsertElement", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  runDomBuilderTest(MoveCursor(1), MoveCursorEnd(2), InsertElement("div"));
  expect(document.body).toMatchInlineSnapshot(`
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
  runDomBuilderTest(MoveCursor(1), MoveCursorEnd(2), RemoveNode());
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <a />
      <section />
    </body>
  `);
});

test("MoveCursor +2; MoveCursorEnd -1; InsertElement", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  runDomBuilderTest(MoveCursor(2), MoveCursorEnd(-1), InsertElement("div"));
  expect(document.body).toMatchInlineSnapshot(`
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
  runDomBuilderTest(MoveCursor(2), MoveCursorEnd(-1), RemoveNode());
  expect(document.body).toMatchInlineSnapshot(`
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
  runDomBuilderTest(MoveCursorEnd(3), MoveCursorStart(1), RemoveNode());
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <a />
      <section />
    </body>
  `);
});

test("MoveCursorEnd +3; MoveCursorStart +4; RemoveNode", () => {
  document.body.innerHTML =
    "<a></a><p></p><span></span><article></article><section></section>";
  runDomBuilderTest(MoveCursorEnd(3), MoveCursorStart(4), RemoveNode());
  expect(document.body).toMatchInlineSnapshot(`
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
  runDomBuilderTest(
    MoveCursorEnd(3),
    InsertElement("div"),
    InsertElement("div"),
  );
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <div />
      <div />
      <section />
    </body>
  `);
});

test("InsertText; SetText", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(InsertText("Hello, world"), SetText("Hello, universe"));
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      Hello, universe
    </body>
  `);
});

test("InsertText; MoveCursor +1; InsertElement; SetText", () => {
  document.body.innerHTML = "";
  expect(() =>
    runDomBuilderTest(
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
    runDomBuilderTest(
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
  runDomBuilderTest(InsertElement("div"), Push(), InsertElement("p"));
  expect(document.body).toMatchInlineSnapshot(`
    <body>
      <div>
        <p />
      </div>
    </body>
  `);
});

test("InsertElement; Push; InsertElement; Pop; MoveCursor +1; InsertElement", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(
    InsertElement("div"),
    Push(),
    InsertElement("p"),
    Pop(),
    MoveCursor(1),
    InsertElement("article"),
  );
  expect(document.body).toMatchInlineSnapshot(`
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
    runDomBuilderTest(
      InsertElement("div"),
      Push(),
      InsertElement("p"),
      Pop(),
      MoveCursor(1),
      Push(),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `"Cannot push context when focused on a non-element node"`,
  );
});

test("InsertElement; Push; InsertElement; Pop; MoveCursorEnd +1; Push", () => {
  document.body.innerHTML = "";
  expect(() =>
    runDomBuilderTest(
      InsertElement("div"),
      Push(),
      InsertElement("p"),
      Pop(),
      MoveCursorEnd(1),
      Push(),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `"Cannot push context when cursor is in span mode"`,
  );
});

test("Build a realistic static document", () => {
  document.body.innerHTML = "";
  runDomBuilderTest(
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
  expect(document.body).toMatchInlineSnapshot(`
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

function runDomBuilderTest(...instructions: DomBuilderInstruction[]) {
  runDomBuilderInstructions(document.body, 0, instructions);
}
