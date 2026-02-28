# Setup Script for Secure JWT Authentication Service (No Docker)
# This script helps set up the project for local development on Windows

Write-Host "=== Secure JWT Authentication Service - Local Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is installed
try {
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService) {
        Write-Host "✓ PostgreSQL service found: $($pgService.Name)" -ForegroundColor Green
        if ($pgService.Status -eq "Running") {
            Write-Host "✓ PostgreSQL is running" -ForegroundColor Green
        } else {
            Write-Host "⚠ PostgreSQL is installed but not running" -ForegroundColor Yellow
            Write-Host "  Starting PostgreSQL service..." -ForegroundColor Yellow
            Start-Service $pgService.Name
        }
    } else {
        Write-Host "⚠ PostgreSQL service not found. Please ensure PostgreSQL is installed." -ForegroundColor Yellow
        Write-Host "  Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not check PostgreSQL status" -ForegroundColor Yellow
}

Write-Host ""

# Install Node.js dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Create keys directory
Write-Host "Setting up RSA keys..." -ForegroundColor Yellow
if (!(Test-Path -Path "keys")) {
    New-Item -ItemType Directory -Path "keys" | Out-Null
    Write-Host "✓ Created keys directory" -ForegroundColor Green
} else {
    Write-Host "✓ Keys directory already exists" -ForegroundColor Green
}

# Generate RSA keys
if ((Test-Path -Path "keys/private.pem") -and (Test-Path -Path "keys/public.pem")) {
    Write-Host "⚠ RSA keys already exist. Skipping generation." -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to regenerate the keys? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "  Keeping existing keys" -ForegroundColor Green
    } else {
        Write-Host "  Regenerating keys..." -ForegroundColor Yellow
        Remove-Item "keys/private.pem" -ErrorAction SilentlyContinue
        Remove-Item "keys/public.pem" -ErrorAction SilentlyContinue
    }
}

if (!(Test-Path -Path "keys/private.pem")) {
    try {
        # Try to generate keys using OpenSSL
        openssl genrsa -out keys/private.pem 2048 2>$null
        openssl rsa -in keys/private.pem -pubout -out keys/public.pem 2>$null
        
        if ((Test-Path -Path "keys/private.pem") -and (Test-Path -Path "keys/public.pem")) {
            Write-Host "✓ RSA keys generated successfully" -ForegroundColor Green
        } else {
            throw "Key generation failed"
        }
    } catch {
        Write-Host "✗ OpenSSL not found or key generation failed" -ForegroundColor Red
        Write-Host "  Please install OpenSSL or Git for Windows (includes OpenSSL)" -ForegroundColor Yellow
        Write-Host "  Or run these commands manually:" -ForegroundColor Yellow
        Write-Host "    openssl genrsa -out keys/private.pem 2048" -ForegroundColor Cyan
        Write-Host "    openssl rsa -in keys/private.pem -pubout -out keys/public.pem" -ForegroundColor Cyan
    }
}

Write-Host ""

# Check .env file
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path -Path ".env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠ IMPORTANT: Please verify your .env file settings:" -ForegroundColor Yellow
    Write-Host "  1. Update DATABASE_URL with your PostgreSQL credentials" -ForegroundColor Cyan
    Write-Host "     Example: DATABASE_URL=postgresql://auth_user:your_password@localhost:5432/auth_db" -ForegroundColor Cyan
    Write-Host "  2. Update DB_USER, DB_PASSWORD, and DB_NAME to match" -ForegroundColor Cyan
} else {
    Write-Host "⚠ .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path -Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✓ Created .env file from .env.example" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠ IMPORTANT: Update .env file with your settings:" -ForegroundColor Yellow
        Write-Host "  Change 'db' to 'localhost' in DATABASE_URL" -ForegroundColor Cyan
        Write-Host "  Set a secure password for DB_PASSWORD" -ForegroundColor Cyan
    } else {
        Write-Host "✗ .env.example not found. Cannot create .env file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Review and update the .env file with your PostgreSQL credentials" -ForegroundColor White
Write-Host "2. Initialize the database:" -ForegroundColor White
Write-Host "   - Connect to PostgreSQL and create the database and user" -ForegroundColor Gray
Write-Host "   - Run the SQL script: db-init/001_init.sql" -ForegroundColor Gray
Write-Host "3. Start the application:" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "For detailed instructions, see SETUP-WITHOUT-DOCKER.md" -ForegroundColor Yellow
Write-Host ""
