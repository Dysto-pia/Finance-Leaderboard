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

const Lessons = () => {
  const { username } = useContext(UserContext);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<{
    hasGoal: boolean;
    spendingHabit: string;
  } | null>(null);

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
        <div className="lessons-container">
          {staticChallenges.map((challenge, idx) => (
            <div key={idx} className="lesson-card">
              <h4>{challenge.title}</h4>
              <p>{challenge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Lessons;
