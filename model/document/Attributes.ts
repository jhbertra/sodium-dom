import { Tag } from "../../src/document";
import * as B from "./Behaviour";

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export type TokenListMap = { [token: string]: B.Behaviour<boolean> };

export interface PropAttribute {
  readonly type: "Prop";
  readonly name: string;
  readonly value: B.Behaviour<unknown>;
}

export interface TokensAttribute {
  readonly type: "Tokens";
  readonly name: string;
  readonly value: B.Behaviour<string[]>;
}

export interface TokenListAttribute {
  readonly type: "TokenList";
  readonly name: string;
  readonly value: TokenListMap;
}

export interface StyleAttribute {
  readonly type: "Style";
  readonly name: string;
  readonly value: B.Behaviour<string>;
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Attribute<T extends Tag = Tag> =
  | PropAttribute
  | TokensAttribute
  | TokenListAttribute
  | StyleAttribute;

export type Attributes<T extends Tag = Tag> = B.Behaviour<Attribute<T>[]>;

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const prop: <T extends Tag>(
  name: string,
  value: B.Behaviour<unknown>,
) => Attribute<T> = (name, value) => ({
  type: "Prop",
  name,
  value,
});

export const tokens: <T extends Tag>(
  name: string,
) => (value: B.Behaviour<string[]>) => Attribute<T> = (name) => (value) => ({
  type: "Tokens",
  name,
  value,
});

export const tokenList: <T extends Tag>(
  name: string,
  value: TokenListMap,
) => Attribute<T> = (name, value) => ({
  type: "TokenList",
  name,
  value,
});

export const style: <T extends Tag>(
  name: string,
  value: B.Behaviour<string>,
) => Attribute<T> = (name, value) => ({
  type: "Style",
  name,
  value,
});

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

export function className<T extends Tag>(
  value: B.Behaviour<string[]>,
): Attribute<T> {
  return tokens("classList")(value);
}

export function classList<T extends Tag>(listMap: TokenListMap): Attribute<T> {
  return tokenList("classList", listMap);
}

export function id<T extends Tag>(value: string): Attribute<T> {
  return prop("id", B.of(value));
}

export function title<T extends Tag>(value: B.Behaviour<string>): Attribute<T> {
  return prop("title", value);
}

export function hidden<T extends Tag>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("hidden", value);
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

export function type<T extends HasType>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("type", value);
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

export function value<T extends HasValue>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("value", value);
}

type HasChecked = "form" | "input";

export function checked<T extends HasChecked>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("checked", value);
}

type HasPlaceholder = "form" | "input" | "textarea";

export function placeholder<T extends HasPlaceholder>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("placeholder", value);
}

type HasSelected = "form" | "option";

export function selected<T extends HasSelected>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("selected", value);
}

type HasAccept = "form" | "input";

export function accept<T extends HasAccept>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("accept", value);
}

export function acceptCharset(value: B.Behaviour<string>): Attribute<"form"> {
  return prop("acceptCharset", value);
}

export function action(value: B.Behaviour<string>): Attribute<"form"> {
  return prop("action", value);
}

type HasAutocomplete = "form" | "input" | "select" | "textarea";

export function autocomplete<T extends HasAutocomplete>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("autocomplete", value);
}

export function autofocus<T extends Tag>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("autofocus", value);
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
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("disabled", value);
}

export function enctype(value: B.Behaviour<string>): Attribute<"form"> {
  return prop("enctype", value);
}

type HasMaxlength = "form" | "input" | "textarea";

export function maxLength<T extends HasMaxlength>(
  value: B.Behaviour<number>,
): Attribute<T> {
  return prop("maxLength", value);
}

type HasMinlength = "form" | "input" | "textarea";

export function minLength<T extends HasMinlength>(
  value: B.Behaviour<number>,
): Attribute<T> {
  return prop("minLength", value);
}

export function method(value: B.Behaviour<"GET" | "POST">): Attribute<"form"> {
  return prop("method", value);
}

type HasMultiple = "form" | "input" | "select";

export function multiple<T extends HasMultiple>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("multiple", value);
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

export function name<T extends HasName>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("name", value);
}

export function novalidate(value: B.Behaviour<boolean>): Attribute<"form"> {
  return prop("novalidate", value);
}

type HasPattern = "form" | "input";

export function pattern<T extends HasPattern>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("pattern", value);
}

export function readonly(value: B.Behaviour<boolean>): Attribute<"form"> {
  return prop("readonly", value);
}

type HasRequired = "form" | "input" | "select" | "textarea";

export function required<T extends HasRequired>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("required", value);
}

type HasSize = "basefont" | "font" | "form" | "hr" | "input" | "select";

export function size<T extends HasSize>(
  value: B.Behaviour<number>,
): Attribute<T> {
  return prop("size", value);
}

export function htmlFor(value: B.Behaviour<string>): Attribute<"label"> {
  return prop("htmlFor", value);
}

type HasMax = "form" | "input" | "meter" | "progress";

export function max<T extends HasMax>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("max", value);
}

type HasMin = "form" | "input" | "meter" | "progress";

export function min<T extends HasMin>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("min", value);
}

type HasStep = "form" | "input" | "meter" | "progress";

export function step<T extends HasStep>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("step", value);
}

type HasCols = "form" | "frameset" | "textarea";

export function cols<T extends HasCols>(
  value: B.Behaviour<number>,
): Attribute<T> {
  return prop("cols", value);
}

type HasRows = "form" | "frameset" | "textarea";

export function rows<T extends HasRows>(
  value: B.Behaviour<number>,
): Attribute<T> {
  return prop("rows", value);
}

type HasWrap = "form" | "textarea";

export function wrap<T extends HasWrap>(
  value: B.Behaviour<"hard" | "soft">,
): Attribute<T> {
  return prop("wrap", value);
}

// Links and areas

type HasHref = "a" | "area" | "base" | "form" | "link";

export function href<T extends HasHref>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("href", value);
}

export function target<T extends HasHref>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("target", value);
}

type HasDownload = "a" | "area" | "form";

export function download<T extends HasDownload>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("download", value);
}

type HasHreflang = "a" | "form" | "link";

export function hreflang<T extends HasHreflang>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("hreflang", value);
}

type HasMedia = "form" | "link" | "source" | "style";

export function media<T extends HasMedia>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("media", value);
}

type HasPing = "a" | "area" | "form";

export function ping<T extends HasPing>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("ping", value);
}

type HasRel = "form" | "a" | "area" | "link";

export function rel<T extends HasRel>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("rel", value);
}

// Maps

type HasIsmap = "form" | "img";

export function isMap<T extends HasIsmap>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("isMap", value);
}

type HasUsemap = "object" | "form" | "img" | "input";

export function useMap<T extends HasUsemap>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("useMap", value);
}

type HasShape = "a" | "area" | "form";

export function shape<T extends HasShape>(
  value: B.Behaviour<"default" | "rect" | "circle" | "poly">,
): Attribute<T> {
  return prop("shape", value);
}

type HasCoords = "a" | "area" | "form";

export function coords<T extends HasCoords>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("coords", value);
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

export function src<T extends HasSrc>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("src", value);
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
  value: B.Behaviour<number>,
): Attribute<T> {
  return prop("height", value);
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

export function width<T extends HasWidth>(
  value: B.Behaviour<number>,
): Attribute<T> {
  return prop("width", value);
}

type HasAlt = "applet" | "area" | "form" | "img" | "input";

export function alt<T extends HasAlt>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("alt", value);
}

// Media

type MediaTag = "audio" | "video";

export function autoplay<T extends MediaTag>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("autoplay", value);
}

export function controls<T extends MediaTag>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("controls", value);
}

export function loop<T extends MediaTag>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("loop", value);
}

export function preload<T extends MediaTag>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("preload", value);
}

export function poster(value: B.Behaviour<string>): Attribute<"video"> {
  return prop("poster", value);
}

export function default_(value: B.Behaviour<boolean>): Attribute<"track"> {
  return prop("default", value);
}

export function kind(value: B.Behaviour<string>): Attribute<"track"> {
  return prop("kind", value);
}

export function srclang(value: B.Behaviour<string>): Attribute<"track"> {
  return prop("srclang", value);
}

// iframes

export function sandbox(value: B.Behaviour<string[]>): Attribute<"iframe"> {
  return tokens("sandbox")(value);
}

export function sandboxList(listMap: TokenListMap): Attribute<"iframe"> {
  return tokenList("sandbox", listMap);
}

export function srcdoc(value: B.Behaviour<string>): Attribute<"iframe"> {
  return prop("srcdoc", value);
}

// Ordered Lists

export function reversed(value: B.Behaviour<boolean>): Attribute<"ol"> {
  return prop("reversed", value);
}

export function start(value: B.Behaviour<number>): Attribute<"ol"> {
  return prop("start", value);
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

export function align<T extends HasAlign>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("align", value);
}

export function colSpan<T extends "td" | "th">(
  value: B.Behaviour<number>,
): Attribute<T> {
  return prop("colSpan", value);
}

export function rowspan<T extends "td" | "th">(
  value: B.Behaviour<number>,
): Attribute<T> {
  return prop("rowSpan", value);
}

export function headers<T extends "td" | "th">(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("headers", value);
}

export function scope<T extends "td" | "th">(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("scope", value);
}

// Less common attributes

export function accessKey<T extends Tag>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("accessKey", value);
}

export function contentEditable<T extends Tag>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("contentEditable", value);
}

export function dir<T extends Tag>(
  value: B.Behaviour<"ltr" | "rtl">,
): Attribute<T> {
  return prop("dir", value);
}

export function draggable<T extends Tag>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("draggable", value);
}

export function lang<T extends Tag>(value: B.Behaviour<string>): Attribute<T> {
  return prop("lang", value);
}

export function spellcheck<T extends Tag>(
  value: B.Behaviour<boolean>,
): Attribute<T> {
  return prop("spellcheck", value);
}

export function tabIndex<T extends Tag>(
  value: B.Behaviour<number>,
): Attribute<T> {
  return prop("tabIndex", value);
}

type HasCite = "blockquote" | "del" | "ins" | "q";

export function cite<T extends HasCite>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("cite", value);
}

type HasDatetime = "del" | "ins" | "time";

export function dateTime<T extends HasDatetime>(
  value: B.Behaviour<string>,
): Attribute<T> {
  return prop("dateTime", value);
}
