// Helper function to get token address from symbol or address
export const findAddress = async (content: string): Promise<string> => {
    let target = "";
    let tokenAddress = "";

    // Extract Solana address
    const addressMatch = content.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    if (addressMatch) {
        tokenAddress = addressMatch[0];
    } else if (content.includes("$")) {
        // Extract token symbol after $
        const match = content.match(/\$([a-zA-Z0-9]+)/);
        if (match) {
            target = match[1];

            // Handle special case for WIF token
            if (target.toLowerCase() === "wif") {
                tokenAddress = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm";
            } else if (target.toLowerCase() === "ai16z") {
                // todo: fix this properly

                tokenAddress = "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"; // temporary fix
            } else {
                // Search by symbol and get highest market cap pair
                const response = await fetch(
                    `https://api.dexscreener.com/latest/dex/search/?q=${target}`
                );
                const data = await response.json();

                if (!data.pairs || data.pairs.length === 0) {
                    throw new Error("No pairs found for token symbol");
                }

                console.log("Data:", data.pairs);

                // Filter pairs where base token matches search symbol and is on Solana
                const relevantPairs = data.pairs.filter(
                    (pair) =>
                        (pair.baseToken.symbol
                            .toLowerCase()
                            .includes(target.toLowerCase()) ||
                            pair.baseToken.address
                                .toLowerCase()
                                .includes(target.toLowerCase())) &&
                        pair.chainId === "solana"
                );

                // No relevant pairs found
                if (relevantPairs.length === 0) {
                    throw new Error(
                        "No pairs found where searched token is base token"
                    );
                }

                // First sort by market cap to get the main token contract
                const marketCapSorted = relevantPairs.sort(
                    (a, b) => Number(b.fdv) - Number(a.fdv)
                );
                const mainTokenAddress = marketCapSorted[0].baseToken.address;

                // Then filter for pairs with this token and sort by volume
                const mainTokenPairs = relevantPairs.filter(
                    (pair) => pair.baseToken.address === mainTokenAddress
                );
                const volumeSorted = mainTokenPairs.sort(
                    (a, b) => Number(b.volume.h24) - Number(a.volume.h24)
                );

                tokenAddress = volumeSorted[0].baseToken.address;
            }
        }
    } else {
        // If no address or symbol found, check for bubbacat mention
        // const hasBubbacatMention =
        //     content.toLowerCase().includes("@bubbacat") ||
        //     content.toLowerCase().includes("bubbacat");
        // if (hasBubbacatMention) {
        //     tokenAddress = "418QJC9cHmUXYFDEg78bAZE765WS4PX9Kxwznx2Hpump";
        // }
        tokenAddress = "418QJC9cHmUXYFDEg78bAZE765WS4PX9Kxwznx2Hpump";
    }

    if (!tokenAddress) {
        throw new Error("Could not find valid token symbol or address");
    }

    console.log("Requested token address:", tokenAddress);

    return tokenAddress;
};
