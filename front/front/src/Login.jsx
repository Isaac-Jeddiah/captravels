import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Turnstile from "react-turnstile";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    
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
              sitekey={
                import.meta.env.VITE_TURNSTILE_SITEKEY ||
                "0x4AAAAAACHUanDDTh-MvmtyamZ6oiyn-HI"
              }
              onSuccess={(token) => setCaptchaToken(token)}
              onError={() => setCaptchaToken("")}
              onExpire={() => setCaptchaToken("")}
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
