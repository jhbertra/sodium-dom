import { Cell } from "sodiumjs";
import { bindValue, wrapValue, CleanupTask, SetupTask, Value } from "../utils";

// Model

type AttrT = keyof HTMLElementTagNameMap;

type AttributeInternal<T extends AttrT> = SetupTask<HTMLElementTagNameMap[T]>;

declare const attributeSym: unique symbol;
export interface Attribute<T extends AttrT = AttrT> {
  "COMPILE TIME ONLY DO NOT USE IT WILL BE UNDEFINED": {
    identity: typeof attributeSym;
    T: T;
  };
}

function Attribute<T extends AttrT>(
  attribute: AttributeInternal<T>,
): Attribute<T> {
  return (attribute as unknown) as Attribute<T>;
}

function unAttribute<T extends AttrT>(
  attribute: Attribute<T>,
): AttributeInternal<T> {
  return (attribute as unknown) as AttributeInternal<T>;
}

export type Attributes<T extends AttrT = AttrT> = Value<Attribute<T>[]>;

export type TokenListMap = { [token: string]: Value<boolean> };

// Primatives

export function setProperty<T extends AttrT, A>(
  name: string,
  value: Value<A>,
): Attribute<T> {
  return Attribute((element) =>
    bindValue(value, (v) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      element[name] = v;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return () => delete element[name];
    }),
  );
}

export function tokens<T extends AttrT>(
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

export function tokensList<T extends AttrT>(
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

export function type(value: Value<string>): Attribute<HasType> {
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

export function value(value: Value<string>): Attribute<HasValue> {
  return setProperty("value", value);
}

type HasChecked = "form" | "input";

export function checked(value: Value<boolean>): Attribute<HasChecked> {
  return setProperty("checked", value);
}

type HasPlaceholder = "form" | "input" | "textarea";

export function placeholder(value: Value<string>): Attribute<HasPlaceholder> {
  return setProperty("placeholder", value);
}

type HasSelected = "form" | "option";

export function selected(value: Value<boolean>): Attribute<HasSelected> {
  return setProperty("selected", value);
}

type HasAccept = "form" | "input";

export function accept(value: Value<string>): Attribute<HasAccept> {
  return setProperty("accept", value);
}

export function acceptCharset(value: Value<string>): Attribute<"form"> {
  return setProperty("acceptCharset", value);
}

export function action(value: Value<string>): Attribute<"form"> {
  return setProperty("action", value);
}

type HasAutocomplete = "form" | "input" | "select" | "textarea";

export function autocomplete(value: Value<string>): Attribute<HasAutocomplete> {
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

export function disabled(value: Value<boolean>): Attribute<HasDisabled> {
  return setProperty("disabled", value);
}

export function enctype(value: Value<string>): Attribute<"form"> {
  return setProperty("enctype", value);
}

type HasMaxlength = "form" | "input" | "textarea";

export function maxLength(value: Value<number>): Attribute<HasMaxlength> {
  return setProperty("maxLength", value);
}

type HasMinlength = "form" | "input" | "textarea";

export function minLength(value: Value<number>): Attribute<HasMinlength> {
  return setProperty("minLength", value);
}

export function method(value: Value<"GET" | "POST">): Attribute<"form"> {
  return setProperty("method", value as Value<string>);
}

type HasMultiple = "form" | "input" | "select";

export function multiple(value: Value<boolean>): Attribute<HasMultiple> {
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

export function name(value: Value<string>): Attribute<HasName> {
  return setProperty("name", value);
}

export function novalidate(value: Value<boolean>): Attribute<"form"> {
  return setProperty("novalidate", value);
}

type HasPattern = "form" | "input";

export function pattern(value: Value<string>): Attribute<HasPattern> {
  return setProperty("pattern", value);
}

export function readonly(value: Value<boolean>): Attribute<"form"> {
  return setProperty("readonly", value);
}

type HasRequired = "form" | "input" | "select" | "textarea";

export function required(value: Value<boolean>): Attribute<HasRequired> {
  return setProperty("required", value);
}

type HasSize = "basefont" | "font" | "form" | "hr" | "input" | "select";

export function size(value: Value<number>): Attribute<HasSize> {
  return setProperty("size", value);
}

export function htmlFor(value: Value<string>): Attribute<"label"> {
  return setProperty("htmlFor", value);
}

type HasMax = "form" | "input" | "meter" | "progress";

export function max(value: Value<string>): Attribute<HasMax> {
  return setProperty("max", value);
}

type HasMin = "form" | "input" | "meter" | "progress";

export function min(value: Value<string>): Attribute<HasMin> {
  return setProperty("min", value);
}

type HasStep = "form" | "input" | "meter" | "progress";

export function step(value: Value<string>): Attribute<HasStep> {
  return setProperty("step", value);
}

type HasCols = "form" | "frameset" | "textarea";

export function cols(value: Value<number>): Attribute<HasCols> {
  return setProperty("cols", value);
}

type HasRows = "form" | "frameset" | "textarea";

export function rows(value: Value<number>): Attribute<HasRows> {
  return setProperty("rows", value);
}

type HasWrap = "form" | "textarea";

export function wrap(value: Value<"hard" | "soft">): Attribute<HasWrap> {
  return setProperty("wrap", value as Value<string>);
}

// Links and areas

type HasHref = "a" | "area" | "base" | "form" | "link";

export function href(value: Value<string>): Attribute<HasHref> {
  return setProperty("href", value);
}

export function target(value: Value<string>): Attribute<HasHref> {
  return setProperty("target", value);
}

type HasDownload = "a" | "area" | "form";

export function download(value: Value<string>): Attribute<HasDownload> {
  return setProperty("download", value);
}

type HasHreflang = "a" | "form" | "link";

export function hreflang(value: Value<string>): Attribute<HasHreflang> {
  return setProperty("hreflang", value);
}

type HasMedia = "form" | "link" | "source" | "style";

export function media(value: Value<string>): Attribute<HasMedia> {
  return setProperty("media", value);
}

type HasPing = "a" | "area" | "form";

export function ping(value: Value<string>): Attribute<HasPing> {
  return setProperty("ping", value);
}

type HasRel = "form" | "a" | "area" | "link";

export function rel(value: Value<string>): Attribute<HasRel> {
  return setProperty("rel", value);
}

// Maps

type HasIsmap = "form" | "img";

export function isMap(value: Value<boolean>): Attribute<HasIsmap> {
  return setProperty("isMap", value);
}

type HasUsemap = "object" | "form" | "img" | "input";

export function useMap(value: Value<string>): Attribute<HasUsemap> {
  return setProperty("useMap", value);
}

type HasShape = "a" | "area" | "form";

export function shape(
  value: Value<"default" | "rect" | "circle" | "poly">,
): Attribute<HasShape> {
  return setProperty("shape", value as Value<string>);
}

type HasCoords = "a" | "area" | "form";

export function coords(value: Value<string>): Attribute<HasCoords> {
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

export function src(value: Value<string>): Attribute<HasSrc> {
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

export function height(value: Value<number>): Attribute<HasHeight> {
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

export function width(value: Value<number>): Attribute<HasWidth> {
  return setProperty("width", value);
}

type HasAlt = "applet" | "area" | "form" | "img" | "input";

export function alt(value: Value<string>): Attribute<HasAlt> {
  return setProperty("alt", value);
}

// Media

type MediaTag = "audio" | "video";

export function autoplay(value: Value<boolean>): Attribute<MediaTag> {
  return setProperty("autoplay", value);
}

export function controls(value: Value<boolean>): Attribute<MediaTag> {
  return setProperty("controls", value);
}

export function loop(value: Value<boolean>): Attribute<MediaTag> {
  return setProperty("loop", value);
}

export function preload(value: Value<string>): Attribute<MediaTag> {
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

export function align(value: Value<string>): Attribute<HasAlign> {
  return setProperty("align", value);
}

export function colSpan(value: Value<number>): Attribute<"td" | "th"> {
  return setProperty("colSpan", value);
}

export function rowspan(value: Value<number>): Attribute<"td" | "th"> {
  return setProperty("rowSpan", value);
}

export function headers(value: Value<string>): Attribute<"td" | "th"> {
  return setProperty("headers", value);
}

export function scope(value: Value<string>): Attribute<"td" | "th"> {
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

export function cite(value: Value<string>): Attribute<HasCite> {
  return setProperty("cite", value);
}

type HasDatetime = "del" | "ins" | "time";

export function dateTime(value: Value<string>): Attribute<HasDatetime> {
  return setProperty("dateTime", value);
}

// Entry points

export function bindAttributes<T extends AttrT>(
  element: HTMLElementTagNameMap[T],
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
