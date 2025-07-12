import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../App";
import { Navigate } from "react-router-dom";

interface ProfileData {
  goal: string;
  fullName: string;
  income: number | null;
  targetSavingsRate: number;
  monthlyBudget: number | null;
  savingsGoal: number | null;
  savingsTimeframe: number | null;
}

const Profile = () => {
  const { username } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [profile, setProfile] = useState<ProfileData>({
    goal: "",
    fullName: "",
    income: null,
    targetSavingsRate: 20, // Default 20%
    monthlyBudget: null,
    savingsGoal: null,
    savingsTimeframe: null,
  });

  // Fetch existing profile
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!username) return;

      try {
        const res = await fetch("http://localhost:5500/api/profile", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });

        if (res.ok) {
          const data = await res.json();
          setProfile((prevProfile) => ({
            ...prevProfile,
            ...data, // Merge with default values
          }));
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    if (username) fetchProfile();
  }, [username]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    // Handle numeric inputs
    if (type === "number") {
      setProfile({
        ...profile,
        [name]: value === "" ? null : Number(value),
      });
    } else {
      setProfile({
        ...profile,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token missing. Please log in again.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("http://localhost:5500/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(profile),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setSuccessMsg("Profile updated successfully!");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!username) {
    return (
      <div className="alert alert-warning">
        <h2>Profile</h2>
        <div>You must be logged in to access your profile.</div>
        <Navigate to="/auth" replace />
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Your Profile</h2>

      {error && <div className="alert alert-warning">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={profile.fullName || ""}
            onChange={handleChange}
            placeholder="Your full name"
          />
        </div>

        <h3>Financial Goals</h3>

        <div className="form-group">
          <label htmlFor="goal">Primary Financial Goal</label>
          <textarea
            id="goal"
            name="goal"
            value={profile.goal || ""}
            onChange={handleChange}
            placeholder="Example: I want to save for a house down payment"
            rows={3}
          ></textarea>
          <small className="form-text">
            Describe your main financial goal. This helps personalize your
            lessons.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="income">Annual Income ($)</label>
          <input
            id="income"
            name="income"
            type="number"
            value={profile.income === null ? "" : profile.income}
            onChange={handleChange}
            placeholder="Your annual income"
          />
        </div>

        <div className="form-group">
          <label htmlFor="targetSavingsRate">Target Savings Rate (%)</label>
          <input
            id="targetSavingsRate"
            name="targetSavingsRate"
            type="number"
            value={profile.targetSavingsRate}
            onChange={handleChange}
            min="1"
            max="90"
          />
          <small className="form-text">
            Aim for at least 15-20% of your income if possible
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="monthlyBudget">Monthly Budget ($)</label>
          <input
            id="monthlyBudget"
            name="monthlyBudget"
            type="number"
            value={profile.monthlyBudget === null ? "" : profile.monthlyBudget}
            onChange={handleChange}
            placeholder="Target monthly spending"
          />
        </div>

        <div className="form-group">
          <label htmlFor="savingsGoal">Savings Goal Amount ($)</label>
          <input
            id="savingsGoal"
            name="savingsGoal"
            type="number"
            value={profile.savingsGoal === null ? "" : profile.savingsGoal}
            onChange={handleChange}
            placeholder="Example: 20000"
          />
        </div>

        <div className="form-group">
          <label htmlFor="savingsTimeframe">Timeframe (months)</label>
          <input
            id="savingsTimeframe"
            name="savingsTimeframe"
            type="number"
            value={
              profile.savingsTimeframe === null ? "" : profile.savingsTimeframe
            }
            onChange={handleChange}
            placeholder="How many months to reach goal"
          />
        </div>

        <button type="submit" className="primary-button" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
};

export default Profile;
