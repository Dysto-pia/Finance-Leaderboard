import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../App";
import { Navigate } from "react-router-dom";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}

const Badges = () => {
  const { username } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [badges, setBadges] = useState<Badge[]>([]);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [weeklyStreak, setWeeklyStreak] = useState(0);

  useEffect(() => {
    // Fetch streaks from backend
    const fetchStreaks = async () => {
      if (!username) return;
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5500/api/streaks", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (res.ok) {
          const data = await res.json();
          setDailyStreak(data.dailyStreak || 0);
          setWeeklyStreak(data.weeklyStreak || 0);
        }
      } catch (err) {
        // Ignore streak errors for now
      }
    };

    fetchStreaks();

    // Dummy badges logic (unchanged)
    setTimeout(() => {
      const dummyBadges: Badge[] = [
        {
          id: "first_entry",
          name: "First Entry",
          description: "Submit your first financial data",
          icon: "📝",
          earned: true,
          earnedDate: "2023-10-15",
        },
        {
          id: "savings_star",
          name: "Savings Star",
          description: "Achieve a 20% or higher savings rate",
          icon: "⭐",
          earned: true,
          earnedDate: "2023-11-02",
        },
        {
          id: "streak_master",
          name: "Streak Master",
          description: "Submit financial data for 3 consecutive months",
          icon: "🔥",
          earned: false,
        },
        {
          id: "budget_guru",
          name: "Budget Guru",
          description: "Stay under budget for 2 consecutive months",
          icon: "🧠",
          earned: false,
        },
        {
          id: "debt_crusher",
          name: "Debt Crusher",
          description: "Reduce debt by 10% or more",
          icon: "💪",
          earned: false,
        },
      ];
      setBadges(dummyBadges);
      setIsLoading(false);
    }, 1000);
  }, [username]);

  if (!username) {
    return (
      <div className="alert alert-warning">
        <h2>Achievement Badges</h2>
        <div>You must be logged in to view your badges.</div>
        <Navigate to="/auth" replace />
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Achievement Badges</h2>

      {/* Streaks Section */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div>
            <strong>Daily Streak:</strong>{" "}
            <span role="img" aria-label="fire">
              🔥
            </span>{" "}
            {dailyStreak} days
          </div>
          <div>
            <strong>Weekly Streak:</strong>{" "}
            <span role="img" aria-label="calendar">
              📅
            </span>{" "}
            {weeklyStreak} weeks
          </div>
        </div>
        <div style={{ fontSize: "0.95em", color: "#666", marginTop: 4 }}>
          Keep submitting your financial data to build streaks!
        </div>
      </div>

      {isLoading ? (
        <p>Loading badges...</p>
      ) : (
        <div className="badges-container">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`badge-card ${badge.earned ? "earned" : "locked"}`}
            >
              <div className="badge-icon">{badge.icon}</div>
              <div className="badge-info">
                <h3>{badge.name}</h3>
                <p>{badge.description}</p>
                {badge.earned && (
                  <div className="earned-date">
                    Earned on {new Date(badge.earnedDate!).toLocaleDateString()}
                  </div>
                )}
              </div>
              {!badge.earned && <div className="badge-lock">🔒</div>}
            </div>
          ))}
        </div>
      )}

      <div className="badges-info">
        <p>
          Earn badges by reaching financial milestones. Track your progress and
          unlock achievements!
        </p>
      </div>
    </div>
  );
};

export default Badges;
