import { Cell, Unit } from "sodiumjs";

import { Attributes } from "./attributes";
import { DomEventStreamMap, Tag, Widget } from "./core";
import { withCurrentBuilder } from "./builder";
import { Value } from "../utils";

/**
 * Appends a text node to the current document element.
 *
 * WARNING - must be called witin a widget.
 *
 * @param value the static or dynamic string value to render inside the text node.
 */
export function text(value: Value<string>): Unit {
  return withCurrentBuilder("text", (builder) => builder.text(value));
}

/**
 * Appends an element node to the current document element.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 */
export function el<T extends Tag>(tagName: T): [DomEventStreamMap<T>, Unit];

/**
 * Appends an element node to the current document element with a set of attributes.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param attributes a map of name / value attributes to add to the element. The valyes can be static or dynamic values.
 */
export function el<T extends Tag>(
  tagName: T,
  attributes: Attributes<T>,
): [DomEventStreamMap<T>, Unit];

/**
 * Appends an element node to the current document element with a set of attributes containing child text.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param attributes a map of name / value attributes to add to the element. The valyes can be static or dynamic values.
 * @param children text to render inside this element.
 */
export function el<T extends Tag, Unit>(
  tagName: T,
  attributes: Attributes<T>,
  children: Value<string>,
): [DomEventStreamMap<T>, Unit];

/**
 * Appends an element node to the current document element with a set of attributes containing a child widget.
 *
 * WARNING - must be called witin a widget.
 *
 * @param tagName the name of the HTML element to append (e.g. "div", "br", "img", etc...);
 * @param attributes a map of name / value attributes to add to the element. The valyes can be static or dynamic values.
 * @param children a child widget to render inside this element.
 */
export function el<T extends Tag, A>(
  tagName: T,
  attributes: Attributes<T>,
  children: Widget<A>,
): [DomEventStreamMap<T>, A];
export function el<T extends Tag, A>(
  tagName: T,
  attributes?: Attributes<T>,
  children?: Widget<A> | Value<string>,
): [DomEventStreamMap<T>, A] {
  return withCurrentBuilder("el", (builder) =>
    builder.el(
      tagName,
      attributes ?? [],
      typeof children === "function"
        ? children
        : typeof children === "string" || children instanceof Cell
        ? () => text(children)
        : undefined,
    ),
  ) as [DomEventStreamMap<T>, A];
}

// Tags

export interface ElementCreator<T extends Tag> {
  (): [DomEventStreamMap<T>, Unit];
  (attributes: Attributes<T>): [DomEventStreamMap<T>, Unit];
  (attributes: Attributes<T>, children: Value<string>): [
    DomEventStreamMap<T>,
    Unit,
  ];
  <A>(attributes: Attributes<T>, children: Widget<A>): [
    DomEventStreamMap<T>,
    A,
  ];
}

function createElementCreator<T extends Tag>(tag: T): ElementCreator<T> {
  return <A>(
    attributes?: Attributes<T>,
    children?: Widget<A> | Value<string>,
  ) => el(tag, attributes as Attributes<T>, children as Widget<A>);
}

// Headers

export const h1 = createElementCreator("h1");
export const h2 = createElementCreator("h2");
export const h3 = createElementCreator("h3");
export const h4 = createElementCreator("h4");
export const h5 = createElementCreator("h5");
export const h6 = createElementCreator("h6");

// Grouping Content

export const div = createElementCreator("div");
export const p = createElementCreator("p");
export const hr = createElementCreator("hr");
export const pre = createElementCreator("pre");
export const blockquote = createElementCreator("blockquote");

// Text

export const span = createElementCreator("span");
export const a = createElementCreator("a");
export const code = createElementCreator("code");
export const em = createElementCreator("em");
export const strong = createElementCreator("strong");
export const i = createElementCreator("i");
export const b = createElementCreator("b");
export const u = createElementCreator("u");
export const sub = createElementCreator("sub");
export const sup = createElementCreator("sup");
export const br = createElementCreator("br");
export const ins = createElementCreator("ins");
export const del = createElementCreator("del");
export const small = createElementCreator("small");
export const cite = createElementCreator("cite");
export const dfn = createElementCreator("dfn");
export const abbr = createElementCreator("abbr");
export const time = createElementCreator("time");
export const var_ = createElementCreator("var");
export const samp = createElementCreator("samp");
export const kbd = createElementCreator("kbd");
export const s = createElementCreator("s");
export const q = createElementCreator("q");
export const mark = createElementCreator("mark");
export const ruby = createElementCreator("ruby");
export const rt = createElementCreator("rt");
export const rp = createElementCreator("rp");
export const bdi = createElementCreator("bdi");
export const bdo = createElementCreator("bdo");
export const wbr = createElementCreator("wbr");

// Lists

export const ol = createElementCreator("ol");
export const ul = createElementCreator("ul");
export const li = createElementCreator("li");
export const dl = createElementCreator("dl");
export const dt = createElementCreator("dt");
export const dd = createElementCreator("dd");

// Embedded Content

export const img = createElementCreator("img");
export const iframe = createElementCreator("iframe");
export const canvas = createElementCreator("canvas");

// Forms

export const form = createElementCreator("form");
export const input = createElementCreator("input");
export const textarea = createElementCreator("textarea");
export const button = createElementCreator("button");
export const select = createElementCreator("select");
export const option = createElementCreator("option");
export const fieldset = createElementCreator("fieldset");
export const legend = createElementCreator("legend");
export const label = createElementCreator("label");
export const datalist = createElementCreator("datalist");
export const optgroup = createElementCreator("optgroup");
export const output = createElementCreator("output");
export const progress = createElementCreator("progress");
export const meter = createElementCreator("meter");

// Sections

export const section = createElementCreator("section");
export const nav = createElementCreator("nav");
export const article = createElementCreator("article");
export const aside = createElementCreator("aside");
export const header = createElementCreator("header");
export const footer = createElementCreator("footer");
export const address = createElementCreator("address");
export const main = createElementCreator("main");

// Figures

export const figure = createElementCreator("figure");
export const figcaption = createElementCreator("figcaption");

// Tables

export const table = createElementCreator("table");
export const caption = createElementCreator("caption");
export const colgroup = createElementCreator("colgroup");
export const col = createElementCreator("col");
export const tbody = createElementCreator("tbody");
export const thead = createElementCreator("thead");
export const tfoot = createElementCreator("tfoot");
export const tr = createElementCreator("tr");
export const td = createElementCreator("td");
export const th = createElementCreator("th");

// Audio and Video

export const audio = createElementCreator("audio");
export const video = createElementCreator("video");
export const source = createElementCreator("source");
export const track = createElementCreator("track");

// Embedded Objects

export const embed = createElementCreator("embed");
export const object = createElementCreator("object");
export const param = createElementCreator("param");

// Interactive elements

export const details = createElementCreator("details");
export const summary = createElementCreator("summary");
export const menu = createElementCreator("menu");

// Other elements

export const applet = createElementCreator("applet");
export const area = createElementCreator("area");
export const base = createElementCreator("base");
export const basefont = createElementCreator("basefont");
export const body = createElementCreator("body");
export const data = createElementCreator("data");
export const dialog = createElementCreator("dialog");
export const dir = createElementCreator("dir");
export const font = createElementCreator("font");
export const frame = createElementCreator("frame");
export const frameset = createElementCreator("frameset");
export const head = createElementCreator("head");
export const hgroup = createElementCreator("hgroup");
export const html = createElementCreator("html");
export const link = createElementCreator("link");
export const map = createElementCreator("map");
export const marquee = createElementCreator("marquee");
export const meta = createElementCreator("meta");
export const noscript = createElementCreator("noscript");
export const picture = createElementCreator("picture");
export const script = createElementCreator("script");
export const slot = createElementCreator("slot");
export const style = createElementCreator("style");
export const template = createElementCreator("template");
export const title = createElementCreator("title");
