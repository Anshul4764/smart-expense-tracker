const express = require("express");
const { fetchCoinMarketData, getMarketMap } = require("../services/market");
const { getOrCreateState, buildSummaryPayload } = require("../utils/state");

const router = express.Router();

function normalizePositiveNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}

router.get("/market", async (req, res) => {
  try {
    const force = req.query.refresh === "1";
    const market = await fetchCoinMarketData({ force });
    return res.json({ market, refreshedAt: new Date() });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch market data", error: error.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const state = await getOrCreateState();
    const summary = await buildSummaryPayload(state);
    return res.json({
      availableBalance: summary.availableBalance,
      livePortfolioValue: summary.investmentValue,
      totalInvested: summary.holdings.reduce((sum, item) => sum + item.investedAmount, 0),
      totalProfitLoss: summary.holdings.reduce((sum, item) => sum + item.profitLoss, 0),
      netWorth: summary.netWorth,
      holdings: summary.holdings,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch portfolio summary", error: error.message });
  }
});

router.post("/buy", async (req, res) => {
  try {
    const { coinId, amountInInr, buyPrice } = req.body;
    const numericAmount = normalizePositiveNumber(amountInInr);
    const manualBuyPrice = normalizePositiveNumber(buyPrice);

    if (!coinId) {
      return res.status(400).json({ message: "coinId is required" });
    }

    if (!numericAmount) {
      return res.status(400).json({ message: "Investment amount must be greater than 0" });
    }

    const state = await getOrCreateState();

    if (numericAmount > state.availableBalance) {
      return res.status(400).json({ message: "Not enough available balance to invest" });
    }

    const marketMap = await getMarketMap();
    const coin = marketMap[coinId];

    if (!coin || !coin.currentPrice) {
      return res.status(400).json({ message: "Selected crypto is not available right now" });
    }

    const executionPrice = manualBuyPrice || coin.currentPrice;
    const quantity = numericAmount / executionPrice;
    let holding = state.holdings.find((item) => item.coinId === coinId);

    if (!holding) {
      holding = {
        coinId,
        symbol: coin.symbol,
        name: coin.name,
        quantity: 0,
        investedAmount: 0,
        averageBuyPrice: 0,
        image: coin.image || "",
        lastKnownPrice: coin.currentPrice,
        lastUpdatedAt: coin.lastUpdatedAt,
      };
      state.holdings.push(holding);
      holding = state.holdings[state.holdings.length - 1];
    }

    const totalQuantity = holding.quantity + quantity;
    const totalInvestedAmount = holding.investedAmount + numericAmount;

    holding.quantity = totalQuantity;
    holding.investedAmount = totalInvestedAmount;
    holding.averageBuyPrice = totalQuantity > 0 ? totalInvestedAmount / totalQuantity : 0;
    holding.image = coin.image || holding.image;
    holding.symbol = coin.symbol;
    holding.name = coin.name;
    holding.lastKnownPrice = coin.currentPrice;
    holding.lastUpdatedAt = coin.lastUpdatedAt;

    state.availableBalance -= numericAmount;
    state.transactions.push({
      type: "investment",
      amount: numericAmount,
      category: coin.name,
      description: `Bought ${quantity.toFixed(6)} ${coin.symbol} at ${executionPrice.toFixed(2)} INR`,
      coinId,
      quantity,
      unitPrice: executionPrice,
      date: new Date(),
    });

    await state.save();

    return res.json(await buildSummaryPayload(state));
  } catch (error) {
    return res.status(500).json({ message: "Failed to buy crypto", error: error.message });
  }
});

router.post("/sell", async (req, res) => {
  try {
    const { coinId, quantity, sellPrice } = req.body;
    const numericQuantity = normalizePositiveNumber(quantity);
    const manualSellPrice = normalizePositiveNumber(sellPrice);

    if (!coinId) {
      return res.status(400).json({ message: "coinId is required" });
    }

    if (!numericQuantity) {
      return res.status(400).json({ message: "Sell quantity must be greater than 0" });
    }

    const state = await getOrCreateState();
    const holding = state.holdings.find((item) => item.coinId === coinId);

    if (!holding || holding.quantity <= 0) {
      return res.status(400).json({ message: "No holding found for selected crypto" });
    }

    if (numericQuantity > holding.quantity) {
      return res.status(400).json({ message: "You cannot sell more than your current holding" });
    }

    const marketMap = await getMarketMap();
    const coin = marketMap[coinId];
    const executionPrice = manualSellPrice || coin?.currentPrice || holding.lastKnownPrice;

    if (!executionPrice) {
      return res.status(400).json({ message: "Sell price is not available right now" });
    }

    const cashReceived = numericQuantity * executionPrice;
    const averageBuyPrice = holding.averageBuyPrice || 0;
    const costRemoved = numericQuantity * averageBuyPrice;

    holding.quantity -= numericQuantity;
    holding.investedAmount = Math.max(0, holding.investedAmount - costRemoved);
    holding.averageBuyPrice = holding.quantity > 0 ? holding.investedAmount / holding.quantity : 0;
    holding.lastKnownPrice = coin?.currentPrice || executionPrice;
    holding.lastUpdatedAt = coin?.lastUpdatedAt || new Date();

    if (holding.quantity <= 0.00000001) {
      state.holdings = state.holdings.filter((item) => item.coinId !== coinId);
    }

    state.availableBalance += cashReceived;
    state.transactions.push({
      type: "sell",
      amount: cashReceived,
      category: holding.name,
      description: `Sold ${numericQuantity.toFixed(6)} ${holding.symbol} at ${executionPrice.toFixed(2)} INR`,
      coinId,
      quantity: numericQuantity,
      unitPrice: executionPrice,
      date: new Date(),
    });

    await state.save();
    return res.json(await buildSummaryPayload(state));
  } catch (error) {
    return res.status(500).json({ message: "Failed to sell crypto", error: error.message });
  }
});

module.exports = router;
