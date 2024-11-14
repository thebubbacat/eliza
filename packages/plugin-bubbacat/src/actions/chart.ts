import { Action, ActionExample, Content } from "@ai16z/eliza/src/types.ts";
import { AttachmentBuilder } from "discord.js";

const chartAction: Action = {
    name: "GET_CHART",
    similes: ["CHECK_CHART", "FETCH_CHART", "PRICE_CHART", "SHOW_CHART"],
    description: "Gets the price chart for the bubbacat token",
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

        // Check if message contains chart keywords and bubbacat mention
        const hasChartKeyword = chartKeywords.some((keyword) =>
            content.includes(keyword)
        );
        const hasBubbacatMention =
            content.includes("@bubbacat") || content.includes("bubbacat");

        return hasChartKeyword && hasBubbacatMention;
    },
    handler: async (runtime, message, state, options, callback) => {
        try {
            // Add timestamp to prevent caching
            const timestamp = Date.now();
            const chartUrl = `https://io.dexscreener.com/screenshot/chart/solana/418QJC9cHmUXYFDEg78bAZE765WS4PX9Kxwznx2Hpump.png?width=1200&height=600&t=${timestamp}`;

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
                name: "bubbacat-chart.png",
            });

            // Send message with attachment first
            await callback(
                {
                    text: "here is the chart for curious frens",
                    action: "CHART_INFO",
                    source: message.content.source,
                },
                [attachment]
            );

            // Return full content object
            return {
                text: "here is the chart for curious frens",
                action: "CHART_INFO",
                source: message.content.source,
                attachments: [
                    {
                        id: "bubbacat-chart",
                        url: chartUrl,
                        title: "Bubbacat Price Chart",
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
                    text: "Can I see bubbacat's price action?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll fetch the latest chart for bubbacat...",
                    action: "GET_CHART",
                },
            },
        ],
    ] as ActionExample[][],
};

export default chartAction;
