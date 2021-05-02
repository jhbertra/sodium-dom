import {
  runDomBuilderInstructions,
  InsertElement,
  RemoveNode,
  InsertText,
  DomBuilderInstruction,
  MoveCursor,
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

function runDomBuilderTest(...instructions: DomBuilderInstruction[]) {
  runDomBuilderInstructions(document.body, 0, instructions);
}
