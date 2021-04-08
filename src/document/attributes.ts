import { Cell } from "sodiumjs";
import { bindValue, wrapValue, CleanupTask, SetupTask, Value } from "../utils";
import { Element, Tag } from "./core";

// Model

type AttributeInternal<T extends Tag> = SetupTask<Element<T>>;

declare const attributeSym: unique symbol;
export interface Attribute<T extends Tag = Tag> {
  "COMPILE TIME ONLY DO NOT USE IT WILL BE UNDEFINED": {
    identity: typeof attributeSym;
    T: T;
  };
}

function Attribute<T extends Tag>(
  attribute: AttributeInternal<T>,
): Attribute<T> {
  return (attribute as unknown) as Attribute<T>;
}

function unAttribute<T extends Tag>(
  attribute: Attribute<T>,
): AttributeInternal<T> {
  return (attribute as unknown) as AttributeInternal<T>;
}

export type Attributes<T extends Tag = Tag> = Value<Attribute<T>[]>;

export type TokenListMap = { [token: string]: Value<boolean> };

// Primatives

export function setProperty<T extends Tag, A>(
  name: string,
  value: Value<A>,
): Attribute<T> {
  return Attribute((element) =>
    bindValue(value, (v) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      element[name] = v;
      return () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete element[name];
      };
    }),
  );
}

export function tokens<T extends Tag>(
  name: string,
  value: Value<string[]>,
): Attribute<T> {
  return Attribute((element) => {
    const tokenList = element[name as keyof HTMLElement] as unknown;
    if (!(tokenList instanceof DOMTokenList)) {
      throw new Error(
        `${name} is not a valid DOMTokenList on element type ${element.tagName}`,
      );
    }
    return bindValue(value, (v) => {
      const tokens = v
        .flatMap((t) => t.split(" "))
        .map((t) => t.trim())
        .filter((t) => t);
      tokenList.add(...tokens);
      return () => tokenList.remove(...tokens);
    });
  });
}

export function tokensList<T extends Tag>(
  name: string,
  listMap: TokenListMap,
): Attribute<T> {
  return tokens(
    name,
    Cell.liftArray(
      Object.keys(listMap)
        // pre-filter any statically disabled tokens
        .filter((token) => listMap[token])
        .map((token) =>
          wrapValue(listMap[token] as Value<boolean>).map(
            (enabled) => [token, enabled] as const,
          ),
        ),
    ).map((names) =>
      names.flatMap(([name, enabled]) => (enabled ? [name] : [])),
    ),
  );
}

export function style(name: string, value: Value<string>): Attribute {
  return Attribute((element) =>
    bindValue(value, (v) => {
      element.style.setProperty(name, v);
      return () => element.style.removeProperty(name);
    }),
  );
}

// Super Common Attributes

export function className(value: Value<string[]>): Attribute {
  return tokens("classList", value);
}

export function classList(listMap: TokenListMap): Attribute {
  return tokensList("classList", listMap);
}

export function id(value: string): Attribute {
  return setProperty("id", value);
}

export function title(value: Value<string>): Attribute {
  return setProperty("title", value);
}

export function hidden(value: Value<boolean>): Attribute {
  return setProperty("hidden", value);
}

// Forms

type HasType =
  | "a"
  | "button"
  | "embed"
  | "form"
  | "input"
  | "li"
  | "link"
  | "object"
  | "ol"
  | "param"
  | "script"
  | "source"
  | "style"
  | "ul";

export function type<T extends HasType>(value: Value<string>): Attribute<T> {
  return setProperty("type", value);
}

type HasValue =
  | "button"
  | "data"
  | "form"
  | "input"
  | "li"
  | "meter"
  | "option"
  | "output"
  | "param"
  | "progress"
  | "select"
  | "textarea";

export function value<T extends HasValue>(value: Value<string>): Attribute<T> {
  return setProperty("value", value);
}

type HasChecked = "form" | "input";

export function checked<T extends HasChecked>(
  value: Value<boolean>,
): Attribute<T> {
  return setProperty("checked", value);
}

type HasPlaceholder = "form" | "input" | "textarea";

export function placeholder<T extends HasPlaceholder>(
  value: Value<string>,
): Attribute<T> {
  return setProperty("placeholder", value);
}

type HasSelected = "form" | "option";

export function selected<T extends HasSelected>(
  value: Value<boolean>,
): Attribute<T> {
  return setProperty("selected", value);
}

type HasAccept = "form" | "input";

export function accept<T extends HasAccept>(
  value: Value<string>,
): Attribute<T> {
  return setProperty("accept", value);
}

export function acceptCharset(value: Value<string>): Attribute<"form"> {
  return setProperty("acceptCharset", value);
}

export function action(value: Value<string>): Attribute<"form"> {
  return setProperty("action", value);
}

type HasAutocomplete = "form" | "input" | "select" | "textarea";

export function autocomplete<T extends HasAutocomplete>(
  value: Value<string>,
): Attribute<T> {
  return setProperty("autocomplete", value);
}

export function autofocus(value: Value<boolean>): Attribute {
  return setProperty("autofocus", value);
}

type HasDisabled =
  | "button"
  | "fieldset"
  | "form"
  | "input"
  | "link"
  | "optgroup"
  | "option"
  | "select"
  | "textarea";

export function disabled<T extends HasDisabled>(
  value: Value<boolean>,
): Attribute<T> {
  return setProperty("disabled", value);
}

export function enctype(value: Value<string>): Attribute<"form"> {
  return setProperty("enctype", value);
}

type HasMaxlength = "form" | "input" | "textarea";

export function maxLength<T extends HasMaxlength>(
  value: Value<number>,
): Attribute<T> {
  return setProperty("maxLength", value);
}

type HasMinlength = "form" | "input" | "textarea";

export function minLength<T extends HasMinlength>(
  value: Value<number>,
): Attribute<T> {
  return setProperty("minLength", value);
}

export function method(value: Value<"GET" | "POST">): Attribute<"form"> {
  return setProperty("method", value as Value<string>);
}

type HasMultiple = "form" | "input" | "select";

export function multiple<T extends HasMultiple>(
  value: Value<boolean>,
): Attribute<T> {
  return setProperty("multiple", value);
}

type HasName =
  | "object"
  | "a"
  | "applet"
  | "button"
  | "embed"
  | "fieldset"
  | "form"
  | "frame"
  | "iframe"
  | "img"
  | "input"
  | "map"
  | "meta"
  | "output"
  | "param"
  | "select"
  | "slot"
  | "textarea";

export function name<T extends HasName>(value: Value<string>): Attribute<T> {
  return setProperty("name", value);
}

export function novalidate(value: Value<boolean>): Attribute<"form"> {
  return setProperty("novalidate", value);
}

type HasPattern = "form" | "input";

export function pattern<T extends HasPattern>(
  value: Value<string>,
): Attribute<T> {
  return setProperty("pattern", value);
}

export function readonly(value: Value<boolean>): Attribute<"form"> {
  return setProperty("readonly", value);
}

type HasRequired = "form" | "input" | "select" | "textarea";

export function required<T extends HasRequired>(
  value: Value<boolean>,
): Attribute<T> {
  return setProperty("required", value);
}

type HasSize = "basefont" | "font" | "form" | "hr" | "input" | "select";

export function size<T extends HasSize>(value: Value<number>): Attribute<T> {
  return setProperty("size", value);
}

export function htmlFor(value: Value<string>): Attribute<"label"> {
  return setProperty("htmlFor", value);
}

type HasMax = "form" | "input" | "meter" | "progress";

export function max<T extends HasMax>(value: Value<string>): Attribute<T> {
  return setProperty("max", value);
}

type HasMin = "form" | "input" | "meter" | "progress";

export function min<T extends HasMin>(value: Value<string>): Attribute<T> {
  return setProperty("min", value);
}

type HasStep = "form" | "input" | "meter" | "progress";

export function step<T extends HasStep>(value: Value<string>): Attribute<T> {
  return setProperty("step", value);
}

type HasCols = "form" | "frameset" | "textarea";

export function cols<T extends HasCols>(value: Value<number>): Attribute<T> {
  return setProperty("cols", value);
}

type HasRows = "form" | "frameset" | "textarea";

export function rows<T extends HasRows>(value: Value<number>): Attribute<T> {
  return setProperty("rows", value);
}

type HasWrap = "form" | "textarea";

export function wrap<T extends HasWrap>(
  value: Value<"hard" | "soft">,
): Attribute<T> {
  return setProperty("wrap", value as Value<string>);
}

// Links and areas

type HasHref = "a" | "area" | "base" | "form" | "link";

export function href<T extends HasHref>(value: Value<string>): Attribute<T> {
  return setProperty("href", value);
}

export function target<T extends HasHref>(value: Value<string>): Attribute<T> {
  return setProperty("target", value);
}

type HasDownload = "a" | "area" | "form";

export function download<T extends HasDownload>(
  value: Value<string>,
): Attribute<T> {
  return setProperty("download", value);
}

type HasHreflang = "a" | "form" | "link";

export function hreflang<T extends HasHreflang>(
  value: Value<string>,
): Attribute<T> {
  return setProperty("hreflang", value);
}

type HasMedia = "form" | "link" | "source" | "style";

export function media<T extends HasMedia>(value: Value<string>): Attribute<T> {
  return setProperty("media", value);
}

type HasPing = "a" | "area" | "form";

export function ping<T extends HasPing>(value: Value<string>): Attribute<T> {
  return setProperty("ping", value);
}

type HasRel = "form" | "a" | "area" | "link";

export function rel<T extends HasRel>(value: Value<string>): Attribute<T> {
  return setProperty("rel", value);
}

// Maps

type HasIsmap = "form" | "img";

export function isMap<T extends HasIsmap>(value: Value<boolean>): Attribute<T> {
  return setProperty("isMap", value);
}

type HasUsemap = "object" | "form" | "img" | "input";

export function useMap<T extends HasUsemap>(
  value: Value<string>,
): Attribute<T> {
  return setProperty("useMap", value);
}

type HasShape = "a" | "area" | "form";

export function shape<T extends HasShape>(
  value: Value<"default" | "rect" | "circle" | "poly">,
): Attribute<T> {
  return setProperty("shape", value as Value<string>);
}

type HasCoords = "a" | "area" | "form";

export function coords<T extends HasCoords>(
  value: Value<string>,
): Attribute<T> {
  return setProperty("coords", value);
}

// Embedded Content

type HasSrc =
  | "audio"
  | "embed"
  | "form"
  | "frame"
  | "iframe"
  | "img"
  | "input"
  | "script"
  | "source"
  | "track"
  | "video";

export function src<T extends HasSrc>(value: Value<string>): Attribute<T> {
  return setProperty("src", value);
}

type HasHeight =
  | "object"
  | "applet"
  | "canvas"
  | "embed"
  | "form"
  | "iframe"
  | "img"
  | "input"
  | "marquee"
  | "td"
  | "th"
  | "video";

export function height<T extends HasHeight>(
  value: Value<number>,
): Attribute<T> {
  return setProperty("height", value);
}

type HasWidth =
  | "object"
  | "applet"
  | "canvas"
  | "col"
  | "colgroup"
  | "embed"
  | "form"
  | "hr"
  | "iframe"
  | "img"
  | "input"
  | "marquee"
  | "pre"
  | "table"
  | "td"
  | "th"
  | "video";

export function width<T extends HasWidth>(value: Value<number>): Attribute<T> {
  return setProperty("width", value);
}

type HasAlt = "applet" | "area" | "form" | "img" | "input";

export function alt<T extends HasAlt>(value: Value<string>): Attribute<T> {
  return setProperty("alt", value);
}

// Media

type MediaTag = "audio" | "video";

export function autoplay<T extends MediaTag>(
  value: Value<boolean>,
): Attribute<T> {
  return setProperty("autoplay", value);
}

export function controls<T extends MediaTag>(
  value: Value<boolean>,
): Attribute<T> {
  return setProperty("controls", value);
}

export function loop<T extends MediaTag>(value: Value<boolean>): Attribute<T> {
  return setProperty("loop", value);
}

export function preload<T extends MediaTag>(
  value: Value<string>,
): Attribute<T> {
  return setProperty("preload", value);
}

export function poster(value: Value<string>): Attribute<"video"> {
  return setProperty("poster", value);
}

export function default_(value: Value<boolean>): Attribute<"track"> {
  return setProperty("default", value);
}

export function kind(value: Value<string>): Attribute<"track"> {
  return setProperty("kind", value);
}

export function srclang(value: Value<string>): Attribute<"track"> {
  return setProperty("srclang", value);
}

// iframes

export function sandbox(value: Value<string[]>): Attribute<"iframe"> {
  return tokens("sandbox", value);
}

export function sandboxList(listMap: TokenListMap): Attribute<"iframe"> {
  return tokensList("sandbox", listMap);
}

export function srcdoc(value: Value<string>): Attribute<"iframe"> {
  return setProperty("srcdoc", value);
}

// Ordered Lists

export function reversed(value: Value<boolean>): Attribute<"ol"> {
  return setProperty("reversed", value);
}

export function start(value: Value<number>): Attribute<"ol"> {
  return setProperty("start", value);
}

// Tables

type HasAlign =
  | "object"
  | "applet"
  | "caption"
  | "col"
  | "colgroup"
  | "div"
  | "embed"
  | "form"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "hr"
  | "iframe"
  | "img"
  | "input"
  | "legend"
  | "p"
  | "table"
  | "tbody"
  | "td"
  | "tfoot"
  | "th"
  | "thead"
  | "tr";

export function align<T extends HasAlign>(value: Value<string>): Attribute<T> {
  return setProperty("align", value);
}

export function colSpan<T extends "td" | "th">(
  value: Value<number>,
): Attribute<T> {
  return setProperty("colSpan", value);
}

export function rowspan<T extends "td" | "th">(
  value: Value<number>,
): Attribute<T> {
  return setProperty("rowSpan", value);
}

export function headers<T extends "td" | "th">(
  value: Value<string>,
): Attribute<T> {
  return setProperty("headers", value);
}

export function scope<T extends "td" | "th">(
  value: Value<string>,
): Attribute<T> {
  return setProperty("scope", value);
}

// Less common attributes

export function accessKey(value: Value<string>): Attribute {
  return setProperty("accessKey", value);
}

export function contentEditable(value: Value<string>): Attribute {
  return setProperty("contentEditable", value);
}

export function dir(value: Value<"ltr" | "rtl">): Attribute {
  return setProperty("dir", value as Value<string>);
}

export function draggable(value: Value<boolean>): Attribute {
  return setProperty("draggable", value);
}

export function lang(value: Value<string>): Attribute {
  return setProperty("lang", value);
}

export function spellcheck(value: Value<boolean>): Attribute {
  return setProperty("spellcheck", value);
}

export function tabIndex(value: Value<number>): Attribute {
  return setProperty("tabIndex", value);
}

type HasCite = "blockquote" | "del" | "ins" | "q";

export function cite<T extends HasCite>(value: Value<string>): Attribute<T> {
  return setProperty("cite", value);
}

type HasDatetime = "del" | "ins" | "time";

export function dateTime<T extends HasDatetime>(
  value: Value<string>,
): Attribute<T> {
  return setProperty("dateTime", value);
}

// Entry points

export function bindAttributes<T extends Tag>(
  element: Element<T>,
  attributes: Attributes<T>,
): CleanupTask {
  const removeAllAttributes = () => {
    while (element.attributes.length > 0) {
      element.removeAttribute((element.attributes[0] as Attr).name);
    }
  };
  return bindValue(attributes, (attrs) => {
    removeAllAttributes();
    for (const attr of attrs.map(unAttribute)) {
      attr(element);
    }
    return removeAllAttributes;
  });
}
