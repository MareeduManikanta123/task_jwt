# Setup Guide - Running Without Docker

This guide will help you set up and run the Secure JWT Authentication Service on Windows without Docker.

## Prerequisites

### 1. Install PostgreSQL

1. Download PostgreSQL from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` superuser
4. Default port is `5432` (keep this unless you have a conflict)
5. Optional: Install pgAdmin (usually included with PostgreSQL installer)

### 2. Install Node.js

1. Download Node.js from [https://nodejs.org/](https://nodejs.org/)
2. Install the LTS version
3. Verify installation: `node --version` and `npm --version`

### 3. Install OpenSSL (if not already installed)

Windows users can use:
- Git Bash (comes with Git for Windows)
- Or download OpenSSL from [https://slproweb.com/products/Win32OpenSSL.html](https://slproweb.com/products/Win32OpenSSL.html)

## Setup Steps

### Step 1: Install Node.js Dependencies

```powershell
npm install
```

### Step 2: Generate RSA Keys

Run the automated setup script:

```powershell
.\setup-local.ps1
```

Or manually:

```powershell
# Create keys directory if it doesn't exist
if (!(Test-Path -Path "keys")) { New-Item -ItemType Directory -Path "keys" }

# Generate RSA keys (requires OpenSSL in PATH)
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

### Step 3: Configure Environment Variables

The `.env` file should already exist. Update it for local PostgreSQL:

```env
API_PORT=8080
DATABASE_URL=postgresql://auth_user:your_password@localhost:5432/auth_db
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ISSUER=secure-jwt-auth-service
DB_USER=auth_user
DB_PASSWORD=your_password
DB_NAME=auth_db
```

**Important**: Change `your_password` to a secure password of your choice.

### Step 4: Initialize the Database

#### Option A: Using psql (Command Line)

```powershell
# Connect to PostgreSQL
psql -U postgres -h localhost

# Inside psql prompt:
CREATE USER auth_user WITH PASSWORD 'your_password';
CREATE DATABASE auth_db OWNER auth_user;
\c auth_db
\i db-init/001_init.sql
\q
```

#### Option B: Using pgAdmin (GUI)

1. Open pgAdmin and connect to your PostgreSQL server
2. Right-click "Login/Group Roles" → Create → Login/Group Role
   - General tab: Name = `auth_user`
   - Definition tab: Password = `your_password`
   - Privileges tab: Check "Can login?"
3. Right-click "Databases" → Create → Database
   - Database = `auth_db`
   - Owner = `auth_user`
4. Select the `auth_db` database
5. Click Tools → Query Tool
6. Open the file `db-init/001_init.sql` and execute it

### Step 5: Start the Application

```powershell
npm start
```

The server will start on `http://localhost:8080` (or your configured API_PORT).

## Testing the Service

### Check Health Endpoint

```powershell
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### Run the Test Flow

```powershell
# You may need to install Git Bash or use WSL to run the bash script
bash test-auth-flow.sh
```

Or test manually with PowerShell:

```powershell
# Register a user
$registerResponse = Invoke-RestMethod -Uri "http://localhost:8080/auth/register" -Method Post -Body '{"username":"testuser","email":"test@example.com","password":"TestPass123!"}' -ContentType "application/json"

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8080/auth/login" -Method Post -Body '{"username":"testuser","password":"TestPass123!"}' -ContentType "application/json"

# Get profile (using access token)
$headers = @{
    "Authorization" = "Bearer $($loginResponse.accessToken)"
}
Invoke-RestMethod -Uri "http://localhost:8080/api/profile" -Method Get -Headers $headers
```

## Troubleshooting

### PostgreSQL Connection Issues

- Verify PostgreSQL service is running:
  ```powershell
  Get-Service -Name "postgresql*"
  ```
- Check if port 5432 is listening:
  ```powershell
  netstat -an | findstr "5432"
  ```
- Ensure `pg_hba.conf` allows local connections (usually in `C:\Program Files\PostgreSQL\{version}\data\`)

### OpenSSL Not Found

- If using Git Bash, OpenSSL should be available
- Add OpenSSL to your PATH environment variable
- Or use an online RSA key generator and save the keys manually

### Port Already in Use

- Change `API_PORT` in `.env` to a different port (e.g., 3000, 8000)

## Development Tips

- Use PostgreSQL to maintain data between restarts
- Check logs in the terminal for debugging
- Use pgAdmin or psql to inspect database contents
- Consider using `nodemon` for auto-restart during development:
  ```powershell
  npm install -g nodemon
  nodemon src/index.js
  ```

## Stopping the Service

- Press `Ctrl+C` in the terminal running the Node.js application
- PostgreSQL service will continue running in the background (no need to stop it)
