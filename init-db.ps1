# PostgreSQL Database Setup Script
param(
    [string]$PostgresPassword = "Manikanta@123"
)

Write-Host "=== PostgreSQL Database Initialization ===" -ForegroundColor Cyan
Write-Host ""

# PostgreSQL installation path
$postgresPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (!(Test-Path $postgresPath)) {
    Write-Host "PostgreSQL installation not found at: $postgresPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found PostgreSQL at: $postgresPath" -ForegroundColor Green
Write-Host ""
Write-Host "Setting up database..." -ForegroundColor Yellow

# Set environment variable for password
$env:PGPASSWORD = $PostgresPassword

try {
    # Create user and database
    Write-Host "Creating auth_user and auth_db..." -ForegroundColor Yellow
    
    # Run SQL to create user and database
    & $postgresPath -h localhost -U postgres -w -c "CREATE USER auth_user WITH PASSWORD 'auth_password';" 2>&1 | Write-Host
    
    & $postgresPath -h localhost -U postgres -w -c "CREATE DATABASE auth_db OWNER auth_user;" 2>&1 | Write-Host
    
    & $postgresPath -h localhost -U postgres -w -c "GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;" 2>&1 | Write-Host
    
    Write-Host ""
    Write-Host "Initializing database tables..." -ForegroundColor Yellow
    
    # Run initialization SQL with auth_user
    $env:PGPASSWORD = "auth_password"
    & $postgresPath -h localhost -U auth_user -d auth_db -w -f "db-init/001_init.sql" 2>&1 | Write-Host
    
    Write-Host ""
    Write-Host "Database initialization completed!" -ForegroundColor Green
    Write-Host "Database: auth_db" -ForegroundColor Green
    Write-Host "User: auth_user" -ForegroundColor Green
    Write-Host "Password: auth_password" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    # Clear the password from environment
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
