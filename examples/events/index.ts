import { Transaction } from "sodiumjs";
import { mainWidget } from "../../src/document";
import { appWidget } from "./widgets";

Transaction.run(() => mainWidget(appWidget));
