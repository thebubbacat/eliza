import { ActionExample, Content, type Action } from "@elizaos/core";
import { abbreviateNumber } from "../utils/abbreviate.ts";
import { findAddress } from "../utils/find-address.ts";

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
            content.includes("all dcas") ||
            content.includes("dca list") ||
            content.includes("dcas") ||
            content.includes("active");

        // Check for token identifiers ($ symbol or address format)
        const hasTokenIdentifier =
            content.includes("$") ||
            /[1-9A-HJ-NP-Za-km-z]{32,44}/.test(content);

        return hasDcaKeywords && hasTokenIdentifier;
    },
    handler: async (runtime, message, state, options, callback) => {
        if (!message.content.text) {
            return;
        }

        try {
            const tokenAddress = await findAddress(message.content.text);
            const queryParams = `address=${tokenAddress}`;

            const response = await fetch(
                `https://callisto.so/api/dca/get-active?${queryParams}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": `${process.env.CALLISTO_API_KEY}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text(); // Get response as text first
            let data;
            try {
                data = JSON.parse(text); // Then try to parse it
            } catch (e) {
                console.error("Failed to parse JSON response:", text);
                throw new Error("Invalid JSON response from API");
            }

            if (!data) {
                throw new Error("Invalid response from Callisto API");
            }

            if (data.orders.length === 0) {
                const responseContent: Content = {
                    text: "No active DCA positions found for this token.",
                    action: "DCA_RESULT",
                    source: message.content.source,
                };
                await callback(responseContent);
                return;
            }

            const formatOrder = (order: any, index: number) => {
                try {
                    const frequency = Number(order.order_cycle_frequency) / 60;
                    const conditional =
                        order.order_min_price || order.order_max_price
                            ? ` (conditional - min: $${order.order_min_price || "none"} max: $${order.order_max_price || "none"})`
                            : "";
                    return `${index + 1}. [${order.input_mint_symbol} -> ${order.output_mint_symbol} | Amount: ${abbreviateNumber(order.order_in_amount)} ${order.input_mint_symbol} ($${order.order_size.toFixed(0)}) | Frequency: Every ${frequency} ${frequency > 1 ? "minutes" : "minute"} (${Math.round(order.order_in_amount / order.order_in_amount_per_cycle)} swaps) | Progress: ${(order.progress * 100).toFixed(1)}%${conditional}](https://solscan.io/account/${order.dca_delegate})`;
                } catch (e) {
                    console.error("Error formatting order:", e);
                    return `${index + 1}. [Error formatting order]`;
                }
            };

            const formatStats = (stats: any) => {
                return `\n\nTotal Buy Pressure: $${stats.totalBuyPower.toLocaleString()}\nTotal Sell Pressure: $${stats.totalSellPower.toLocaleString()}`;
            };

            // Sort orders by order_size in descending order
            const sortedOrders = [...data.orders].sort(
                (a, b) => b.order_size - a.order_size
            );

            // Filter orders above $5000 and calculate stats for hidden orders
            const visibleOrders = sortedOrders.filter(
                (order) => order.order_size >= 10000
            );
            const hiddenOrders = sortedOrders.filter(
                (order) => order.order_size < 10000
            );
            const hiddenOrdersTotal = hiddenOrders.reduce(
                (sum, order) => sum + order.order_size,
                0
            );

            let formattedPositions = visibleOrders
                .map(formatOrder)
                .filter(Boolean)
                .join("\n");

            if (hiddenOrders.length > 0) {
                formattedPositions += `\n\n+ ${hiddenOrders.length} more order(s) with total size of $${hiddenOrdersTotal.toFixed(0)} (hidden to avoid spam)`;
            }

            formattedPositions += formatStats(data.stats);

            const responseContent: Content = {
                text: `Found ${data.orders.length} active DCA position(s):\n${formattedPositions}`,
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
