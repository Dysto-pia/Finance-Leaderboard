import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../App";
import PlaidConnect from "./PlaidConnect";

interface Transaction {
  transaction_id: string;
  date: string;
  name: string;
  amount: number;
  category: string[];
}

interface TransactionSummary {
  totalExpenses: number;
  totalIncome: number;
  categories: Record<string, number>;
  savingsRate: number;
}

const TransactionData: React.FC = () => {
  const { username } = useContext(UserContext);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  // Fetch transactions when component mounts or connection status changes
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!username) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          "http://localhost:5500/api/plaid/transactions",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.status === 400) {
          // 400 means no connection yet - this is expected
          setConnected(false);
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setTransactions(data.transactions);
        setSummary(data.summary);
        setConnected(true);
      } catch (error: any) {
        console.error("Error fetching transactions:", error);

        if (error.message?.includes("No connected bank account")) {
          setConnected(false);
        } else {
          setError(error.message || "Failed to fetch transaction data");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [username, connected]);

  // Handle successful connection
  const handleConnectionSuccess = () => {
    setConnected(true);
  };

  if (!username) {
    return null;
  }

  return (
    <div className="transaction-data-container">
      <h3>Banking Data</h3>

      <PlaidConnect onSuccess={handleConnectionSuccess} />

      {error && <div className="alert alert-warning">{error}</div>}

      {isLoading ? (
        <div className="loading">Loading your transaction data...</div>
      ) : connected && summary ? (
        <div className="transaction-summary">
          <div className="summary-stats">
            <div className="stat-card">
              <h4>Income (30 days)</h4>
              <div className="amount income">
                ${summary.totalIncome.toFixed(2)}
              </div>
            </div>
            <div className="stat-card">
              <h4>Expenses (30 days)</h4>
              <div className="amount expense">
                ${summary.totalExpenses.toFixed(2)}
              </div>
            </div>
            <div className="stat-card">
              <h4>Savings Rate</h4>
              <div className="amount">{summary.savingsRate.toFixed(1)}%</div>
            </div>
          </div>

          <h4>Top Expense Categories</h4>
          <div className="category-breakdown">
            {Object.entries(summary.categories)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([category, amount], index) => (
                <div className="category-row" key={index}>
                  <span className="category-name">{category}</span>
                  <span className="category-amount">${amount.toFixed(2)}</span>
                  <div
                    className="category-bar"
                    style={{
                      width: `${(amount / summary.totalExpenses) * 100}%`,
                    }}
                  />
                </div>
              ))}
          </div>

          {transactions.length > 0 && (
            <>
              <h4>Recent Transactions</h4>
              <div className="transactions-list">
                {transactions.map((transaction) => (
                  <div
                    className="transaction-item"
                    key={transaction.transaction_id}
                  >
                    <div className="transaction-date">
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                    <div className="transaction-name">{transaction.name}</div>
                    <div
                      className={`transaction-amount ${
                        transaction.amount < 0 ? "income" : "expense"
                      }`}
                    >
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : connected === false ? (
        <div className="no-connection-message">
          Connect your bank account to automatically import your transactions.
        </div>
      ) : null}
    </div>
  );
};

export default TransactionData;
