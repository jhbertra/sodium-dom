import { Transaction } from "sodiumjs";
import { mainWidget } from "../../src";
import { appWidget } from "./widgets";

Transaction.run(() => mainWidget(appWidget));
