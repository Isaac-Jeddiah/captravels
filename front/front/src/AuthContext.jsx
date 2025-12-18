import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { API_URL } from "./config";
const AuthContext = createContext();

function parseJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);
  const navigate = useNavigate();

  function scheduleRefresh(token) {
    if (!token) return;
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return;
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    // refresh one minute before expiry
    const timeout = Math.max(0, expiresAt - now - 60 * 1000);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refresh().catch(() => {
        // no-op
      });
    }, timeout);
  }

  async function refresh() {
    try {
      const res = await fetch(`${API_URL}/api/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setUser(null);
        setAccessToken(null);
        return null;
      }
      const data = await res.json();
      setUser(data.user);
      setAccessToken(data.accessToken);
      scheduleRefresh(data.accessToken);
      return data;
    } catch (err) {
      setUser(null);
      setAccessToken(null);
      return null;
    }
  }

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  async function login({ email, password, captchaToken }) {
    const res = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, captchaToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || "Login failed");
      err.details = data.details;
      throw err;
    }
    setUser(data.user);
    setAccessToken(data.accessToken);
    scheduleRefresh(data.accessToken);
    return data;
  }

  async function register({ email, password, dialCode, mobile, captchaToken }) {
    const res = await fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, dialCode, mobile, captchaToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || "Registration failed");
      err.details = data.details;
      throw err;
    }
    setUser(data.user);
    setAccessToken(data.accessToken);
    scheduleRefresh(data.accessToken);
    return data;
  }

  async function logout() {
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      // ignore
    }
    setUser(null);
    setAccessToken(null);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    navigate("/login");
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
