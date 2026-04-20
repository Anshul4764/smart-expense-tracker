const mongoose = require("mongoose");

const holdingSchema = new mongoose.Schema(
  {
    coinId: { type: String, required: true },
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    investedAmount: { type: Number, default: 0 },
    averageBuyPrice: { type: Number, default: 0 },
    image: { type: String, default: "" },
    lastKnownPrice: { type: Number, default: 0 },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["expense", "income", "investment", "sell"],
      required: true,
    },
    category: { type: String, default: "" },
    description: { type: String, default: "" },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    coinId: { type: String, default: "" },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
  },
  { _id: true }
);

const financeStateSchema = new mongoose.Schema(
  {
    initialBalance: { type: Number, default: 0 },
    monthlyBudget: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    holdings: { type: [holdingSchema], default: [] },
    transactions: { type: [transactionSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FinanceState", financeStateSchema);
