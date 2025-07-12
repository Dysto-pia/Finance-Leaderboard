import React, { useState, useContext } from "react";
import { UserContext } from "../App";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState("");
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const { setUsername: setContextUsername, username: loggedInUsername } =
    useContext(UserContext);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setMessage("Username and password cannot be empty.");
      return;
    }
    const endpoint = isLogin ? "/api/login" : "/api/register";
    const res = await fetch(`http://localhost:5500${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setMessage(data.message || data.error);

    if (res.ok) {
      setContextUsername(username);
      setPassword(""); // Clear password field

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      // If this was a new registration, show the profile prompt
      if (!isLogin) {
        setRegistrationComplete(true);
      } else {
        navigate("/dashboard");
      }
    } else if (!isLogin && data.error === "Username already exists") {
      setMessage("That username is already taken. Please choose another.");
    }
  };

  // Show the post-registration message
  if (registrationComplete) {
    return (
      <div className="auth-card success-registration">
        <h2>Welcome to Finance Leaderboard!</h2>
        <div className="congrats-message">
          <p>Congratulations on creating your account!</p>
          <p>
            Let's set up your profile and financial goals to get the most out of
            the platform.
          </p>
        </div>
        <div className="button-container">
          <button
            className="primary-button"
            onClick={() => navigate("/profile")}
          >
            Set Up Profile Now
          </button>
          <button
            className="secondary-button"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loggedInUsername) {
    return (
      <div className="success-message">
        <h2>Welcome, {loggedInUsername}!</h2>
        <div>You are logged in.</div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h2>{isLogin ? "Log In" : "Sign Up"}</h2>
      <form onSubmit={handleSubmit}>
        <input
          className="auth-input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="auth-input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="auth-button" type="submit">
          {isLogin ? "Log In" : "Sign Up"}
        </button>
      </form>
      <button className="auth-link" onClick={() => setIsLogin(!isLogin)}>
        {isLogin
          ? "Need an account? Sign Up"
          : "Already have an account? Log In"}
      </button>
      {message && (
        <div className="info-message" role="alert">
          {message}
        </div>
      )}
    </div>
  );
};

export default Auth;
