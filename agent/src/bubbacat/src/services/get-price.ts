import { IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { getDexscreenerData } from "../utils/get-dexscreener-data.ts";
import { findAddress } from "../utils/find-address.ts";
import { abbreviateNumber } from "../utils/abbreviate.ts";

async function getPrice(
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State
): Promise<string> {
    console.log("Getting price data with price provider...");

    try {
        const tokenAddress = await findAddress(_message.content.text || "");

        const response = await getDexscreenerData({
            type: "token",
            tokenAddress,
        });

        if (!response || !response.priceUsd) {
            return "Sorry, I couldn't fetch the price data right now.";
        }

        const displayName =
            tokenAddress === "418QJC9cHmUXYFDEg78bAZE765WS4PX9Kxwznx2Hpump"
                ? "bubbacat"
                : tokenAddress;

        console.log("test123");
        return `${displayName} token is currently trading at $${Number(response.priceUsd).toFixed(5)} with market cap of $${abbreviateNumber(response.fdv ?? 0)}`;
    } catch (error) {
        console.error("Error fetching price:", error);
        return "Sorry, I couldn't fetch the price data right now.";
    }
}

export { getPrice };
