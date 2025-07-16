import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../App";
import { Navigate } from "react-router-dom";

interface Lesson {
  title: string;
  content: string;
}

interface LessonsResponse {
  lessons: Lesson[];
  profile: {
    hasGoal: boolean;
    spendingHabit: string;
  };
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  joined: boolean;
  completed: boolean;
  progress: number;
  goalAmount?: number;
  type?: string;
}

const Lessons = () => {
  const { username } = useContext(UserContext);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<{
    hasGoal: boolean;
    spendingHabit: string;
  } | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeLoading, setChallengeLoading] = useState(false);

  const staticChallenges = [
    {
      title: "No-Spend Weekend",
      description:
        "Challenge yourself to spend $0 on non-essentials this weekend. Plan free activities and track your success!",
    },
    {
      title: "Save $100 in 10 Days",
      description:
        "Find creative ways to save or earn an extra $100 in the next 10 days. Cancel unused subscriptions, sell something, or cut back on treats.",
    },
    {
      title: "Meal Prep Week",
      description:
        "Prepare all your meals at home for one week. Track how much you save compared to eating out.",
    },
  ];

  useEffect(() => {
    const fetchLessons = async () => {
      if (!username) return;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5500/api/lessons", {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch lessons");
        }

        const data: LessonsResponse = await response.json();
        setLessons(data.lessons);
        setProfile(data.profile);
      } catch (err) {
        setError(
          "Could not load personalized lessons. Please try again later."
        );
        console.error(err);
        // Fallback to static lessons if API fails
        setLessons([
          {
            title: "Building an Emergency Fund",
            content:
              "Start by saving 3-6 months of expenses in an easily accessible account.",
          },
          {
            title: "Budgeting Basics",
            content:
              "Track all expenses and categorize them to identify where your money goes.",
          },
          {
            title: "Debt Management",
            content:
              "Prioritize high-interest debt while maintaining minimum payments on other debts.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessons();
  }, [username]);

  useEffect(() => {
    const fetchChallenges = async () => {
      if (!username) return;
      setChallengeLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5500/api/challenges", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (res.ok) {
          const data = await res.json();
          setChallenges(data);
        }
      } catch (err) {
        // ignore for now
      } finally {
        setChallengeLoading(false);
      }
    };
    fetchChallenges();
  }, [username]);

  const joinChallenge = async (challengeId: string) => {
    setChallengeLoading(true);
    const token = localStorage.getItem("token");
    await fetch("http://localhost:5500/api/challenges/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ challengeId }),
    });
    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, joined: true } : c))
    );
    setChallengeLoading(false);
  };

  const leaveChallenge = async (challengeId: string) => {
    setChallengeLoading(true);
    const token = localStorage.getItem("token");
    await fetch("http://localhost:5500/api/challenges/leave", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ challengeId }),
    });
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, joined: false, completed: false, progress: 0 }
          : c
      )
    );
    setChallengeLoading(false);
  };

  const completeChallenge = async (challengeId: string) => {
    setChallengeLoading(true);
    const token = localStorage.getItem("token");
    await fetch("http://localhost:5500/api/challenges/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ challengeId }),
    });
    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, completed: true } : c))
    );
    setChallengeLoading(false);
  };

  const updateProgress = async (challengeId: string, progress: number) => {
    setChallengeLoading(true);
    const token = localStorage.getItem("token");
    await fetch("http://localhost:5500/api/challenges/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ challengeId, progress }),
    });
    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, progress } : c))
    );
    setChallengeLoading(false);
  };

  if (!username) {
    return (
      <div className="alert alert-warning">
        <h2>Financial Lessons</h2>
        <div>You must be logged in to view personalized lessons.</div>
        <Navigate to="/auth" replace />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card">
        <h2>Financial Lessons</h2>
        <p>Loading your personalized lessons...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Financial Lessons</h2>

      {profile && (
        <div className="lesson-context">
          <p>
            These lessons are tailored to your
            <strong> {profile.spendingHabit} spending pattern</strong>
            {profile.hasGoal ? " and your financial goals." : "."}
          </p>
        </div>
      )}

      {error && <div className="alert alert-warning">{error}</div>}

      <div className="lessons-container">
        {lessons.map((lesson, index) => (
          <div key={index} className="lesson-card">
            <h3>{lesson.title}</h3>
            <p>{lesson.content}</p>
          </div>
        ))}
      </div>

      {/* Challenges Section */}
      <div style={{ marginTop: "2rem" }}>
        <h3>Challenges</h3>
        {challengeLoading && <div>Loading challenges...</div>}
        <div className="lessons-container">
          {challenges.map((challenge, idx) => (
            <div key={challenge.id} className="lesson-card">
              <h4>{challenge.title}</h4>
              <p>{challenge.description}</p>
              {challenge.joined ? (
                <>
                  {challenge.type === "save-amount" && (
                    <div>
                      <label>
                        Progress: $
                        <input
                          type="number"
                          value={challenge.progress}
                          min={0}
                          max={challenge.goalAmount || 1000}
                          onChange={(e) =>
                            updateProgress(challenge.id, Number(e.target.value))
                          }
                          style={{ width: 80, marginLeft: 4 }}
                        />
                        {challenge.goalAmount
                          ? ` / $${challenge.goalAmount}`
                          : ""}
                      </label>
                      {challenge.progress >= (challenge.goalAmount || 0) &&
                        !challenge.completed && (
                          <button
                            style={{ marginLeft: 8 }}
                            onClick={() => completeChallenge(challenge.id)}
                            disabled={challengeLoading}
                          >
                            Mark as Complete
                          </button>
                        )}
                    </div>
                  )}
                  {challenge.type !== "save-amount" && !challenge.completed && (
                    <button
                      onClick={() => completeChallenge(challenge.id)}
                      disabled={challengeLoading}
                    >
                      Mark as Complete
                    </button>
                  )}
                  {challenge.completed && (
                    <span style={{ color: "green", marginLeft: 8 }}>
                      ✓ Completed
                    </span>
                  )}
                  <button
                    style={{ marginLeft: 8 }}
                    onClick={() => leaveChallenge(challenge.id)}
                    disabled={challengeLoading}
                  >
                    Leave Challenge
                  </button>
                </>
              ) : (
                <button
                  onClick={() => joinChallenge(challenge.id)}
                  disabled={challengeLoading}
                >
                  Join Challenge
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Lessons;
