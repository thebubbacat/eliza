import { IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { getDexscreenerData } from "../utils/get-dexscreener-data.ts";
import { abbreviateNumber } from "../utils/abbreviate.ts";

async function getStats(
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State
): Promise<string> {
    try {
        const response = await getDexscreenerData({
            type: "token",
            tokenAddress: "418QJC9cHmUXYFDEg78bAZE765WS4PX9Kxwznx2Hpump",
        });

        if (!response) {
            return "Sorry, I couldn't fetch the stats data right now.";
        }

        let messageText = `📊 Bubbacat Stats 📊\n\n`;

        // Price and Market Cap
        messageText += `💰 Price: $${Number(response.priceUsd).toFixed(8)}\n`;
        messageText += `📈 Market Cap: $${abbreviateNumber(response.fdv ?? 0)}\n`;
        messageText += `💧 Liquidity: $${abbreviateNumber(response.liquidity?.usd ?? 0)}\n\n`;

        // Volume
        messageText += `📊 Volume (24h): $${abbreviateNumber(response.volume.h24)}\n`;
        messageText += `📊 Volume (6h): $${abbreviateNumber(response.volume.h6)}\n`;
        messageText += `📊 Volume (1h): $${abbreviateNumber(response.volume.h1)}\n\n`;

        // Price Changes
        messageText += `📈 Price Change (24h): ${response.priceChange.h24}%\n`;
        messageText += `📈 Price Change (6h): ${response.priceChange.h6}%\n`;
        messageText += `📈 Price Change (1h): ${response.priceChange.h1}%\n\n`;

        // Transactions
        messageText += `🔄 24h Transactions: ${response.txns.h24.buys + response.txns.h24.sells}\n`;
        messageText += `(Buys: ${response.txns.h24.buys} | Sells: ${response.txns.h24.sells})\n`;

        return messageText;
    } catch (error) {
        console.error("Error fetching stats:", error);
        return "Sorry, I couldn't fetch the stats data right now.";
    }
}

export { getStats };
