const fs = require("fs");
const jwt = require("jsonwebtoken");
const config = require("./config");

const privateKey = fs.readFileSync(config.jwtPrivateKeyPath, "utf8");
const publicKey = fs.readFileSync(config.jwtPublicKeyPath, "utf8");

function signAccessToken({ username, roles }) {
  return jwt.sign({ roles }, privateKey, {
    algorithm: "RS256",
    expiresIn: 900,
    issuer: config.jwtIssuer,
    subject: username,
    header: {
      typ: "JWT",
    },
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
    issuer: config.jwtIssuer,
  });
}

module.exports = { signAccessToken, verifyAccessToken, publicKey };
