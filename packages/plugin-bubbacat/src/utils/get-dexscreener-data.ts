export type QueryOptions =
    { type: 'query', queryString: string } |
    { type: 'token', tokenAddress: string } |
    { type: 'pair', chainId: string, pairAddresses: string[] };

export interface DexScreenerResponse {
    schemaVersion: string;
    pairs: DexscreenerPair[] | null;
}

export interface DexscreenerPair {
    chainId: string;
    dexId: string;
    url: string;
    pairAddress: string;
    baseToken: {
        address: string;
        name: string;
        symbol: string;
    };
    quoteToken: {
        symbol: string;
    };
    priceNative: string;
    priceUsd?: string;
    txns: {
        m5: {
            buys: number;
            sells: number;
        };
        h1: {
            buys: number;
            sells: number;
        };
        h6: {
            buys: number;
            sells: number;
        };
        h24: {
            buys: number;
            sells: number;
        };
    };
    volume: {
        m5: number;
        h1: number;
        h6: number;
        h24: number;
    };
    priceChange: {
        m5: number;
        h1: number;
        h6: number;
        h24: number;
    };
    liquidity?: {
        usd?: number;
        base: number;
        quote: number;
    };
    fdv?: number;
    pairCreatedAt?: number;
}

export async function getDexscreenerData(options: QueryOptions) {
    let url;

    switch (options.type) {
        case 'query':
            url = `https://api.dexscreener.com/latest/dex/search/?q=${options.queryString}`;
            break;
        case 'token':
            url = `https://api.dexscreener.com/latest/dex/tokens/${options.tokenAddress}`;
            break;
        case 'pair':
            url = `https://api.dexscreener.com/latest/dex/pairs/${options.chainId}/${options.pairAddresses.join(',')}`;
            break;
        default:
            url = null;
    }

    if (!url) throw Error("Invalid option type.");

    try {
        const response = await fetch(url)

        const data = await response.json() as DexScreenerResponse

        const pair = data.pairs ? data.pairs[0] : null

        return pair;

    } catch (e) {
        console.error(e);
        throw Error("Couldn't get data from Dexscreener.");
    }

}
