import { Action, ActionExample, Content } from "@ai16z/eliza";
import { AttachmentBuilder } from "discord.js";
import { findAddress } from "../utils/find-address.ts";

const chartAction: Action = {
    name: "GET_CHART",
    similes: ["CHECK_CHART", "FETCH_CHART", "PRICE_CHART", "SHOW_CHART"],
    description: "Gets the price chart for tokens",
    validate: async (runtime, message) => {
        if (message.content.text === undefined) {
            return false;
        }
        const content = message.content.text.toLowerCase();

        // Check for chart-related keywords
        const chartKeywords = [
            "chart",
            "graph",
            "trend",
            "movement",
            "price action",
            "technical",
            "ta",
        ];

        // Check if message contains chart keywords
        const hasChartKeyword = chartKeywords.some((keyword) =>
            content.includes(keyword)
        );

        // Check for token identifiers ($ symbol or address format) or bubbacat mention
        const hasTokenIdentifier =
            content.includes("$") ||
            /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(content);

        const hasBubbacatMention =
            content.includes("@bubbacat") || content.includes("bubbacat");

        return hasChartKeyword && (hasTokenIdentifier || hasBubbacatMention);
    },
    handler: async (runtime, message, state, options, callback) => {
        if (message.content.text === undefined) {
            return;
        }

        try {
            const tokenAddress = await findAddress(message.content.text);

            // Add timestamp to prevent caching
            const timestamp = Date.now();
            const chartUrl = `https://io.dexscreener.com/screenshot/chart/solana/${tokenAddress}.png?width=1200&height=600&t=${timestamp}`;

            // Fetch the chart image
            const response = await fetch(chartUrl, {
                headers: {
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch chart: ${response.status}`);
            }

            const imageBuffer = await response.arrayBuffer();
            const attachment = new AttachmentBuilder(Buffer.from(imageBuffer), {
                name: "token-chart.png",
            });

            const displayName =
                tokenAddress === "418QJC9cHmUXYFDEg78bAZE765WS4PX9Kxwznx2Hpump"
                    ? "bubbacat"
                    : message.content.text.includes("$")
                      ? message.content.text.match(/\$([a-zA-Z0-9]+)/)?.[1]
                      : tokenAddress;

            // Send message with attachment first
            await callback(
                {
                    text: `here is the chart for ${displayName}`,
                    action: "CHART_INFO",
                    source: message.content.source,
                },
                [attachment]
            );

            // Return full content object
            return {
                text: `here is the chart for ${displayName}`,
                action: "CHART_INFO",
                source: message.content.source,
                attachments: [
                    {
                        id: "token-chart",
                        url: chartUrl,
                        title: `${displayName.toUpperCase()} Price Chart`,
                        description: "Live price chart from DexScreener",
                        source: "DexScreener",
                        text: "Chart shows price action, volume, and liquidity metrics",
                    },
                ],
            };
        } catch (error) {
            console.error("Error fetching chart:", error);
            const errorContent: Content = {
                text: "Sorry, I couldn't generate the chart right now. Please try again later.",
                action: "CHART_ERROR",
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
                    text: "Show me the bubbacat chart",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here's the current price chart for bubbacat...",
                    action: "GET_CHART",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can I see $WIF's price action?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll fetch the latest chart for WIF...",
                    action: "GET_CHART",
                },
            },
        ],
    ] as ActionExample[][],
};

export default chartAction;
