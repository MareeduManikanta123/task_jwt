const express = require("express");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const path = require("path");
const { pool, initDb } = require("./db");
const { signAccessToken, verifyAccessToken, publicKey } = require("./jwt");
const config = require("./config");
const createLoginRateLimiter = require("./rateLimit");

const app = express();
app.use(helmet());
app.use(express.json());

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, "..")));

function sendError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

const passwordPolicy = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/auth/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return sendError(res, 400, "invalid_request", "Missing required fields.");
    }
    if (!passwordPolicy.test(password)) {
      return sendError(
        res,
        400,
        "weak_password",
        "Password must be at least 8 characters with one number and one special character."
      );
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existing.rows.length > 0) {
      return sendError(res, 409, "conflict", "Username or email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username",
      [username, email, passwordHash]
    );

    return res.status(201).json({
      id: result.rows[0].id,
      username: result.rows[0].username,
      message: "User registered successfully",
    });
  } catch (err) {
    return next(err);
  }
});

const loginRateLimiter = createLoginRateLimiter();

app.post("/auth/login", loginRateLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return sendError(res, 400, "invalid_request", "Missing username or password.");
    }

    const result = await pool.query(
      "SELECT id, username, password_hash FROM users WHERE username = $1",
      [username]
    );
    if (result.rows.length === 0) {
      req.rateLimit.recordFailure(req.rateLimit.ip);
      return sendError(res, 401, "invalid_credentials", "Invalid username or password.");
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      req.rateLimit.recordFailure(req.rateLimit.ip);
      return sendError(res, 401, "invalid_credentials", "Invalid username or password.");
    }

    req.rateLimit.reset(req.rateLimit.ip);

    const accessToken = signAccessToken({ username: user.username, roles: ["user"] });
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, refreshToken, expiresAt]
    );

    return res.status(200).json({
      token_type: "Bearer",
      access_token: accessToken,
      expires_in: 900,
      refresh_token: refreshToken,
    });
  } catch (err) {
    return next(err);
  }
});

app.post("/auth/refresh", async (req, res, next) => {
  try {
    const { refresh_token: refreshToken } = req.body || {};
    if (!refreshToken) {
      return sendError(res, 400, "invalid_request", "refresh_token is required.");
    }

    const result = await pool.query(
      "SELECT rt.token, rt.expires_at, u.username FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token = $1",
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return sendError(res, 401, "invalid_refresh_token", "Refresh token is invalid or expired.");
    }

    const record = result.rows[0];
    if (new Date(record.expires_at) <= new Date()) {
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
      return sendError(res, 401, "invalid_refresh_token", "Refresh token is invalid or expired.");
    }

    const accessToken = signAccessToken({ username: record.username, roles: ["user"] });
    return res.status(200).json({
      token_type: "Bearer",
      access_token: accessToken,
      expires_in: 900,
    });
  } catch (err) {
    return next(err);
  }
});

app.post("/auth/logout", async (req, res, next) => {
  try {
    const { refresh_token: refreshToken } = req.body || {};
    if (!refreshToken) {
      return sendError(res, 400, "invalid_request", "refresh_token is required.");
    }

    await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

function authenticateAccessToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return sendError(res, 401, "invalid_token", "Missing or invalid Authorization header.");
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      username: decoded.sub,
      roles: decoded.roles || ["user"],
    };
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return sendError(res, 401, "token_expired", "Access token has expired.");
    }
    return sendError(res, 401, "invalid_token", "Invalid access token.");
  }
}

app.get("/api/profile", authenticateAccessToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE username = $1",
      [req.user.username]
    );
    if (result.rows.length === 0) {
      return sendError(res, 404, "not_found", "User not found.");
    }

    const user = result.rows[0];
    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      roles: req.user.roles,
    });
  } catch (err) {
    return next(err);
  }
});

app.get("/api/verify-token", (req, res) => {
  const token = req.query.token;
  if (!token || typeof token !== "string") {
    return res.status(200).json({ valid: false, reason: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
      issuer: config.jwtIssuer,
    });
    return res.status(200).json({
      valid: true,
      claims: {
        iss: decoded.iss,
        sub: decoded.sub,
        exp: decoded.exp,
        roles: decoded.roles || ["user"],
      },
    });
  } catch (err) {
    let reason = "Invalid token";
    if (err.name === "TokenExpiredError") {
      reason = "Token has expired";
    } else if (err.name === "JsonWebTokenError") {
      reason = err.message;
    }
    return res.status(200).json({ valid: false, reason });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({
    error: "server_error",
    message: "Internal server error.",
  });
});

async function start() {
  await initDb();
  app.listen(config.apiPort, () => {
    console.log(`API listening on port ${config.apiPort}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
