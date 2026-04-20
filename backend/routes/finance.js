const express = require("express");
const FinanceState = require("../models/FinanceState");
const { buildAlert, getOrCreateState, buildSummaryPayload } = require("../utils/state");

const router = express.Router();

router.get("/summary", async (req, res) => {
  try {
    const state = await getOrCreateState();
    return res.json(await buildSummaryPayload(state));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch summary", error: error.message });
  }
});

router.post("/setup", async (req, res) => {
  try {
    const { initialBalance = 0, monthlyBudget = 0 } = req.body;
    const state = await getOrCreateState();

    state.initialBalance = Number(initialBalance) || 0;
    state.monthlyBudget = Number(monthlyBudget) || 0;

    const income = state.transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = state.transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const investments = state.transactions
      .filter((t) => t.type === "investment")
      .reduce((sum, t) => sum + t.amount, 0);

    const sells = state.transactions
      .filter((t) => t.type === "sell")
      .reduce((sum, t) => sum + t.amount, 0);

    state.availableBalance = state.initialBalance + income - expenses - investments + sells;
    state.overspendingAlert = buildAlert(state);

    await state.save();
    return res.json(await buildSummaryPayload(state));
  } catch (error) {
    return res.status(500).json({ message: "Failed to setup account", error: error.message });
  }
});

router.post("/transactions", async (req, res) => {
  try {
    const { type, amount, category = "", description = "", date } = req.body;

    if (!["expense", "income"].includes(type)) {
      return res.status(400).json({ message: "Only expense and income are supported on this route" });
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const state = await getOrCreateState();

    if (type === "expense" && numericAmount > state.availableBalance) {
      return res.status(400).json({ message: "Not enough available balance for this expense" });
    }

    state.transactions.push({
      type,
      amount: numericAmount,
      category,
      description,
      date: date || new Date(),
    });

    if (type === "income") {
      state.availableBalance += numericAmount;
    } else if (type === "expense") {
      state.availableBalance -= numericAmount;
    }

    state.overspendingAlert = buildAlert(state);

    await state.save();
    return res.json(await buildSummaryPayload(state));
  } catch (error) {
    return res.status(500).json({ message: "Failed to add transaction", error: error.message });
  }
});

router.delete("/reset", async (req, res) => {
  try {
    const fullReset = req.query.full === "1";

    if (fullReset) {
      await FinanceState.deleteMany({});
      const freshState = await getOrCreateState();
      return res.json(await buildSummaryPayload(freshState));
    }

    const state = await getOrCreateState();
    state.initialBalance = 0;
    state.monthlyBudget = 0;
    state.availableBalance = 0;
    state.transactions = [];
    state.holdings = [];
    await state.save();

    return res.json(await buildSummaryPayload(state));
  } catch (error) {
    return res.status(500).json({ message: "Failed to reset data", error: error.message });
  }
});

module.exports = router;
