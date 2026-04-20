import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { financeApi } from "../api";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/portfolio", label: "Portfolio" },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState("");

  async function handleFullReset() {
    const confirmed = window.confirm(
      "This will clear all balances, transactions, and holdings from the database. Do you want to continue?"
    );

    if (!confirmed) return;

    setResetting(true);
    setStatus("");
    try {
      await financeApi.delete("/reset?full=1");
      setStatus("Database reset successfully.");
      navigate("/", { replace: true });
      window.location.reload();
    } catch (error) {
      setStatus(error.response?.data?.message || "Failed to reset database.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">₹</div>
          <div>
            <div className="brand">Smart Expense Tracker</div>
            <p className="topbar-copy">Cash, expenses, and live crypto portfolio in one dark dashboard.</p>
          </div>
        </div>

        <nav className="top-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="top-actions">
          <button className="ghost-button" type="button" onClick={() => window.location.reload()}>
            Refresh App
          </button>
          <button className="danger-button" type="button" onClick={handleFullReset} disabled={resetting}>
            {resetting ? "Resetting..." : "Reset Database"}
          </button>
        </div>
      </header>

      {status ? <div className="global-banner">{status}</div> : null}

      <main className="main-content">
        <div className="content-frame">{children}</div>
      </main>
    </div>
  );
}
