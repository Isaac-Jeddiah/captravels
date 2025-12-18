import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Welcome{user?.email ? `, ${user.email}` : ""}!</h1>
      <p>You are on the home page.</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}