import {
  runDomBuilderInstruction,
  InsertElement,
  RemoveNode,
} from "./domBuilder";

describe("runDomBuilderInstruction", () => {
  describe("InsertElement", () => {
    it("Appends the correct type of element to an empty document", () => {
      document.body.innerHTML = "";
      const context = {
        currentIndex: 0,
        currentElement: document.body,
        document: document,
      };
      const instruction = InsertElement("div");
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(`"<div></div>"`);
    });
    it("Inserts the correct type of element at the current index", () => {
      document.body.innerHTML = "<div></div>";
      const context = {
        currentIndex: 0,
        currentElement: document.body,
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
        currentIndex: 0,
        currentElement: document.querySelector("div") as HTMLElement,
        document: document,
      };
      const instruction = InsertElement("p");
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(
        `"<p></p><div><p></p></div>"`,
      );
    });
  });

  describe("RemoveNode", () => {
    it("Removes the node at the current index", () => {
      document.body.innerHTML = "<div></div>";
      const context = {
        currentIndex: 0,
        currentElement: document.body,
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
        currentIndex: 1,
        currentElement: document.querySelector("div") as HTMLElement,
        document: document,
      };
      const instruction = RemoveNode();
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(
        `"<p></p><div><p id=\\"I should stay\\"></p></div>"`,
      );
    });
    it("Is a no-op if the current index is empty", () => {
      document.body.innerHTML =
        '<p></p><div><p id="I should stay"></p><p/></div>';
      const context = {
        currentIndex: 2,
        currentElement: document.querySelector("div") as HTMLElement,
        document: document,
      };
      const instruction = RemoveNode();
      runDomBuilderInstruction(context, instruction);
      expect(document.body.innerHTML).toMatchInlineSnapshot(
        `"<p></p><div><p id=\\"I should stay\\"></p><p></p></div>"`,
      );
    });
  });
});
