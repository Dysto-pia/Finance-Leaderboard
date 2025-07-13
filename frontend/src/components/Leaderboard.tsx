import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../App";

const PAGE_SIZE = 10;

interface LeaderboardEntry {
  username: string;
  score: number;
  savings?: number;
  createdAt?: string;
  pseudonym?: string;
  optedOut?: boolean;
}

// Add a helper to determine rank based on score
function getRank(score: number): string {
  if (score >= 800) return "Platinum";
  if (score >= 600) return "Gold";
  if (score >= 400) return "Silver";
  return "Bronze";
}

const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { username } = useContext(UserContext);

  // Privacy options for the current user
  const [optedOut, setOptedOut] = useState<boolean>(() => {
    return localStorage.getItem("optedOutLeaderboard") === "true";
  });
  const [pseudonym, setPseudonym] = useState<string>(() => {
    return localStorage.getItem("leaderboardPseudonym") || "";
  });

  // Save privacy options locally and (optionally) to backend
  useEffect(() => {
    localStorage.setItem("optedOutLeaderboard", optedOut ? "true" : "false");
  }, [optedOut]);
  useEffect(() => {
    localStorage.setItem("leaderboardPseudonym", pseudonym);
  }, [pseudonym]);

  useEffect(() => {
    setIsLoading(true);
    fetch(
      `http://localhost:5500/api/leaderboard?page=${page}&limit=${PAGE_SIZE}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Leaderboard data:", data); // Log the data to debug

        // Filter out opted-out users
        const filtered = data.filter(
          (entry: LeaderboardEntry) => !entry.optedOut
        );
        if (page === 1) {
          setEntries(filtered);
        } else {
          setEntries((prev) => [...prev, ...filtered]);
        }
        setHasMore(filtered.length === PAGE_SIZE);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch leaderboard data:", err);
        setError("Failed to fetch leaderboard data. Please try again.");
        setIsLoading(false);
      });
  }, [page]);

  // Handler to update privacy options (simulate backend update)
  const handlePrivacyChange = () => {
    // In a real app, send to backend as well
    // For now, just update local state
  };

  const handleShowMore = () => setPage((p) => p + 1);

  return (
    <div>
      <h2>Financial Leaderboard</h2>

      {/* Privacy options for the current user */}
      {username && (
        <div
          style={{
            marginBottom: 16,
            background: "#f4f8fb",
            padding: 12,
            borderRadius: 6,
          }}
        >
          <strong>Leaderboard Privacy Options:</strong>
          <div style={{ marginTop: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={optedOut}
                onChange={() => {
                  setOptedOut((v) => !v);
                  handlePrivacyChange();
                }}
              />{" "}
              Opt out of public leaderboard
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              Display as pseudonym:{" "}
              <input
                type="text"
                value={pseudonym}
                onChange={(e) => setPseudonym(e.target.value)}
                placeholder="Enter pseudonym"
                maxLength={20}
                style={{ marginLeft: 8 }}
              />
            </label>
          </div>
          <div style={{ fontSize: "0.9em", color: "#666", marginTop: 4 }}>
            (Your real username will be hidden if you use a pseudonym.)
          </div>
        </div>
      )}

      {error && <div className="alert alert-warning">{error}</div>}

      {isLoading && <p>Loading leaderboard...</p>}

      {!isLoading && entries.length === 0 && (
        <p>No entries yet. Be the first to submit your financial data!</p>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Score</th>
            <th>Savings Rate</th>
            <th>Level</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            // If this is the current user and they opted out, skip row
            if (username && entry.username === username && optedOut) {
              return null;
            }
            // Show pseudonym if set and this is the current user
            const displayName =
              username && entry.username === username && pseudonym
                ? pseudonym
                : entry.pseudonym || entry.username;
            return (
              <tr
                key={i}
                className={
                  username && entry.username === username ? "highlight" : ""
                }
              >
                <td>{i + 1}</td>
                <td>{displayName}</td>
                <td>{entry.score}</td>
                <td>
                  {entry.savings !== undefined ? `${entry.savings}%` : "N/A"}
                </td>
                <td>{getRank(entry.score)}</td>
              </tr>
            );
          })}
          {entries.length === 0 && !isLoading && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center" }}>
                No entries yet. Be the first to submit financial data!
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {hasMore && (
        <button className="show-more" onClick={handleShowMore}>
          Show More
        </button>
      )}
    </div>
  );
};

export default Leaderboard;
