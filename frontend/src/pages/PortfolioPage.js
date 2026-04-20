import React, { useCallback, useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { portfolioApi } from "../api";
import useAutoRefresh from "../hooks/useAutoRefresh";

const numberFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

function sourceLabel(source) {
  if (source === "live") return "live";
  if (source === "cached-live") return "cached";
  if (source === "stale-cache") return "stale cache";
  return "fallback";
}

export default function PortfolioPage() {
  const [market, setMarket] = useState([]);
  const [summary, setSummary] = useState(null);
  const [buyForm, setBuyForm] = useState({ coinId: "bitcoin", amountInInr: "", buyPrice: "" });
  const [sellForm, setSellForm] = useState({ coinId: "bitcoin", quantity: "", sellPrice: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshMeta, setRefreshMeta] = useState({ refreshedAt: null, source: "" });

  const refresh = useCallback(async (force = false) => {
    const [{ data: marketData }, { data: summaryData }] = await Promise.all([
      portfolioApi.get(`/market${force ? "?refresh=1" : ""}`),
      portfolioApi.get("/summary"),
    ]);
    setMarket(marketData.market || []);
    setSummary(summaryData);
    setRefreshMeta({
      refreshedAt: marketData.refreshedAt,
      source: marketData.market?.[0]?.source || "",
    });
  }, []);

  useAutoRefresh(() => refresh(false), 20000, true);

  async function handleBuy(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await portfolioApi.post("/buy", {
        coinId: buyForm.coinId,
        amountInInr: Number(buyForm.amountInInr),
        buyPrice: buyForm.buyPrice ? Number(buyForm.buyPrice) : undefined,
      });
      setBuyForm({ ...buyForm, amountInInr: "", buyPrice: "" });
      setMessage("Crypto purchase saved successfully.");
      await refresh(true);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to buy crypto.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSell(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await portfolioApi.post("/sell", {
        coinId: sellForm.coinId,
        quantity: Number(sellForm.quantity),
        sellPrice: sellForm.sellPrice ? Number(sellForm.sellPrice) : undefined,
      });
      setSellForm({ ...sellForm, quantity: "", sellPrice: "" });
      setMessage("Crypto sale saved successfully.");
      await refresh(true);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to sell crypto.");
    } finally {
      setLoading(false);
    }
  }

  const holdingChartData = useMemo(() => {
    return (summary?.holdings || []).map((item) => ({
      name: item.symbol,
      value: Number(item.currentValue || 0),
    }));
  }, [summary]);

  const sellableCoins = useMemo(() => {
    return (summary?.holdings || []).filter((item) => item.quantity > 0);
  }, [summary]);

  React.useEffect(() => {
    if (market.length && !market.some((coin) => coin.coinId === buyForm.coinId)) {
      setBuyForm((current) => ({ ...current, coinId: market[0].coinId }));
    }
  }, [market, buyForm.coinId]);

  React.useEffect(() => {
    if (sellableCoins.length && !sellableCoins.some((coin) => coin.coinId === sellForm.coinId)) {
      setSellForm((current) => ({ ...current, coinId: sellableCoins[0].coinId }));
    }
  }, [sellableCoins, sellForm.coinId]);

  return (
    <div className="page-wrap">
      <section className="page-header">
        <div>
          <h1>Crypto Portfolio</h1>
          <p>Live crypto prices, manual buy price support, sell orders, and real-time portfolio value.</p>
        </div>
        <div className="refresh-stack">
          <div className="refresh-badge">Refresh: 20s • Source: {sourceLabel(refreshMeta.source)}</div>
          <button className="secondary-button" type="button" onClick={() => refresh(true)}>Refresh now</button>
        </div>
      </section>

      {message ? <div className="info-banner">{message}</div> : null}

      <section className="stat-grid">
        <div className="stat-card">
          <span>Available Balance</span>
          <strong>{numberFormat.format(summary?.availableBalance || 0)}</strong>
        </div>
        <div className="stat-card">
          <span>Total Invested</span>
          <strong>{numberFormat.format(summary?.totalInvested || 0)}</strong>
        </div>
        <div className="stat-card">
          <span>Live Portfolio Value</span>
          <strong>{numberFormat.format(summary?.livePortfolioValue || 0)}</strong>
        </div>
        <div className="stat-card">
          <span>Total P/L</span>
          <strong className={(summary?.totalProfitLoss || 0) >= 0 ? "positive" : "negative"}>
            {numberFormat.format(summary?.totalProfitLoss || 0)}
          </strong>
        </div>
      </section>

      <div className="dashboard-grid portfolio-grid-enhanced">
        <section className="card">
          <div className="card-header">
            <h2>Live Market</h2>
            <span>{refreshMeta.refreshedAt ? `Last sync: ${new Date(refreshMeta.refreshedAt).toLocaleTimeString()}` : "Waiting for market sync"}</span>
          </div>
          <div className="market-grid">
            {market.map((coin) => (
              <div key={coin.coinId} className="market-card">
                <div className="market-title">
                  {coin.image ? <img src={coin.image} alt={coin.name} className="coin-logo" /> : <div className="coin-logo placeholder">{coin.symbol[0]}</div>}
                  <div>
                    <strong>{coin.name}</strong>
                    <p>{coin.symbol}</p>
                  </div>
                </div>
                <strong>{numberFormat.format(coin.currentPrice)}</strong>
                <p className={coin.priceChange24h >= 0 ? "positive" : "negative"}>
                  {coin.priceChange24h >= 0 ? "+" : ""}{coin.priceChange24h.toFixed(2)}% (24h)
                </p>
                <small className="muted-text">{sourceLabel(coin.source)}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="card form-card-stack">
          <div className="card-header">
            <h2>Buy Crypto</h2>
            <span>Optional manual buy price like a limit order</span>
          </div>
          <form className="form-grid stacked-form" onSubmit={handleBuy}>
            <label>
              Select Crypto
              <select
                value={buyForm.coinId}
                onChange={(e) => setBuyForm({ ...buyForm, coinId: e.target.value })}
              >
                {market.map((coin) => (
                  <option key={coin.coinId} value={coin.coinId}>
                    {coin.name} ({coin.symbol})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount to Invest (INR)
              <input
                type="number"
                step="0.01"
                value={buyForm.amountInInr}
                onChange={(e) => setBuyForm({ ...buyForm, amountInInr: e.target.value })}
                required
              />
            </label>
            <label>
              Buy Price (optional)
              <input
                type="number"
                step="0.0001"
                value={buyForm.buyPrice}
                onChange={(e) => setBuyForm({ ...buyForm, buyPrice: e.target.value })}
                placeholder="Uses live price if left blank"
              />
            </label>
            <button type="submit" disabled={loading}>Save Buy Order</button>
          </form>

          <div className="card-header sell-header">
            <h2>Sell Crypto</h2>
            <span>Sell from your current holdings</span>
          </div>
          <form className="form-grid stacked-form" onSubmit={handleSell}>
            <label>
              Holding to Sell
              <select
                value={sellForm.coinId}
                onChange={(e) => setSellForm({ ...sellForm, coinId: e.target.value })}
                disabled={!sellableCoins.length}
              >
                {sellableCoins.length ? sellableCoins.map((coin) => (
                  <option key={coin.coinId} value={coin.coinId}>
                    {coin.name} ({coin.symbol})
                  </option>
                )) : <option value="">No holdings</option>}
              </select>
            </label>
            <label>
              Quantity to Sell
              <input
                type="number"
                step="0.000001"
                value={sellForm.quantity}
                onChange={(e) => setSellForm({ ...sellForm, quantity: e.target.value })}
                required
                disabled={!sellableCoins.length}
              />
            </label>
            <label>
              Sell Price (optional)
              <input
                type="number"
                step="0.0001"
                value={sellForm.sellPrice}
                onChange={(e) => setSellForm({ ...sellForm, sellPrice: e.target.value })}
                placeholder="Uses live price if left blank"
                disabled={!sellableCoins.length}
              />
            </label>
            <button type="submit" disabled={loading || !sellableCoins.length}>Save Sell Order</button>
          </form>

          <div className="mini-summary">
            <div>
              <span>Net Worth</span>
              <strong>{numberFormat.format(summary?.netWorth || 0)}</strong>
            </div>
            <div>
              <span>Holdings Count</span>
              <strong>{summary?.holdings?.length || 0}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="dashboard-grid portfolio-grid-enhanced">
        <section className="card">
          <div className="card-header">
            <h2>Portfolio Mix</h2>
            <span>Based on live portfolio value</span>
          </div>
          <div className="portfolio-chart-wrap">
            {holdingChartData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={holdingChartData} dataKey="value" nameKey="name" outerRadius={95} label>
                    {holdingChartData.map((entry, index) => <Cell key={`p-${index}`} />)}
                  </Pie>
                  <Tooltip formatter={(value) => numberFormat.format(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state chart-empty">No portfolio data yet.</div>
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <h2>Your Holdings</h2>
          <span>Average buy price, live price, and sell-ready quantity</span>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Coin</th>
                <th>Qty</th>
                <th>Avg Buy</th>
                <th>Current Price</th>
                <th>Invested</th>
                <th>Current Value</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              {summary?.holdings?.length ? (
                summary.holdings.map((item) => (
                  <tr key={item.coinId}>
                    <td>{item.name} ({item.symbol})</td>
                    <td>{item.quantity.toFixed(6)}</td>
                    <td>{numberFormat.format(item.averageBuyPrice)}</td>
                    <td>{numberFormat.format(item.currentPrice)}</td>
                    <td>{numberFormat.format(item.investedAmount)}</td>
                    <td>{numberFormat.format(item.currentValue)}</td>
                    <td className={item.profitLoss >= 0 ? "positive" : "negative"}>
                      {numberFormat.format(item.profitLoss)} ({item.profitLossPercent.toFixed(2)}%)
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-cell">No crypto investments yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
