const FinanceState = require("../models/FinanceState");
const { getMarketMap } = require("../services/market");

function buildAlert(state) {
  if (!state.monthlyBudget || state.monthlyBudget <= 0) return "";
  const expenses = state.transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const ratio = expenses / state.monthlyBudget;
  if (ratio >= 1) return "Budget exceeded";
  if (ratio >= 0.8) return "You have spent 80% or more of your monthly budget";
  return "";
}

async function getOrCreateState() {
  let state = await FinanceState.findOne();
  if (!state) {
    state = await FinanceState.create({});
  }
  return state;
}

async function buildSummaryPayload(state, options = {}) {
  const totals = state.transactions.reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + item.amount;
      return acc;
    },
    { expense: 0, income: 0, investment: 0, sell: 0 }
  );

  const byCategory = state.transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => {
      const key = t.category || "Other";
      acc[key] = (acc[key] || 0) + t.amount;
      return acc;
    }, {});

  const marketMap = await getMarketMap(options);
  const holdings = state.holdings
    .map((holding) => {
      const market = marketMap[holding.coinId];
      const currentPrice = market?.currentPrice || holding.lastKnownPrice || 0;
      const currentValue = holding.quantity * currentPrice;
      const profitLoss = currentValue - holding.investedAmount;
      const profitLossPercent =
        holding.investedAmount > 0 ? (profitLoss / holding.investedAmount) * 100 : 0;

      return {
        ...holding.toObject(),
        currentPrice,
        currentValue,
        profitLoss,
        profitLossPercent,
        image: market?.image || holding.image || "",
        lastUpdatedAt: market?.lastUpdatedAt || holding.lastUpdatedAt,
        source: market?.source || "stored",
      };
    })
    .filter((holding) => holding.quantity > 0.00000001);

  const livePortfolioValue = holdings.reduce((sum, item) => sum + item.currentValue, 0);
  const netWorth = state.availableBalance + livePortfolioValue;
  const overspendingAlert = buildAlert(state);

  return {
    initialBalance: state.initialBalance,
    monthlyBudget: state.monthlyBudget,
    availableBalance: state.availableBalance,
    investmentValue: livePortfolioValue,
    netWorth,
    overspendingAlert,
    totals,
    byCategory,
    holdings,
    transactions: [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)),
  };
}

module.exports = {
  buildAlert,
  getOrCreateState,
  buildSummaryPayload,
};
