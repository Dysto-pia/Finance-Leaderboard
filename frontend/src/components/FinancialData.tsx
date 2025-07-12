import React, { useState, useContext } from "react";
import { UserContext } from "../App";
import { Navigate, useNavigate } from "react-router-dom";
import TransactionData from "./TransactionData";

// Add expense categories
interface ExpenseCategories {
  housing: string;
  utilities: string;
  food: string;
  transportation: string;
  healthcare: string;
  entertainment: string;
  other: string;
}

const FinancialData = () => {
  const { username } = useContext(UserContext);
  const [income, setIncome] = useState("");
  const [notes, setNotes] = useState("");
  const [finMessage, setFinMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [submittedSavings, setSubmittedSavings] = useState<string | null>(null);
  const navigate = useNavigate();

  // Replace single expenses with categorical breakdown
  const [expenses, setExpenses] = useState<ExpenseCategories>({
    housing: "",
    utilities: "",
    food: "",
    transportation: "",
    healthcare: "",
    entertainment: "",
    other: "",
  });

  // Add a toggle for simple vs detailed expenses
  const [showDetailedExpenses, setShowDetailedExpenses] = useState(false);
  const [simpleExpenses, setSimpleExpenses] = useState("");

  // Calculate total expenses from categories
  const calculateTotalExpenses = (): number => {
    if (!showDetailedExpenses) {
      return Number(simpleExpenses) || 0;
    }

    return Object.values(expenses).reduce((sum, value) => {
      return sum + (Number(value) || 0);
    }, 0);
  };

  // Update a specific expense category
  const updateExpense = (category: keyof ExpenseCategories, value: string) => {
    setExpenses((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  if (!username) {
    return (
      <div className="alert alert-warning">
        <h2>Financial Data</h2>
        <div>You must be logged in to submit financial data.</div>
        <Navigate to="/auth" replace />
      </div>
    );
  }

  const handleFinancialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setFinMessage("");

    try {
      const totalExpenses = calculateTotalExpenses();
      const monthlyIncome = Number(income);

      if (!monthlyIncome) {
        setError("Monthly income is required");
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token missing. Please log in again.");
        setIsLoading(false);
        return;
      }

      console.log("Submitting financial data:", {
        income: monthlyIncome,
        expenses: totalExpenses,
        expenseBreakdown: showDetailedExpenses ? expenses : null,
        notes,
      });

      const res = await fetch("http://localhost:5500/api/financial-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          income: monthlyIncome,
          expenses: totalExpenses,
          expenseBreakdown: showDetailedExpenses ? expenses : null,
          notes,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to submit financial data");
        }

        setFinMessage(data.message || "Financial data submitted successfully!");

        // Save the score and savings rate if available
        if (data.score !== undefined) setSubmittedScore(data.score);
        if (data.savings !== undefined) setSubmittedSavings(data.savings);

        // Clear form on success
        setIncome("");
        setSimpleExpenses("");
        setExpenses({
          housing: "",
          utilities: "",
          food: "",
          transportation: "",
          healthcare: "",
          entertainment: "",
          other: "",
        });
        setNotes("");

        // Optional: Navigate to leaderboard after successful submission
        setTimeout(() => {
          navigate("/leaderboard");
        }, 2000);
      } else {
        // Handle non-JSON response
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server returned a non-JSON response");
      }
    } catch (err: any) {
      console.error("Error submitting financial data:", err);
      setError(err.message || "Failed to submit financial data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Submit Financial Data</h2>
      <p className="subheading">
        All values should be <strong>monthly</strong> amounts
      </p>

      {error && <div className="alert alert-warning">{error}</div>}

      {finMessage && (
        <div className="alert alert-success">
          {finMessage}
          {submittedScore !== null && submittedSavings !== null && (
            <div className="success-details">
              <p>
                Your score: <strong>{submittedScore}</strong>
              </p>
              <p>
                Your savings rate: <strong>{submittedSavings}%</strong>
              </p>
              <p>Check the leaderboard to see your ranking!</p>
            </div>
          )}
        </div>
      )}

      {/* Add bank connection section */}
      <div className="bank-connection-section">
        <h3>Connect Your Bank</h3>
        <p>Automatically import your financial data from your bank account.</p>
        <TransactionData />
      </div>

      <div className="manual-entry-section">
        <h3>Manual Entry</h3>
        <form onSubmit={handleFinancialSubmit}>
          <div className="form-group">
            <label htmlFor="income">Monthly Income ($)</label>
            <input
              id="income"
              type="number"
              placeholder="Your monthly income"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              required
            />
          </div>

          <div className="expense-toggle">
            <label>
              <input
                type="checkbox"
                checked={showDetailedExpenses}
                onChange={() => setShowDetailedExpenses((prev) => !prev)}
              />
              Use detailed expense categories
            </label>
          </div>

          {!showDetailedExpenses ? (
            <div className="form-group">
              <label htmlFor="simple-expenses">
                Total Monthly Expenses ($)
              </label>
              <input
                id="simple-expenses"
                type="number"
                placeholder="Your total monthly expenses"
                value={simpleExpenses}
                onChange={(e) => setSimpleExpenses(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="expense-categories">
              <h3>Monthly Expense Categories</h3>

              <div className="form-group">
                <label htmlFor="housing">Housing ($)</label>
                <input
                  id="housing"
                  type="number"
                  placeholder="Rent/mortgage"
                  value={expenses.housing}
                  onChange={(e) => updateExpense("housing", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="utilities">Utilities ($)</label>
                <input
                  id="utilities"
                  type="number"
                  placeholder="Electric, water, internet, etc."
                  value={expenses.utilities}
                  onChange={(e) => updateExpense("utilities", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="food">Food ($)</label>
                <input
                  id="food"
                  type="number"
                  placeholder="Groceries, dining out"
                  value={expenses.food}
                  onChange={(e) => updateExpense("food", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="transportation">Transportation ($)</label>
                <input
                  id="transportation"
                  type="number"
                  placeholder="Car payment, gas, public transit"
                  value={expenses.transportation}
                  onChange={(e) =>
                    updateExpense("transportation", e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="healthcare">Healthcare ($)</label>
                <input
                  id="healthcare"
                  type="number"
                  placeholder="Insurance, medications, visits"
                  value={expenses.healthcare}
                  onChange={(e) => updateExpense("healthcare", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="entertainment">Entertainment ($)</label>
                <input
                  id="entertainment"
                  type="number"
                  placeholder="Subscriptions, hobbies"
                  value={expenses.entertainment}
                  onChange={(e) =>
                    updateExpense("entertainment", e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="other">Other ($)</label>
                <input
                  id="other"
                  type="number"
                  placeholder="All other expenses"
                  value={expenses.other}
                  onChange={(e) => updateExpense("other", e.target.value)}
                />
              </div>

              <div className="expense-total">
                Total Monthly Expenses:{" "}
                <strong>${calculateTotalExpenses().toFixed(2)}</strong>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              placeholder="Any notes about your financial situation"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={
              isLoading ||
              !username ||
              !income ||
              (showDetailedExpenses
                ? calculateTotalExpenses() <= 0
                : !simpleExpenses)
            }
          >
            {isLoading ? "Submitting..." : "Submit Financial Data"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FinancialData;
