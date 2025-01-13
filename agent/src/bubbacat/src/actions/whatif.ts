import { ActionExample, Content, type Action } from "@elizaos/core";
import { abbreviateNumber } from "../utils/abbreviate.ts";
import { getDexscreenerData } from "../utils/get-dexscreener-data.ts";
import { findAddress } from "../utils/find-address.ts";

function processNumberString(str: string): number | null {
    // Remove $ if present and trim whitespace
    str = str.replace("$", "").trim();

    // Check if it's a plain number
    if (!isNaN(parseFloat(str)) && isFinite(parseFloat(str))) {
        return parseFloat(str);
    }

    // Handle K, M, B, T suffixes - try both formats (e.g. "100M" and "M100")
    const units = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

    // Try suffix at end (e.g. "100M")
    const endUnit = str.slice(-1).toUpperCase();
    const endNumber = parseFloat(str.slice(0, -1));
    if (!isNaN(endNumber) && units[endUnit as keyof typeof units]) {
        return endNumber * units[endUnit as keyof typeof units];
    }

    // Try suffix at start (e.g. "M100")
    const startUnit = str.slice(0, 1).toUpperCase();
    const startNumber = parseFloat(str.slice(1));
    if (!isNaN(startNumber) && units[startUnit as keyof typeof units]) {
        return startNumber * units[startUnit as keyof typeof units];
    }

    return null;
}

const whatIfAction: Action = {
    name: "WHAT_IF",
    similes: ["PRICE_TARGET", "MARKET_CAP_TARGET", "COMPARE_MCAP"],
    description:
        "Calculates price targets based on market cap comparisons or direct targets",
    validate: async (runtime, message) => {
        if (!message.content.text) {
            return false;
        }
        const content = message.content.text.toLowerCase();

        // Check for "what if" or "whatif" keywords
        const hasWhatIf =
            content.includes("what if") || content.includes("whatif");

        // Check for token symbols (starting with $)
        const hasTokenSymbol = /\$[A-Za-z0-9]+/.test(content);

        // Check for market cap target (e.g. $100M or M100)
        const hasMarketCapTarget = /\$?\d+[kmbt]?|\$?[kmbt]\d+/i.test(content);

        return hasWhatIf && (hasTokenSymbol || hasMarketCapTarget);
    },
    handler: async (runtime, message, state, options, callback) => {
        if (!message.content.text) {
            return;
        }

        const content = message.content.text;

        // Extract target value - everything after $ until next space
        const targetMatch = content.match(/\$([^ ]+)/);
        const targetValue = targetMatch ? targetMatch[1] : "";

        console.log("targetValue", targetValue);
        if (!targetValue) {
            const errorContent: Content = {
                text: "Please provide either a target market cap (e.g. '$10M' or 'M10') or a token symbol to compare with (e.g. '$pepe').",
                action: "WHATIF_ERROR",
                source: message.content.source,
            };
            await callback(errorContent);
            return;
        }

        try {
            // Get bubbacat current data
            const bubbacatData = await getDexscreenerData({
                type: "token",
                tokenAddress: "418QJC9cHmUXYFDEg78bAZE765WS4PX9Kxwznx2Hpump",
            });

            if (!bubbacatData.priceUsd) {
                throw new Error("Could not fetch bubbacat data");
            }

            const currentPrice = Number(bubbacatData.priceUsd);
            const currentMarketCap = Number(bubbacatData.fdv);

            // Check if target is a market cap value (contains number)
            if (/\d/.test(targetValue)) {
                const targetMc = processNumberString(targetValue);
                if (targetMc === null) {
                    throw new Error("Invalid market cap value");
                }

                const multiplier = targetMc / currentMarketCap;
                const responseContent: Content = {
                    text: `To reach $${abbreviateNumber(targetMc)} market cap:\n• ${multiplier.toFixed(2)}X from here\n• Price would be: $${(currentPrice * multiplier).toFixed(5)}`,
                    action: "WHATIF_RESULT",
                    source: message.content.source,
                };
                await callback(responseContent);
                return responseContent;
            }

            // If target starts with $, it's a token comparison
            const tokenAddress = await findAddress(targetValue);
            if (!tokenAddress) {
                throw new Error("No valid token address found");
            }

            // Get comparison token data
            const comparisonData = await getDexscreenerData({
                type: "token",
                tokenAddress: tokenAddress,
            });

            if (!comparisonData || !comparisonData.fdv) {
                throw new Error("Could not fetch comparison token data");
            }

            const targetMcap = Number(comparisonData.fdv);
            const multiplier = targetMcap / currentMarketCap;

            const responseContent: Content = {
                text: `To reach ${comparisonData.baseToken.name}'s market cap ($${abbreviateNumber(targetMcap)}):\n• ${multiplier.toFixed(2)}X from here\n• Price would be: $${(currentPrice * multiplier).toFixed(5)}`,
                action: "WHATIF_RESULT",
                source: message.content.source,
            };
            await callback(responseContent);
            return responseContent;
        } catch (error) {
            console.error("Error in whatif calculation:", error);
            const errorContent: Content = {
                text: "Sorry, I couldn't perform that calculation right now. Please try again later.",
                action: "WHATIF_ERROR",
                source: message.content.source,
            };
            await callback(errorContent);
            return;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "what if bubbacat reaches $10M market cap?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "To reach $10M market cap:\n• 2.5X from here\n• Price would be: $0.00125",
                    action: "WHATIF_RESULT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "whatif $pepe",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "To reach PEPE's market cap ($500M):\n• 125X from here\n• Price would be: $0.06250",
                    action: "WHATIF_RESULT",
                },
            },
        ],
    ] as ActionExample[][],
};

export default whatIfAction;
