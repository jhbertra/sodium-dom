/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { flow } from "fp-ts/lib/function";
import * as T from "fp-ts/lib/Tuple";
import * as B from "./Behaviour";
import { run } from "./domBuilder";
import { Element } from "./Document";
import { unW } from "./Widget";

const renderElement = (element: Element): HTMLElement => {
  const el = document.createElement(element.tag);
  for (const [prop, value] of Object.entries(element.props)) {
    (el as any)[prop] = value;
  }
  for (const [attr, value] of Object.entries(element.attributes)) {
    el.setAttribute(attr, value);
  }
  for (const [style, value] of Object.entries(element.style)) {
    (el.style as any)[style] = value;
  }
  for (const clazz of Object.keys(element.classList)) {
    el.classList.add(clazz);
  }
  for (const child of element.children) {
    if (child.type === "Element") {
      el.append(renderElement(child));
    } else {
      el.append(document.createTextNode(child.data));
    }
  }
  return el as HTMLElement;
};

export const renderDomBuilder = flow(run("body"), renderElement);

export const renderWidget = flow(
  unW,
  (w) => w(),
  T.mapSnd(B.map(renderDomBuilder)),
);

export const runWidget = flow(unW, (w) => w(), T.mapSnd(B.map(run("body"))));
