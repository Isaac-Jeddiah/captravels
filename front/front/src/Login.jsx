import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Turnstile from "react-turnstile";
import { TURNSTILE_SITEKEY } from "./config";
import { useAuth } from "./AuthContext";
import "./styles.css";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [captchaToken, setCaptchaToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const navigate = useNavigate();
  const auth = useAuth();

  const sitekey = import.meta.env.VITE_TURNSTILE_SITEKEY || TURNSTILE_SITEKEY;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    
    if (!sitekey) {
      setError("Captcha site key is missing. Set VITE_TURNSTILE_SITEKEY or configure TURNSTILE_SITEKEY in .env");
      return;
    }

    if (!captchaToken) {
      setError("Please complete the security check.");
      return;
    }

    try {
      setLoading(true);
      const data = await auth.login({ ...form, captchaToken });
      setMessage(data.message || "Login successful.");
      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);
      if (err.details) console.info("Verification details:", err.details);
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">
          Enter your email and password to continue
          <br />* denotes mandatory fields
        </p>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <label className="auth-label">
            Email*
            <input
              className="auth-input"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="auth-label">
            Password*
            <input
              className="auth-input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <div style={{ marginBottom: 16 }}>
            
            <Turnstile
              sitekey={import.meta.env.VITE_TURNSTILE_SITEKEY || TURNSTILE_SITEKEY}
              onSuccess={(token) => {
                console.log("Turnstile token:", token);
                setCaptchaToken(token);
              }}
              onError={(err) => {
                console.error("Turnstile error:", err);
                setCaptchaToken("");
              }}
              onExpire={() => {
                console.log("Turnstile expired");
                setCaptchaToken("");
              }}
              theme="light"
            />
          </div>

          <button
            type="submit"
            className="auth-button-primary"
            disabled={loading || !captchaToken}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-footer-links">
          <a href="#forgot">Forgot Password</a>
          <br />
          <a href="#activate">Activate my account</a>
          <br />
          <a href="/register">I don't have an account</a>
        </div>
      </div>
    </div>
  );
}

export default Login;
