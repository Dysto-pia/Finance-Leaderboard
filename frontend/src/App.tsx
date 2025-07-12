import React, { useState, createContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import Leaderboard from "./components/Leaderboard";
import Dashboard from "./components/Dashboard";
import Auth from "./components/Auth";
import Profile from "./components/Profile";
import FinancialData from "./components/FinancialData";
import Lessons from "./components/Lessons";
import Badges from "./components/Badges";

export const UserContext = createContext<{
  username: string;
  setUsername: (u: string) => void;
}>({ username: "", setUsername: () => {} });

function App() {
  const [username, setUsername] = useState("");

  const handleLogout = () => {
    setUsername("");
    localStorage.removeItem("token");
  };

  return (
    <UserContext.Provider value={{ username, setUsername }}>
      <Router>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/financial">Financial Data</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/lessons">Lessons</Link>
          <Link to="/badges">Badges</Link>
          {!username && <Link to="/auth">Login</Link>}
          {username && (
            <span className="user-info">
              <span>Welcome, {username}!</span>
              <button onClick={handleLogout}>Logout</button>
            </span>
          )}
        </nav>
        <div className="container">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/financial" element={<FinancialData />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/lessons" element={<Lessons />} />
            <Route path="/badges" element={<Badges />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </div>
      </Router>
    </UserContext.Provider>
  );
}

export default App;
