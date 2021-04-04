import { Cell } from "sodiumjs";

export type AttributeValue = string | Cell<string>;
export type Attributes = Record<string, AttributeValue>;
