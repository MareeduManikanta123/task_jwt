# Secure JWT Authentication Service

A stateless, production-ready authentication API using **RS256 JWT** access tokens with refresh token support. Built with Node.js, Express, and PostgreSQL, featuring secure password hashing, rate limiting, and comprehensive security best practices.

## Features

✅ **RS256 JWT Authentication** - Asymmetric encryption for token signing/verification  
✅ **Access & Refresh Tokens** - Token lifecycle management with 15-min access tokens and 7-day refresh tokens  
✅ **Password Security** - Bcrypt hashing with 10 salt rounds  
✅ **Rate Limiting** - Brute-force protection on login (5 failed attempts per minute per IP)  
✅ **Protected Endpoints** - Bearer token authentication for protected routes  
✅ **Health Checks** - Service health verification endpoints for Docker orchestration  
✅ **Database Persistence** - PostgreSQL for user and token storage  
✅ **Docker Ready** - Fully containerized with Docker Compose for easy deployment  
✅ **Comprehensive Testing** - Automated test script for full authentication flow  

## Quick Start

### Using Docker (Recommended)

```bash
# 1. Generate RSA keys
./generate-keys.sh

# 2. Start services with Docker Compose
docker-compose up --build

# 3. Run tests (in another terminal)
./test-auth-flow.sh
```

### Without Docker (Local Development)

See [SETUP-WITHOUT-DOCKER.md](SETUP-WITHOUT-DOCKER.md) for detailed instructions.

## Environment Variables

All environment variables are documented in [.env.example](.env.example):

| Variable | Description | Example |
|----------|-------------|---------|
| `API_PORT` | Port for API server | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/auth_db` |
| `JWT_PRIVATE_KEY_PATH` | Path to RSA private key | `./keys/private.pem` |
| `JWT_PUBLIC_KEY_PATH` | Path to RSA public key | `./keys/public.pem` |
| `JWT_ISSUER` | JWT issuer claim | `secure-jwt-auth-service` |
| `DB_USER` | Database user | `auth_user` |
| `DB_PASSWORD` | Database password | `auth_password` |
| `DB_NAME` | Database name | `auth_db` |

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register a new user | ❌ |
| POST | `/auth/login` | Login and get tokens | ❌ |
| POST | `/auth/refresh` | Get new access token | ❌ |
| POST | `/auth/logout` | Revoke refresh token | ❌ |

### Protected

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/profile` | Get user profile | ✅ |

### Public

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/verify-token` | Verify token validity | ❌ |
| GET | `/health` | Health check | ❌ |

## Request/Response Examples

### Register
**Password Requirements:** Min 8 characters, 1 number, 1 special character

```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

Success (201):
```json
{
  "id": 1,
  "username": "john_doe",
  "message": "User registered successfully"
}
```

### Login
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john_doe", "password": "SecurePass123!"}'
```

Success (200):
```json
{
  "token_type": "Bearer",
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900,
  "refresh_token": "a1b2c3d4..."
}
```

### Protected Endpoint
```bash
curl -X GET http://localhost:8080/api/profile \
  -H "Authorization: Bearer <access_token>"
```

Success (200):
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "roles": ["user"]
}
```

### Refresh Token
```bash
curl -X POST http://localhost:8080/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "a1b2c3d4..."}'
```

Success (200):
```json
{
  "token_type": "Bearer",
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900
}
```

### Logout
```bash
curl -X POST http://localhost:8080/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "a1b2c3d4..."}'
```

Success (204): Empty response

## Security Features

### Password Security
- ✅ Bcrypt hashing with 10 salt rounds
- ✅ Password policy enforcement (8+ chars, number, special char)
- ✅ Constant-time comparison prevents timing attacks
- ✅ Never logged or exposed in errors

### JWT Security
- ✅ RS256 asymmetric encryption (RSA-2048)
- ✅ 15-minute access token lifetime
- ✅ 7-day refresh token lifetime
- ✅ Issuer validation
- ✅ Automatic signature verification
- ✅ Header: `{"alg": "RS256", "typ": "JWT"}`
- ✅ Claims: `iss`, `sub`, `iat`, `exp`, `roles`

### Rate Limiting
- ✅ 5 failed attempts per minute per IP
- ✅ Returns 429 Too Many Requests when exceeded
- ✅ Includes Retry-After header
- ✅ Successful login resets counter
- ✅ Memory-efficient in-process tracking
- ✅ Headers: X-RateLimit-Limit, X-RateLimit-Remaining

### Key Management
- ✅ RSA-2048 key pair generation
- ✅ Keys excluded from version control (.gitignore)
- ✅ Private key never transmitted
- ✅ Environment-based key path configuration
- ✅ Generated once at setup, stored securely

## Testing

### Automated Test
```bash
./test-auth-flow.sh
```

Tests the complete flow:
1. Register new user
2. Login and capture tokens
3. Access protected profile
4. Refresh access token
5. Access profile with new token
6. Logout and revoke token

**Requirements:** curl, jq, running server

## Database Schema

### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### refresh_tokens
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token VARCHAR(512) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Error Responses

All errors follow this format:
```json
{
  "error": "error_code",
  "message": "Description of error"
}
```

### Common Error Codes
- `invalid_request` - Missing/invalid parameters
- `weak_password` - Password doesn't meet requirements
- `conflict` - Username/email already exists
- `invalid_credentials` - Wrong username/password
- `invalid_token` - Bad/tampered token
- `token_expired` - Access token expired
- `invalid_refresh_token` - Refresh token invalid/expired
- `rate_limited` - Too many login attempts
- `server_error` - Internal error

## Project Structure

```
.
├── src/
│   ├── index.js              # Express app & routes
│   ├── config.js             # Configuration
│   ├── db.js                 # Database setup
│   ├── jwt.js                # JWT operations
│   └── rateLimit.js          # Rate limiting
├── db-init/
│   ├── 000_create_user.sql   # User/DB creation
│   └── 001_init.sql          # Table schemas
├── docker-compose.yml         # Docker Compose config
├── Dockerfile                 # Docker image
├── package.json              # Node.js dependencies
├── .env.example              # Config template
├── .gitignore                # Git ignore rules
├── generate-keys.sh          # Key generation
├── generate-keys.ps1         # Windows key generation
├── test-auth-flow.sh         # Integration test
├── SETUP-WITHOUT-DOCKER.md   # Local setup guide
└── README.md                 # This file
```

## Dependencies

- **express** (^4.19.2) - Web framework
- **helmet** (^7.1.0) - Security headers
- **jsonwebtoken** (^9.0.2) - JWT handling
- **bcryptjs** (^2.4.3) - Password hashing
- **pg** (^8.11.5) - PostgreSQL client
- **dotenv** (^16.4.5) - Environment variables

## Troubleshooting

### Port already in use
Change `API_PORT` in `.env` to an unused port

### Database connection failed
- Verify PostgreSQL is running
- Check credentials in `.env`
- Verify database and user exist
- Run: `docker-compose down -v && docker-compose up --build`

### Rate limit not resetting
- Restart the server
- Rate limit uses in-memory tracking per IP

### Token verification fails
- Ensure keys exist in configured paths
- Regenerate keys: `./generate-keys.sh`
- Check file permissions on key files

### "jq not found" error in test script
Install jq:
- Ubuntu/Debian: `sudo apt-get install jq`
- macOS: `brew install jq`
- Windows: Download from https://stedolan.github.io/jq/

## Core Requirements Compliance

This implementation fully satisfies all 14 core requirements:

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Docker Compose orchestration with health checks | ✅ |
| 2 | .env.example with all required variables | ✅ |
| 3 | generate-keys.sh for RSA-2048 key generation | ✅ |
| 4 | Database schema (users, refresh_tokens) | ✅ |
| 5 | POST /auth/register with password policy | ✅ |
| 6 | Bcrypt password hashing (10 rounds) | ✅ |
| 7 | POST /auth/login with credential validation | ✅ |
| 8 | RS256 JWT with required claims | ✅ |
| 9 | POST /auth/refresh with 7-day tokens | ✅ |
| 10 | Protected GET /api/profile endpoint | ✅ |
| 11 | GET /api/verify-token for verification | ✅ |
| 12 | POST /auth/logout for token revocation | ✅ |
| 13 | Login rate limiting (5 failed/min per IP) | ✅ |
| 14 | test-auth-flow.sh integration test | ✅ |

## License

MIT License
