import {
    Action,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@ai16z/eliza/src/types.ts";

const dcaAction: Action = {
    name: "DCA",
    similes: ["GET_DCA", "ACTIVE_DCA", "CHECK_DCA"],
    description: "Gets active DCA positions for a given token",
    validate: async (runtime, message) => {
        if (!message.content.text) {
            return false;
        }
        const content = message.content.text.toLowerCase();

        // Check for DCA related keywords
        const hasDcaKeywords =
            content.includes("dca") || content.includes("active");

        // Check for token address pattern (42-44 hex chars)
        const hasTokenAddress = /[a-fA-F0-9]{42,44}/.test(content);

        // Check for token symbols (starting with $)
        const hasTokenSymbol = /\$[A-Za-z]+/.test(content);

        return hasDcaKeywords && (hasTokenAddress || hasTokenSymbol);
    },
    handler: async (runtime, message, state, options, callback) => {
        if (!message.content.text) {
            return;
        }

        const content = message.content.text.toLowerCase();
        let queryParams = "";

        // Extract token address if present
        const addressMatch = content.match(/[a-fA-F0-9]{42,44}/);
        if (addressMatch) {
            queryParams = `address=${addressMatch[0]}`;
        } else {
            // Extract token symbol
            const symbolMatch = content.match(/\$([A-Za-z]+)/);
            if (symbolMatch) {
                queryParams = `symbol=${symbolMatch[1]}`;
            }
        }

        if (!queryParams) {
            const errorContent: Content = {
                text: "Please provide a valid token address or symbol (e.g. $FWOG)",
                action: "DCA_ERROR",
                source: message.content.source,
            };
            await callback(errorContent);
            return;
        }

        try {
            const response = await fetch(
                `https://callisto.so/api/dca/get-active?${queryParams}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const data = await response.json();

            if (!data || !Array.isArray(data)) {
                throw new Error("Invalid response from Callisto API");
            }

            if (data.length === 0) {
                const responseContent: Content = {
                    text: "No active DCA positions found for this token.",
                    action: "DCA_RESULT",
                    source: message.content.source,
                };
                await callback(responseContent);
                return;
            }

            const formattedPositions = data
                .map((position: any, index: number) => {
                    return `${index + 1}. Amount: ${position.amount} SOL | Interval: ${position.interval} minutes | Remaining: ${position.remainingAmount} SOL`;
                })
                .join("\n");

            const responseContent: Content = {
                text: `Found ${data.length} active DCA position(s):\n${formattedPositions}`,
                action: "DCA_RESULT",
                source: message.content.source,
            };
            await callback(responseContent);
            return responseContent;
        } catch (error) {
            console.error("Error fetching DCA positions:", error);
            const errorContent: Content = {
                text: "Sorry, I couldn't fetch the DCA positions right now. Please try again later.",
                action: "DCA_ERROR",
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
                    text: "get me active dca's on $fwog",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Found 2 active DCA positions:\n1. Amount: 1 SOL | Interval: 60 minutes | Remaining: 0.5 SOL\n2. Amount: 2 SOL | Interval: 120 minutes | Remaining: 1.5 SOL",
                    action: "DCA_RESULT",
                },
            },
        ],
    ] as ActionExample[][],
};

export default dcaAction;
