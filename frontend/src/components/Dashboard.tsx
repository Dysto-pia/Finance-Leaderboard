import React, { useState, useContext, useEffect } from "react";
import { UserContext } from "../App";
import { Navigate, useNavigate, Link } from "react-router-dom";

const Dashboard = () => {
  const [recent, setRecent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plaidInsights, setPlaidInsights] = useState<any>(null);
  const [showingPlaidData, setShowingPlaidData] = useState(false);
  const { username } = useContext(UserContext);
  const navigate = useNavigate();

  const refreshData = () => {
    if (username) {
      fetchRecent();
    }
  };

  const fetchRecent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!username) return;

      const res = await fetch(
        "http://localhost:5500/api/financial-data/recent",
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }
      );

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Dashboard data:", data); // Debug log
      setRecent(data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Could not load your financial data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlaidInsights = async () => {
    if (!username) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5500/api/plaid/insights", {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      if (res.status === 400) {
        // No bank connected - this is expected
        setShowingPlaidData(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setPlaidInsights(data);
      setShowingPlaidData(true);
    } catch (err: any) {
      console.error("Error fetching Plaid insights:", err);
      setShowingPlaidData(false);
    }
  };

  useEffect(() => {
    if (username) {
      fetchRecent();
      fetchPlaidInsights();
    }
  }, [username]);

  if (!username) {
    return (
      <div className="alert alert-warning">
        <h2>User Dashboard</h2>
        <div>You must be logged in to access the dashboard.</div>
        <Navigate to="/auth" replace />
      </div>
    );
  }

  return (
    <div className="card">
      <h2>User Dashboard</h2>

      {isLoading && <p>Loading your financial data...</p>}

      {error && <div className="alert alert-warning">{error}</div>}

      {!isLoading && !error && !recent && (
        <div>
          <div className="alert alert-info">
            <p>
              No financial data yet. Start by submitting some financial
              information!
            </p>
            <button onClick={() => navigate("/financial")} className="btn-link">
              Submit Financial Data
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && recent && (
        <div className="dashboard-data">
          <strong>Recent Progress:</strong>
          <div>Last Score: {recent.lastScore ?? "N/A"}</div>
          <div>Last Income: ${recent.lastIncome ?? "N/A"}</div>
          <div>Last Expenses: ${recent.lastExpenses ?? "N/A"}</div>
          <div style={{ marginTop: 10 }}>
            <strong>Insights:</strong>
            <div>{recent.insight ?? "No insights yet."}</div>
          </div>
        </div>
      )}

      {showingPlaidData && plaidInsights && (
        <div className="plaid-insights">
          <h3>Bank Account Insights</h3>
          <div className="insight-cards">
            {plaidInsights.insights.map((insight: string, index: number) => (
              <div key={index} className="insight-card">
                <div className="insight-icon">💡</div>
                <div className="insight-text">{insight}</div>
              </div>
            ))}
          </div>
          <div className="dashboard-actions">
            <Link to="/financial" className="dashboard-button">
              View Full Transaction Data
            </Link>
          </div>
        </div>
      )}

      {!showingPlaidData && (
        <div className="connect-bank-promo">
          <h3>Connect Your Bank Account</h3>
          <p>
            Automatically import your financial data for better insights and
            easier tracking.
          </p>
          <Link to="/financial" className="dashboard-button">
            Connect Now
          </Link>
        </div>
      )}

      <div className="scoring-info">
        <h3>How Scoring Works</h3>
        <p>
          Your score on the leaderboard is calculated based on your savings
          rate:
          <br />
          <code>(Income - Expenses) / Income × 100</code>
        </p>
        <p>
          Higher savings rates earn more points. Submit your financial data to
          see where you rank!
        </p>
      </div>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <button
          onClick={() => navigate("/financial")}
          className="btn-secondary"
        >
          Add New Financial Data
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
