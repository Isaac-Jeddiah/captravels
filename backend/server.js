require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const User = require("./models/User");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "https://captravels-nfi7.vercel.app,http://localhost:5173").split(",").map(s => s.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

mongoose.set('strictQuery', false);

// Connect with retries and only start server after Mongo connects
async function connectWithRetry(attempt = 1) {
  const maxAttempts = 5;
  const opts = { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000 };
  try {
    await mongoose.connect(process.env.MONGO_URI, opts);
    console.log("MongoDB connected");
    startServer();
  } catch (err) {
    console.error(`Mongo connect attempt ${attempt} failed:`, err.message || err);
    if (attempt < maxAttempts) {
      const delay = Math.min(30000, 2000 * attempt);
      console.log(`Retrying Mongo connection in ${delay}ms...`);
      setTimeout(() => connectWithRetry(attempt + 1), delay);
    } else {
      console.error("Could not connect to MongoDB after multiple attempts. Exiting.");
      process.exit(1);
    }
  }
}

function startServer() {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

// ensure DB is connected before handling /api requests
function ensureDb(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: "Database not connected" });
  }
  next();
}

// mount DB-check middleware for our API routes
app.use('/api', ensureDb);

// start connecting now
connectWithRetry();

async function verifyTurnstile(token, ip) {
  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const params = new URLSearchParams();
  const secretKey = process.env.APP_ENV === 'production' ? (process.env.TURNSTILE_SECRET_KEY_PROD || process.env.TURNSTILE_SECRET_KEY) : (process.env.TURNSTILE_SECRET_KEY_DEV || process.env.TURNSTILE_SECRET_KEY);
  params.append("secret", secretKey);
  params.append("response", token);
  if (ip) params.append("remoteip", ip);
  try {
    const resp = await axios.post(url, params);
    console.log("Turnstile verify response:", resp.data);
    return resp.data; // return full response for better handling
  } catch (err) {
    console.error("Turnstile verification error:", err.message);
    return { success: false, error: err.message };
  }
}

function createAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
}

function createRefreshToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

function sendRefreshToken(res, token) {
  // httpOnly cookie for refresh token
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

app.post("/api/register", async (req, res) => {
  try {
    console.log("Register body:", req.body);
    const { email, password, dialCode, mobile, captchaToken } = req.body;
    if (!email || !password || !captchaToken) {
      return res
        .status(400)
        .json({ message: "Email, password and captcha are required" });
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const verification = await verifyTurnstile(captchaToken, ip);
    if (!verification || verification.success !== true) {
      console.log("Turnstile verification failed:", verification);
      return res.status(400).json({ message: "Captcha verification failed", details: verification });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const user = new User({ email, password, dialCode, mobile });
    await user.save();

    // create tokens and persist refresh token
    const accessToken = createAccessToken(user._id);
    const refreshToken = createRefreshToken(user._id);
    if (user.setRefreshToken) await user.setRefreshToken(refreshToken);
    else { user.refreshToken = refreshToken; await user.save(); }
    sendRefreshToken(res, refreshToken);

    res.json({ message: "Registration successful", user: { id: user._id, email: user.email }, accessToken });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;
    if (!email || !password || !captchaToken) {
      return res
        .status(400)
        .json({ message: "Email, password and captcha are required" });
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const verification = await verifyTurnstile(captchaToken, ip);
    if (!verification || verification.success !== true) {
      console.log("Turnstile verification failed on login:", verification);
      return res.status(400).json({ message: "Captcha verification failed", details: verification });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    // create tokens
    const accessToken = createAccessToken(user._id);
    const refreshToken = createRefreshToken(user._id);
    if (user.setRefreshToken) await user.setRefreshToken(refreshToken);
    else { user.refreshToken = refreshToken; await user.save(); }
    sendRefreshToken(res, refreshToken);

    res.json({ message: "Login successful", user: { id: user._id, email }, accessToken });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// refresh endpoint - exchanges valid refresh cookie for new access token (rotates refresh token)
app.post('/api/refresh', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const user = await User.findById(payload.userId);
    if (!user || !user.refreshToken || user.refreshToken !== token) return res.status(401).json({ message: 'Refresh token not recognized' });

    const accessToken = createAccessToken(user._id);
    const newRefreshToken = createRefreshToken(user._id);
    if (user.setRefreshToken) await user.setRefreshToken(newRefreshToken);
    else { user.refreshToken = newRefreshToken; await user.save(); }
    sendRefreshToken(res, newRefreshToken);

    res.json({ accessToken, user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// logout - clear refresh token cookie and user stored token
app.post('/api/logout', async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(payload.userId);
        if (user) { user.refreshToken = undefined; await user.save(); }
      } catch (e) { /* ignore invalid token */ }
    }
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
