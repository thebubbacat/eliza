import { Plugin } from "@ai16z/eliza/src/types.ts";

import dcaAction from "./actions/dca.ts";
import priceAction from "./actions/price.ts";
import statsAction from "./actions/stats.ts";
import whatIfAction from "./actions/whatif.ts";
import chartAction from "./actions/chart.ts";

export const bubbacatPlugin: Plugin = {
    name: "bubbacat",
    description: "Plugin for basic bubbacat actions",
    actions: [dcaAction, priceAction, statsAction, whatIfAction, chartAction],
    evaluators: [],
    providers: [],
};
