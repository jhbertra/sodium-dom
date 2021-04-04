import { DomEvents } from "./DomEvents";

export interface El {
  readonly element: Element;
  readonly events: DomEvents;
}
