const axios = require("axios");

const DEFAULT_COINS = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin" },
  { id: "ethereum", symbol: "eth", name: "Ethereum" },
  { id: "solana", symbol: "sol", name: "Solana" },
  { id: "ripple", symbol: "xrp", name: "XRP" },
  { id: "dogecoin", symbol: "doge", name: "Dogecoin" },
  { id: "cardano", symbol: "ada", name: "Cardano" },
];

const FALLBACK_PRICES = {
  bitcoin: { inr: 5600000, inr_24h_change: 1.8, last_updated_at: Math.floor(Date.now() / 1000) },
  ethereum: { inr: 280000, inr_24h_change: 1.2, last_updated_at: Math.floor(Date.now() / 1000) },
  solana: { inr: 14500, inr_24h_change: 2.1, last_updated_at: Math.floor(Date.now() / 1000) },
  ripple: { inr: 56, inr_24h_change: -0.9, last_updated_at: Math.floor(Date.now() / 1000) },
  dogecoin: { inr: 14, inr_24h_change: 0.6, last_updated_at: Math.floor(Date.now() / 1000) },
  cardano: { inr: 48, inr_24h_change: 0.3, last_updated_at: Math.floor(Date.now() / 1000) },
};

const COINGECKO_API_BASE = process.env.COINGECKO_API_BASE || "https://api.coingecko.com/api/v3";
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const MARKET_TTL_MS = Number(process.env.MARKET_CACHE_TTL_MS || 20000);

let marketCache = {
  data: null,
  fetchedAt: 0,
};

function toMarketPayload(priceRes, marketRes) {
  const marketById = marketRes.data.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  return DEFAULT_COINS.map((coin) => {
    const price = priceRes.data[coin.id] || FALLBACK_PRICES[coin.id];
    const market = marketById[coin.id] || {};
    return {
      coinId: coin.id,
      symbol: (market.symbol || coin.symbol).toUpperCase(),
      name: market.name || coin.name,
      image: market.image || "",
      currentPrice: Number(price?.inr || 0),
      priceChange24h: Number(price?.inr_24h_change || market.price_change_percentage_24h || 0),
      marketCap: Number(market.market_cap || 0),
      high24h: Number(market.high_24h || 0),
      low24h: Number(market.low_24h || 0),
      lastUpdatedAt: new Date((price?.last_updated_at || Math.floor(Date.now() / 1000)) * 1000),
      source: "live",
    };
  });
}

function getFallbackData(source = "fallback") {
  return DEFAULT_COINS.map((coin) => ({
    coinId: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: "",
    currentPrice: Number(FALLBACK_PRICES[coin.id].inr),
    priceChange24h: Number(FALLBACK_PRICES[coin.id].inr_24h_change),
    marketCap: 0,
    high24h: 0,
    low24h: 0,
    lastUpdatedAt: new Date(FALLBACK_PRICES[coin.id].last_updated_at * 1000),
    source,
  }));
}

async function fetchFreshMarketData() {
  const ids = DEFAULT_COINS.map((coin) => coin.id).join(",");
  const headers = {};
  if (COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = COINGECKO_API_KEY;
  }

  const [priceRes, marketRes] = await Promise.all([
    axios.get(`${COINGECKO_API_BASE}/simple/price`, {
      headers,
      params: {
        ids,
        vs_currencies: "inr",
        include_24hr_change: true,
        include_last_updated_at: true,
      },
      timeout: 10000,
    }),
    axios.get(`${COINGECKO_API_BASE}/coins/markets`, {
      headers,
      params: {
        vs_currency: "inr",
        ids,
        order: "market_cap_desc",
        per_page: DEFAULT_COINS.length,
        page: 1,
        sparkline: false,
        price_change_percentage: "24h",
      },
      timeout: 10000,
    }),
  ]);

  const data = toMarketPayload(priceRes, marketRes);
  marketCache = {
    data,
    fetchedAt: Date.now(),
  };
  return data;
}

async function fetchCoinMarketData(options = {}) {
  const { force = false } = options;
  const isCacheFresh = marketCache.data && Date.now() - marketCache.fetchedAt < MARKET_TTL_MS;

  if (!force && isCacheFresh) {
    return marketCache.data.map((item) => ({ ...item, source: item.source === "live" ? "cached-live" : item.source }));
  }

  try {
    return await fetchFreshMarketData();
  } catch (error) {
    console.warn("CoinGecko fetch failed:", error.message);

    if (marketCache.data) {
      return marketCache.data.map((item) => ({ ...item, source: "stale-cache" }));
    }

    return getFallbackData();
  }
}

async function getMarketMap(options = {}) {
  const market = await fetchCoinMarketData(options);
  return market.reduce((acc, item) => {
    acc[item.coinId] = item;
    return acc;
  }, {});
}

module.exports = {
  DEFAULT_COINS,
  fetchCoinMarketData,
  getMarketMap,
};
