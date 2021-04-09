import { StreamSink, Transaction, Unit } from "sodiumjs";
import {
  Attribute,
  el,
  height,
  id,
  li,
  mainWidget,
  p,
  src,
  style,
  text,
  ul,
} from "../../src/document";

function repeatEvery(ms: number, f: () => void) {
  const go = () => {
    f();
    setTimeout(go, ms);
  };
  setTimeout(go, ms);
}

function codeBlock(code: string): void {
  let initialIndent = 0;
  for (let i = 0; i < code.length; ++i) {
    if (/\s/.exec(code.charAt(i))) {
      initialIndent += 1;
    } else {
      break;
    }
  }
  el("p", [], () => {
    el("pre", [], () => {
      el("code", [], () => {
        text(
          code
            .trim()
            .replace(new RegExp(`\n[\\s]{${initialIndent - 1}}`, "g"), "\n"),
        );
      });
    });
  });
}

const images = [
  "https://i.imgur.com/YELw3fU.jpg",
  "https://i.kym-cdn.com/entries/icons/original/000/000/188/DancingBannana.gif",
  "https://s.abcnews.com/images/Entertainment/abc_ann_wtb_orange_111101_wg.jpg",
];

const attributes = [
  [
    style("width", "200px"),
    style("height", "200px"),
    style("background-color", "red"),
  ] as Attribute<"div">[],
  [
    id("box"),
    style("width", "200px"),
    style("height", "200px"),
    style("border", "1px solid black"),
    style("box-sizing", "border-box"),
  ] as Attribute<"div">[],
];

Transaction.run(() =>
  mainWidget(() => {
    // Setup state and events
    // Setup a stream of ticks to go off every 100 ms
    const sTick = new StreamSink<Unit>();
    repeatEvery(1000, () => sTick.send(Unit.UNIT));

    // Build UI
    el("header", [], () => {
      el("h1", [], "Building Elements");
      el("p", [], "In Sodium DOM");
    });

    el("article", [], () => {
      el("h2", [], "Creating elements");
      el("p", [], () => {
        text("The primary API for creating elements in Sodium DOM is the ");
        el("code", [], "DomBuilder#el");
        text(" method. It accepts 3 arguments. The first argument ");
        text("is mandatory, and is the name of the HTML tag to render.");
      });

      codeBlock(`
        mainWidget(() => el("div"));
      `);
      el("p", [], () => {
        text("Produces the following HTML document:");
      });
      codeBlock(`
        <html>
          <body>
            <div></div>
          </body>
        </html>
      `);

      el("h2", [], "Passing Attributes");

      el("p", [], () => {
        text(
          "You can pass attributes for the element via the second argument as an array.",
        );
      });
      codeBlock(`
        mainWidget(() => el("img", [src("https://i.imgur.com/YELw3fU.jpg")]);
      `);
      el("img", [src("https://i.imgur.com/YELw3fU.jpg")]);

      el("p", [], () => {
        text(
          "The attribute values need not be static values! They can be Sodium Cells which change over time.",
        );
      });
      codeBlock(`
        declare const cImgSrc: Cell<string>;
        mainWidget(() => el("img", [height(250), src(cImgSrc)]));
      `);
      const cImgSrc = sTick
        .accum(0, (_, i) => (i + 1) % images.length)
        .map((i) => images[i] as string);
      el("img", [height(250), src(cImgSrc)]);

      el("p", [], () => {
        text(
          "The attributes themselves can also be dynamic - so the attributes for an element can change over type",
        );
      });
      codeBlock(`
        declare const cAttr: Attributes<"div">;
        mainWidget(() => el("div", cAttr));
      `);
      const cAttr = sTick
        .accum(0, (_, i) => (i + 1) % attributes.length)
        .map((i) => attributes[i] as Attribute<"div">[]);
      el("div", cAttr);

      el("h2", [], "Passing Children");

      el("p", [], () => {
        text("There are examples of this above (because it's almost ");
        text("impossible to avoid), but you can nest elements in other ");
        text("elements. The child widget can be passed as the second ");
        text("argument, or the thrid, after the attributes / class.");
      });
      codeBlock(`
        mainWidget(() => {
          el("ul", [style("border", "solid black 1px")], () => {
            el("li", [], "item 1");
            el("li", [], "item 2");
            el("li", [], "item 3");
            el("li", [], "item 4");
          });
        });
      `);
      el("ul", [style("border", "solid black 1px")], () => {
        el("li", [], "item 1");
        el("li", [], "item 2");
        el("li", [], "item 3");
        el("li", [], "item 4");
      });

      text("You might be wondering if children can be FRP values too. ");
      text("There is of course an API for dynamic child widgets, but ");
      text("el does not have this power. More on this in another example!");

      el("h2", [], "Helper function");

      p([], () => {
        text("Because using a primitive like el everywhere is somewhat ");
        text("redundant, there are helper functions defined for all standard");
        text("HTML element tags.");
      });
      codeBlock(`
        mainWidget(() => {
          ul([style("border", "solid black 1px")], () => {
            li([], "item 1");
            li([], "item 2");
            li([], "item 3");
            li([], "item 4");
          });
        });
      `);
      ul([style("border", "solid black 1px")], () => {
        li([], "item 1");
        li([], "item 2");
        li([], "item 3");
        li([], "item 4");
      });
    });
  }),
);
