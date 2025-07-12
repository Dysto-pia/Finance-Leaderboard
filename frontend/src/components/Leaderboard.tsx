import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../App";

const PAGE_SIZE = 10;

interface LeaderboardEntry {
  username: string;
  score: number;
  savings?: number;
  createdAt?: string;
}

const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { username } = useContext(UserContext);

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

        if (page === 1) {
          setEntries(data);
        } else {
          setEntries((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch leaderboard data:", err);
        setError("Failed to fetch leaderboard data. Please try again.");
        setIsLoading(false);
      });
  }, [page]);

  const handleShowMore = () => setPage((p) => p + 1);

  return (
    <div>
      <h2>Financial Leaderboard</h2>

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
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={i}
              className={
                username && entry.username === username ? "highlight" : ""
              }
            >
              <td>{i + 1}</td>
              <td>{entry.username}</td>
              <td>{entry.score}</td>
              <td>
                {entry.savings !== undefined ? `${entry.savings}%` : "N/A"}
              </td>
            </tr>
          ))}
          {entries.length === 0 && !isLoading && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center" }}>
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
