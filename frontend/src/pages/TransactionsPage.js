
import React, { useCallback, useState } from "react";
import { financeApi } from "../api";
import useAutoRefresh from "../hooks/useAutoRefresh";

const emptyTransaction = {
  type: "expense",
  amount: "",
  category: "",
  description: "",
};

const initialSetup = {
  initialBalance: "",
  monthlyBudget: "",
};

const numberFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export default function TransactionsPage() {
  const [setup, setSetup] = useState(initialSetup);
  const [transaction, setTransaction] = useState(emptyTransaction);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    const { data } = await financeApi.get("/summary");
    setSummary(data);
  }, []);

  useAutoRefresh(fetchSummary, 15000, true);

  async function handleSetupSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const { data } = await financeApi.post("/setup", {
        initialBalance: Number(setup.initialBalance),
        monthlyBudget: Number(setup.monthlyBudget),
      });
      setSummary(data);
      setSetup(initialSetup);
      setMessage("Account setup saved successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save setup.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTransactionSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const { data } = await financeApi.post("/transactions", {
        ...transaction,
        amount: Number(transaction.amount),
      });
      setSummary(data);
      setTransaction(emptyTransaction);
      setMessage("Transaction added successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to add transaction.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setLoading(true);
    setMessage("");
    try {
      const { data } = await financeApi.delete("/reset");
      setSummary(data);
      setMessage("All data reset successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to reset data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-wrap">
      <section className="page-header">
        <div>
          <h1>Transactions & Setup</h1>
          <p>Configure your account, add income or expenses, and review full history.</p>
        </div>
      </section>

      {message ? <div className="info-banner">{message}</div> : null}

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header">
            <h2>Account Setup</h2>
            <span>Cash + budget baseline</span>
          </div>
          <form className="form-grid" onSubmit={handleSetupSubmit}>
            <label>
              Initial Balance
              <input
                type="number"
                value={setup.initialBalance}
                onChange={(e) => setSetup({ ...setup, initialBalance: e.target.value })}
                required
              />
            </label>
            <label>
              Monthly Budget
              <input
                type="number"
                value={setup.monthlyBudget}
                onChange={(e) => setSetup({ ...setup, monthlyBudget: e.target.value })}
                required
              />
            </label>
            <button type="submit" disabled={loading}>Save Setup</button>
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Add Income / Expense</h2>
            <span>Portfolio buys are handled on the Crypto page</span>
          </div>
          <form className="form-grid" onSubmit={handleTransactionSubmit}>
            <label>
              Type
              <select
                value={transaction.type}
                onChange={(e) => setTransaction({ ...transaction, type: e.target.value })}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label>
              Amount
              <input
                type="number"
                value={transaction.amount}
                onChange={(e) => setTransaction({ ...transaction, amount: e.target.value })}
                required
              />
            </label>
            <label>
              Category
              <input
                type="text"
                value={transaction.category}
                onChange={(e) => setTransaction({ ...transaction, category: e.target.value })}
                placeholder="Food, Travel, Freelance..."
              />
            </label>
            <label>
              Description
              <input
                type="text"
                value={transaction.description}
                onChange={(e) => setTransaction({ ...transaction, description: e.target.value })}
                placeholder="Optional note"
              />
            </label>
            <button type="submit" disabled={loading}>Add Transaction</button>
          </form>
        </section>
      </div>

      <section className="stat-grid">
        <div className="stat-card">
          <span>Available Balance</span>
          <strong>{numberFormat.format(summary?.availableBalance || 0)}</strong>
        </div>
        <div className="stat-card">
          <span>Live Portfolio Value</span>
          <strong>{numberFormat.format(summary?.investmentValue || 0)}</strong>
        </div>
        <div className="stat-card">
          <span>Net Worth</span>
          <strong>{numberFormat.format(summary?.netWorth || 0)}</strong>
        </div>
        <div className="stat-card">
          <span>Actions</span>
          <button className="secondary-button" onClick={handleReset} disabled={loading}>Reset All Data</button>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Transaction History</h2>
          <span>Complete financial trail</span>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {summary?.transactions?.length ? (
                summary.transactions.map((item) => (
                  <tr key={item._id}>
                    <td>{item.type}</td>
                    <td>{item.category || "-"}</td>
                    <td>{item.description || "-"}</td>
                    <td>{numberFormat.format(item.amount)}</td>
                    <td>{new Date(item.date).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-cell">No transactions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
