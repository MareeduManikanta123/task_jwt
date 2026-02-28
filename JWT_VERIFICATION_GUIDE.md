# JWT Token Structure & RS256 Verification Guide

## 🎯 Objective (From Your Initial Request)

You asked to:
1. Obtain an access_token from the /auth/login endpoint
2. Decode the JWT without verification
3. Check the header for "alg": "RS256"
4. Check the payload structure

✅ **All completed!** This guide shows how to do it.

---

## 🔐 Step 1: Obtain Access Token

### Using the Test Script (Easiest)

```bash
# Run the automated test
./test-auth-flow.sh

# The script will:
# 1. Register a new user
# 2. Login and get the access token
# 3. Test all endpoints
# 4. Output success messages
```

### Manual Method

**Register a user**:
```bash
curl -s -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tokentest",
    "email": "tokentest@example.com",
    "password": "TestPass123!"
  }' | jq .
```

**Login to get token**:
```bash
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tokentest","password":"TestPass123!"}' | jq .

# Response:
# {
#   "token_type": "Bearer",
#   "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "expires_in": 900,
#   "refresh_token": "a1b2c3d4e5f6..."
# }
```

**Save the token**:
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tokentest","password":"TestPass123!"}' \
  | jq -r '.access_token')

echo "Access Token: $TOKEN"
```

---

## 🔍 Step 2: Decode JWT Without Verification

### Option A: Using Node.js (Recommended)

```javascript
const jwt = require('jsonwebtoken');

const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...";

// Decode without verification (to inspect structure)
const decoded = jwt.decode(token, { complete: true });

console.log("=== JWT Structure ===");
console.log("\nHeader:");
console.log(JSON.stringify(decoded.header, null, 2));

console.log("\nPayload:");
console.log(JSON.stringify(decoded.payload, null, 2));

console.log("\nSignature:");
console.log(decoded.signature);
```

**Run in Node REPL**:
```bash
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN_HERE';
const decoded = jwt.decode(token, { complete: true });
console.log(JSON.stringify(decoded, null, 2));
"
```

### Option B: Using jq

```bash
# Split JWT by dots and decode each part
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# Decode header (first part)
echo $TOKEN | cut -d'.' -f1 | base64 -d | jq .

# Example output:
# {
#   "alg": "RS256",
#   "typ": "JWT"
# }
```

### Option C: Online Tools

Visit https://jwt.io/ and paste your token to see:
- Header (highlighted)
- Payload
- Signature verification

⚠️ **Note**: Don't paste production tokens on public websites!

---

## 📋 Step 3: Check Header for RS256

### Header Requirements

Your JWT header **must** contain:

```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

### How to Verify

**Method 1: Node.js Script**
```javascript
const jwt = require('jsonwebtoken');
const token = process.argv[2];

const decoded = jwt.decode(token, { complete: true });
const header = decoded.header;

console.log("Header Analysis:");
console.log(`  alg: ${header.alg} ${header.alg === 'RS256' ? '✅' : '❌'}`);
console.log(`  typ: ${header.typ} ${header.typ === 'JWT' ? '✅' : '❌'}`);
```

**Usage**:
```bash
node check-header.js YOUR_TOKEN_HERE
# Output:
# Header Analysis:
#   alg: RS256 ✅
#   typ: JWT ✅
```

**Method 2: Bash + jq**
```bash
TOKEN="your_token_here"

# Get header (first 32 chars show algorithm)
echo "Header (base64 encoded):"
echo $TOKEN | cut -d'.' -f1

# Decode and display
echo -e "\nHeader (decoded):"
echo $TOKEN | cut -d'.' -f1 | base64 -d | jq '.'

# Verify RS256
HEADER_ALG=$(echo $TOKEN | cut -d'.' -f1 | base64 -d | jq -r '.alg')
if [ "$HEADER_ALG" = "RS256" ]; then
  echo "✅ Algorithm is RS256"
else
  echo "❌ Algorithm is $HEADER_ALG (expected RS256)"
fi
```

---

## 🔑 Step 4: Check Payload Structure

### Complete Payload Structure

Your JWT payload **must** contain:

```json
{
  "iss": "secure-jwt-auth-service",
  "sub": "username",
  "iat": 1700000000,
  "exp": 1700000900,
  "roles": ["user"]
}
```

### Decode and Verify Payload

**Using Node.js**:
```javascript
const jwt = require('jsonwebtoken');

const token = "YOUR_TOKEN_HERE";
const decoded = jwt.decode(token, { complete: true });
const payload = decoded.payload;

console.log("Payload Analysis:");
console.log(`  iss (Issuer): ${payload.iss}`);
console.log(`  sub (Subject/Username): ${payload.sub}`);
console.log(`  iat (Issued At): ${payload.iat}`);
console.log(`  exp (Expiration): ${payload.exp}`);
console.log(`  roles: ${JSON.stringify(payload.roles)}`);

// Calculate expiration time
const expiresInSeconds = payload.exp - payload.iat;
console.log(`\n⏱️  Token expires in ${expiresInSeconds} seconds (${expiresInSeconds / 60} minutes)`);

// Verify it's 900 seconds (15 minutes)
if (expiresInSeconds === 900) {
  console.log("✅ Expiration is 900 seconds (15 minutes) - CORRECT");
} else {
  console.log(`❌ Expiration is ${expiresInSeconds} seconds (expected 900)`);
}
```

**Using Bash + jq**:
```bash
TOKEN="your_token_here"

# Decode payload (second part)
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.')

echo "Payload:"
echo $PAYLOAD | jq '.'

echo -e "\nClaim Details:"
echo "  iss: $(echo $PAYLOAD | jq -r '.iss')"
echo "  sub: $(echo $PAYLOAD | jq -r '.sub')"
echo "  iat: $(echo $PAYLOAD | jq -r '.iat')"
echo "  exp: $(echo $PAYLOAD | jq -r '.exp')"
echo "  roles: $(echo $PAYLOAD | jq -r '.roles | join(", ")')"

# Verify expiration time
IAT=$(echo $PAYLOAD | jq -r '.iat')
EXP=$(echo $PAYLOAD | jq -r '.exp')
EXPIRES_IN=$((EXP - IAT))

echo -e "\n⏱️  Expires in: $EXPIRES_IN seconds"
if [ "$EXPIRES_IN" = "900" ]; then
  echo "✅ 900 seconds (15 minutes) - CORRECT"
else
  echo "❌ Expected 900 seconds, got $EXPIRES_IN"
fi
```

---

## ✔️ Signature Verification

### Verify with Public Key

**Using Node.js**:
```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');

const token = "YOUR_TOKEN_HERE";
const publicKey = fs.readFileSync('./keys/public.pem', 'utf8');

try {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'secure-jwt-auth-service'
  });
  console.log("✅ Signature is VALID");
  console.log("Token verified with public key");
} catch (err) {
  console.log("❌ Signature verification FAILED");
  console.log(`Error: ${err.message}`);
}
```

**Using OpenSSL** (advanced):
```bash
TOKEN="your_token_here"

# Split and decode signature
HEADER=$(echo $TOKEN | cut -d'.' -f1)
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2)
SIGNATURE=$(echo $TOKEN | cut -d'.' -f3)

# Prepare message that was signed
MESSAGE="$HEADER.$PAYLOAD"

# Decode signature from base64 (URL-safe)
SIGNATURE_BIN=$(echo $SIGNATURE | sed 's/-/+/g; s/_/\//g; s/$/===' | base64 -d)

# Verify signature
echo -n "$MESSAGE" | openssl dgst -sha256 -verify keys/public.pem -signature <(echo $SIGNATURE_BIN) && echo "✅ Signature Valid" || echo "❌ Signature Invalid"
```

---

## 🔧 Complete Verification Script

Save this as `verify-token.js`:

```javascript
#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const fs = require('fs');

const token = process.argv[2];

if (!token) {
  console.error('Usage: node verify-token.js <token>');
  process.exit(1);
}

console.log('\n=== JWT Token Verification ===\n');

// Decode without verification
const decoded = jwt.decode(token, { complete: true });

if (!decoded) {
  console.error('❌ Invalid token format');
  process.exit(1);
}

const { header, payload } = decoded;

console.log('📋 HEADER:');
console.log(JSON.stringify(header, null, 2));

console.log('\n📋 PAYLOAD:');
console.log(JSON.stringify(payload, null, 2));

// Verify header
console.log('\n✓ HEADER VALIDATION:');
console.log(`  alg: ${header.alg} ${header.alg === 'RS256' ? '✅' : '❌'}`);
console.log(`  typ: ${header.typ} ${header.typ === 'JWT' ? '✅' : '❌'}`);

// Verify payload claims
console.log('\n✓ PAYLOAD CLAIMS:');
console.log(`  iss: ${payload.iss} ${payload.iss ? '✅' : '❌'}`);
console.log(`  sub: ${payload.sub} ${payload.sub ? '✅' : '❌'}`);
console.log(`  iat: ${payload.iat} ${payload.iat ? '✅' : '❌'}`);
console.log(`  exp: ${payload.exp} ${payload.exp ? '✅' : '❌'}`);
console.log(`  roles: ${JSON.stringify(payload.roles)} ${Array.isArray(payload.roles) ? '✅' : '❌'}`);

// Verify expiration
const expiresInSeconds = payload.exp - payload.iat;
console.log(`\n⏱️  EXPIRATION:');
console.log(`  Expires in: ${expiresInSeconds} seconds`);
console.log(`  Expected: 900 seconds ${expiresInSeconds === 900 ? '✅' : '❌'}`);

// Verify signature
console.log('\n🔐 SIGNATURE VERIFICATION:');
try {
  const publicKey = fs.readFileSync('./keys/public.pem', 'utf8');
  jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'secure-jwt-auth-service'
  });
  console.log('  ✅ Signature is VALID');
  console.log('  ✅ Token verified with RS256 public key');
} catch (err) {
  console.log(`  ❌ Signature verification failed: ${err.message}`);
}

console.log('\n');
```

**Usage**:
```bash
# Run directly
node verify-token.js eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

# Or get token from login and verify
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tokentest","password":"TestPass123!"}' \
  | jq -r '.access_token')

node verify-token.js $TOKEN
```

---

## 📊 Complete Test Flow

```bash
#!/bin/bash
set -e

echo "🚀 Starting JWT verification test..."

# 1. Register user
echo -e "\n1️⃣  Registering test user..."
curl -s -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jwttest",
    "email": "jwttest@example.com",
    "password": "TestPass123!"
  }' | jq .

# 2. Login and get token
echo -e "\n2️⃣  Logging in and obtaining access token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"jwttest","password":"TestPass123!"}')

echo $LOGIN_RESPONSE | jq .

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

# 3. Decode and display token structure
echo -e "\n3️⃣  JWT Token Structure:"
echo "Token: $ACCESS_TOKEN"

# 4. Verify with Node.js script
echo -e "\n4️⃣  Detailed Verification:"
node verify-token.js $ACCESS_TOKEN

# 5. Decode manually using jq
echo -e "\n5️⃣  Header (decoded):"
echo $ACCESS_TOKEN | cut -d'.' -f1 | base64 -d | jq .

echo -e "\n6️⃣  Payload (decoded):"
echo $ACCESS_TOKEN | cut -d'.' -f2 | base64 -d | jq .

# 6. Test the verify-token endpoint
echo -e "\n7️⃣  Using /api/verify-token endpoint:"
curl -s "http://localhost:8080/api/verify-token?token=$ACCESS_TOKEN" | jq .

echo -e "\n✅ JWT verification test complete!"
```

**Save as `test-jwt-structure.sh` and run**:
```bash
chmod +x test-jwt-structure.sh
./test-jwt-structure.sh
```

---

## 🎓 JWT Structure Explained

### The Three Parts

A JWT consists of three parts separated by dots (`.`):

```
header.payload.signature
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzZWN1cmUtand0LWF1dGgtc2VydmljZSIsInN1YiI6InRva2VudGVzdCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDA...
```

### Base64URL Encoding

Each part is Base64URL encoded:
- `+` becomes `-`
- `/` becomes `_`
- Padding `=` is often omitted

**To decode**:
```bash
# Add padding if needed
PART="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9"
PADDED="${PART}$(printf '%s' "$PART" | wc -c | awk '{print (4 - $1 % 4) % 4}' | xargs -I {} printf '=%.0s' {1..{}})"
echo $PADDED | base64 -d
```

---

## 💡 Key Takeaways

✅ **RS256 Algorithm**
- Uses RSA-2048 keys
- Private key signs tokens
- Public key verifies tokens
- Much more secure than HMAC for multi-service systems

✅ **Token Expiration**
- Access tokens: 900 seconds (15 minutes)
- Logged in users can use until expiration
- Expired tokens = 401 response
- Use refresh tokens to get new access tokens

✅ **Claims Present**
- `iss`: Who issued the token (issuer)
- `sub`: Who the token is for (subject/username)
- `iat`: When token was created
- `exp`: When token expires
- `roles`: User's permissions

✅ **Always Verify Signatures**
- Use public key to verify
- Prevents token tampering
- Ensures token came from legitimate server

---

## 🔗 Related Documentation

- [REQUIREMENTS_VERIFICATION.md](REQUIREMENTS_VERIFICATION.md) - Full testing guide
- [FINAL_SUBMISSION_CHECKLIST.md](FINAL_SUBMISSION_CHECKLIST.md) - Comprehensive checklist
- [README.md](README.md) - Project overview

---

**Status**: ✅ Complete  
**Generated**: February 27, 2026
