const dotenv = require("dotenv");

dotenv.config();

const config = {
  apiPort: Number.parseInt(process.env.API_PORT || "8080", 10),
  databaseUrl: process.env.DATABASE_URL,
  jwtPrivateKeyPath: process.env.JWT_PRIVATE_KEY_PATH,
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH,
  jwtIssuer: process.env.JWT_ISSUER || "secure-jwt-auth-service",
};

const missing = [];
if (!config.databaseUrl) missing.push("DATABASE_URL");
if (!config.jwtPrivateKeyPath) missing.push("JWT_PRIVATE_KEY_PATH");
if (!config.jwtPublicKeyPath) missing.push("JWT_PUBLIC_KEY_PATH");

if (missing.length > 0) {
  throw new Error(`Missing required env vars: ${missing.join(", ")}`);
}

module.exports = config;
