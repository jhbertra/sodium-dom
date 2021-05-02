import {
  runDomBuilderInstruction,
  InsertElement,
  RemoveNode,
  IncrementCursor,
  InsertText,
} from "./domBuilder";

describe("runDomBuilderInstruction", () => {
  describe("InsertElement", () => {
    it("Appends the correct type of element to an empty document", () => {
      document.body.innerHTML = "";
      const context = {
        cursor: 0,
        currentParent: document.body,
        document: document,
      };
      const instruction = InsertElement("div");
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div></div>"`);
    });
    it("Inserts the correct type of element at the cursor position", () => {
      document.body.innerHTML = "<div></div>";
      const context = {
        cursor: 0,
        currentParent: document.body,
        document: document,
      };
      const instruction = InsertElement("p");
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(
        `"<p></p><div></div>"`,
      );
    });
    it("Appends into the correct element", () => {
      document.body.innerHTML = "<p></p><div></div>";
      const context = {
        cursor: 0,
        currentParent: document.querySelector("div") as HTMLElement,
        document: document,
      };
      const instruction = InsertElement("p");
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(
        `"<p></p><div><p></p></div>"`,
      );
    });
  });

  describe("InsertText", () => {
    it("Appends the text to an empty document", () => {
      document.body.innerHTML = "";
      const context = {
        cursor: 0,
        currentParent: document.body,
        document: document,
      };
      const instruction = InsertText("Hello, world");
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(`"Hello, world"`);
    });
    it("Inserts the correct type of element at the cursor position", () => {
      document.body.innerHTML = "<div></div>";
      const context = {
        cursor: 0,
        currentParent: document.body,
        document: document,
      };
      const instruction = InsertText("Hello, world");
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(
        `"Hello, world<div></div>"`,
      );
    });
    it("Appends into the correct element", () => {
      document.body.innerHTML = "<p></p><div></div>";
      const context = {
        cursor: 0,
        currentParent: document.querySelector("div") as HTMLElement,
        document: document,
      };
      const instruction = InsertText("Hello, world");
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(
        `"<p></p><div>Hello, world</div>"`,
      );
    });
  });

  describe("RemoveNode", () => {
    it("Removes the node at the cursor position", () => {
      document.body.innerHTML = "<div></div>";
      const context = {
        cursor: 0,
        currentParent: document.body,
        document: document,
      };
      const instruction = RemoveNode();
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(`""`);
    });
    it("Removes from the correct element", () => {
      document.body.innerHTML =
        '<p></p><div><p id="I should stay"></p><p/></div>';
      const context = {
        cursor: 1,
        currentParent: document.querySelector("div") as HTMLElement,
        document: document,
      };
      const instruction = RemoveNode();
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(
        `"<p></p><div><p id=\\"I should stay\\"></p></div>"`,
      );
    });
    it("Is a no-op if the cursor position is empty", () => {
      document.body.innerHTML =
        '<p></p><div><p id="I should stay"></p><p/></div>';
      const context = {
        cursor: 2,
        currentParent: document.querySelector("div") as HTMLElement,
        document: document,
      };
      const instruction = RemoveNode();
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(
        `"<p></p><div><p id=\\"I should stay\\"></p><p></p></div>"`,
      );
    });
  });

  describe("IncrementCursor", () => {
    it("Increments the cursor", () => {
      document.body.innerHTML = "<div></div>";
      const context = {
        cursor: 0,
        currentParent: document.body,
        document: document,
      };
      const instruction = IncrementCursor();
      runDomBuilderInstruction(context, instruction);
      expect(context.cursor).toEqual(1);
    });
    it("Is a no-op if the cursor is already the maximum", () => {
      document.body.innerHTML = "<div></div>";
      const context = {
        cursor: 1,
        currentParent: document.body,
        document: document,
      };
      const instruction = IncrementCursor();
      runDomBuilderInstruction(context, instruction);
      expect(context.cursor).toEqual(1);
    });
  });
});
