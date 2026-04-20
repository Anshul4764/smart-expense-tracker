
import React, { useCallback, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  Legend,
} from "recharts";
import { financeApi } from "../api";
import useAutoRefresh from "../hooks/useAutoRefresh";
import StatCard from "../components/StatCard";

const numberFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);

  const fetchSummary = useCallback(async () => {
    const { data } = await financeApi.get("/summary");
    setSummary(data);
  }, []);

  useAutoRefresh(fetchSummary, 15000, true);

  const categoryData = useMemo(() => {
    if (!summary?.byCategory) return [];
    return Object.entries(summary.byCategory).map(([name, value]) => ({ name, value }));
  }, [summary]);

  const totalsData = useMemo(() => {
    if (!summary?.totals) return [];
    return [
      { name: "Income", value: summary.totals.income },
      { name: "Expense", value: summary.totals.expense },
      { name: "Investment", value: summary.totals.investment },
    ];
  }, [summary]);

  const topHoldings = (summary?.holdings || []).slice(0, 4);

  return (
    <div className="page-wrap">
      <section className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Live financial overview with auto-updating net worth and investment value.</p>
        </div>
        <div className="refresh-badge">Auto refresh: 15s</div>
      </section>

      {summary?.overspendingAlert ? <div className="alert-banner">{summary.overspendingAlert}</div> : null}

      <section className="stat-grid">
        <StatCard label="Available Balance" value={numberFormat.format(summary?.availableBalance || 0)} />
        <StatCard label="Live Portfolio Value" value={numberFormat.format(summary?.investmentValue || 0)} />
        <StatCard label="Net Worth" value={numberFormat.format(summary?.netWorth || 0)} />
        <StatCard label="Monthly Budget" value={numberFormat.format(summary?.monthlyBudget || 0)} />
      </section>

      <div className="dashboard-grid">
        <section className="card chart-card">
          <div className="card-header">
            <h2>Expense Breakdown</h2>
            <span>Category wise</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={95} label>
                {categoryData.map((entry, index) => <Cell key={`cell-${index}`} />)}
              </Pie>
              <Tooltip formatter={(value) => numberFormat.format(value)} />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="card chart-card">
          <div className="card-header">
            <h2>Cashflow Overview</h2>
            <span>Income vs expense vs investments</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={totalsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => numberFormat.format(value)} />
              <Legend />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header">
            <h2>Crypto Holdings Snapshot</h2>
            <span>Top positions</span>
          </div>
          <div className="holding-list">
            {topHoldings.length ? (
              topHoldings.map((item) => (
                <div key={item.coinId} className="holding-row">
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.symbol} · {item.quantity.toFixed(6)}</p>
                  </div>
                  <div className="align-right">
                    <strong>{numberFormat.format(item.currentValue)}</strong>
                    <p className={item.profitLoss >= 0 ? "positive" : "negative"}>
                      {item.profitLoss >= 0 ? "+" : ""}{numberFormat.format(item.profitLoss)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No crypto investments yet.</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Recent Activity</h2>
            <span>Latest transactions</span>
          </div>
          <div className="activity-list">
            {(summary?.transactions || []).slice(0, 6).map((item) => (
              <div key={item._id} className="activity-row">
                <div>
                  <strong>{item.category || item.type}</strong>
                  <p>{item.description || item.type}</p>
                </div>
                <div className="align-right">
                  <strong>{numberFormat.format(item.amount)}</strong>
                  <p>{new Date(item.date).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {!summary?.transactions?.length ? <div className="empty-state">No transactions recorded yet.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
