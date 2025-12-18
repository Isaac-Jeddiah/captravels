import React, { useState } from "react";
import Turnstile from "react-turnstile";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./styles.css";

function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    dialCode: "971",
    mobile: "",
    privacy: false,
    transfer: false,
    terms: false,
  });
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setError("Password and Confirm Password must match.");
      return;
    }
    if (!form.privacy || !form.transfer || !form.terms) {
      setError("You must consent to all required checkboxes.");
      return;
    }
    if (!captchaToken) {
      setError("Please complete the security check.");
      return;
    }

    try {
      setLoading(true);
      const data = await auth.register({
        email: form.email,
        password: form.password,
        dialCode: form.dialCode,
        mobile: form.mobile,
        captchaToken,
      });
      console.log(data);
      setMessage(data.message || "Registration successful.");
      navigate("/home");
    } catch (err) {
      setError(err.message || "Registration failed.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Create an account</h1>
        <p className="auth-subtitle">
          Please fill in the details to register
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

          <label className="auth-label">
            Confirm Password*
            <input
              className="auth-input"
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </label>

          <label className="auth-label">Mobile Number*</label>
          <div className="auth-inline" style={{ marginBottom: 16 }}>
            <select
              className="auth-input"
              style={{ maxWidth: 100 }}
              name="dialCode"
              value={form.dialCode}
              onChange={handleChange}
            >
              <option value="971">971</option>
              <option value="91">91</option>
              <option value="1">1</option>
            </select>
            <input
              className="auth-input"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              maxLength={9}
              placeholder="Mobile Number without prefix(0)"
              required
            />
          </div>

          <div className="auth-checkbox-row">
            <input
              type="checkbox"
              name="privacy"
              checked={form.privacy}
              onChange={handleChange}
            />
            <span>
              I consent to the processing of my personal data in accordance with
              the Privacy Notice.
            </span>
          </div>

          <div className="auth-checkbox-row">
            <input
              type="checkbox"
              name="transfer"
              checked={form.transfer}
              onChange={handleChange}
            />
            <span>
              I consent to the international transfer of my data between VFS
              Global, the Government whose visa is applied for, and trusted
              affiliates.
            </span>
          </div>

          <div className="auth-checkbox-row">
            <input
              type="checkbox"
              name="terms"
              checked={form.terms}
              onChange={handleChange}
            />
            <span>I have read and agree to the Terms &amp; Conditions.</span>
          </div>

          <div style={{ margin: "12px 0 16px" }}>
           
            <Turnstile
              sitekey={
                import.meta.env.VITE_TURNSTILE_SITEKEY
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
            {loading ? "Continuing..." : "Continue"}
          </button>
        </form>

        <div className="auth-footer-links">
          Already registered with us? <a href="/login">Click here to login</a>
        </div>
      </div>
    </div>
  );
}

export default Register;
