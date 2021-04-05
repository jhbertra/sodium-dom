import { StreamSink, Transaction, Unit } from "sodiumjs";
import { el, mainWidget, text } from "../../src";

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
  el("p", () => {
    el("pre", () => {
      el("code", () => {
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

const classes = ["error", "info", "success"];

Transaction.run(() =>
  mainWidget(() => {
    // Setup state and events
    // Setup a stream of ticks to go off every 100 ms
    const sTick = new StreamSink<Unit>();
    repeatEvery(1000, () => sTick.send(Unit.UNIT));

    // Build UI
    el("header", () => {
      el("h1", () => text("Building Elements"));
      el("p", () => text("In Sodium DOM"));
    });

    el("article", () => {
      el("h2", () => text("Creating elements"));
      el("p", () => {
        text("The primary API for creating elements in Sodium DOM is the ");
        el("code", () => text("DomBuilder#el"));
        text(" method. It accepts 3 arguments. The first argument ");
        text("is mandatory, and is the name of the HTML tag to render.");
      });

      codeBlock(`
      mainWidget(() => el("div"));
    `);
      el("p", () => {
        text("Produces the following HTML document:");
      });
      codeBlock(`
      <html>
        <body>
          <div></div>
        </body>
      </html>
    `);

      el("h2", () => text("Passing Attributes"));

      el("p", () => {
        text(
          "You can pass attributes for the element via the second argument as a dictionary.",
        );
      });
      codeBlock(`
      mainWidget(() => el("img", { src: "https://i.imgur.com/YELw3fU.jpg" });
    `);
      el("img", { src: "https://i.imgur.com/YELw3fU.jpg" });

      el("p", () => {
        text(
          "The attribute values need not be static values! They can be Sodium Cells which change over time.",
        );
      });
      codeBlock(`
      declare const cImgSrc: Cell<string>;
      mainWidget(() => el("img", { height: "250px", src: cImgSrc });
    `);
      const cImgSrc = sTick
        .accum(0, (_, i) => (i + 1) % images.length)
        .map((i) => images[i] as string);
      el("img", { height: "250px", src: cImgSrc });

      el("h2", () => text("Class name shorthand"));

      el("p", () => {
        text(
          "As a shorthand, you can pass a string instead of an object to be the class of the elemet",
        );
      });
      codeBlock(`
      mainWidget(() => {
        el("style", { type: "text/css" }, () => {
          text("span.error {");
          text("  color: red;");
          text("}");
          text("span.info {");
          text("  color: blue;");
          text("}");
          text("span.success {");
          text("  color: green;");
          text("}");
        });
        el("span", "error", () => text("I am an error!"));
      });
    `);
      el("style", { type: "text/css" }, () => {
        text("body {");
        text("  max-width: 480px;");
        text("}");
        text("span.error {");
        text("  color: red;");
        text("}");
        text("span.info {");
        text("  color: blue;");
        text("}");
        text("span.success {");
        text("  color: green;");
        text("}");
      });
      el("span", "error", () => text("I am an error!"));

      el("p", () => {
        text("The class can, of course, also be a Cell");
      });
      codeBlock(`
      declare const cClass: Cell<string>;
      mainWidget(() => el("span",  cClass, () => text("error!")));
    `);
      const cClass = sTick
        .accum(0, (_, i) => (i + 1) % classes.length)
        .map((i) => classes[i] as string);
      el("span", cClass, () => text("I don't know what I am."));

      el("h2", () => text("Passing Children"));

      el("p", () => {
        text("There are examples of this above (because it's almost ");
        text("impossible to avoid), but you can nest elements in other ");
        text("elements. The child widget can be passed as the second ");
        text("argument, or the thrid, after the attributes / class.");
      });
      codeBlock(`
      mainWidget(() => {
        el("ul", { style: "border: solid black 1px" }, () => {
          el("li", () => text("item 1"));
          el("li", () => text("item 2"));
          el("li", () => text("item 3"));
          el("li", () => text("item 4"));
        });
      });
    `);
      el("ul", { style: "border: solid black 1px" }, () => {
        el("li", () => text("item 1"));
        el("li", () => text("item 2"));
        el("li", () => text("item 3"));
        el("li", () => text("item 4"));
      });

      text("You might be wondering if children can be FRP values too. ");
      text("There is of course an API for dynamic child widgets, but ");
      text("el does not have this power. More on this in another example!");
    });
  }),
);
