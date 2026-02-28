# PostgreSQL Database Setup Script
Write-Host "=== PostgreSQL Database Initialization ===" -ForegroundColor Cyan
Write-Host ""

# Get PostgreSQL password
$postgresPassword = Read-Host "Enter PostgreSQL 'postgres' superuser password"

if ([string]::IsNullOrEmpty($postgresPassword)) {
    Write-Host "Password cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setting up database..." -ForegroundColor Yellow

# Set environment variable for password
$env:PGPASSWORD = $postgresPassword

try {
    # Create user and database
    Write-Host "Creating auth_user and auth_db..." -ForegroundColor Yellow
    
    # Run SQL to create user and database
    & psql -h localhost -U postgres -f "db-init/000_create_user.sql" 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        # User might already exist, try to continue
        Write-Host "Note: User creation returned an error (may already exist)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Initializing database tables..." -ForegroundColor Yellow
    
    # Run initialization SQL with auth_user
    $env:PGPASSWORD = "auth_password"
    & psql -h localhost -U auth_user -d auth_db -f "db-init/001_init.sql" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Database initialization completed successfully!" -ForegroundColor Green
        Write-Host "Database: auth_db" -ForegroundColor Green
        Write-Host "User: auth_user" -ForegroundColor Green
        Write-Host "Password: auth_password" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "There was an error during initialization" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    # Clear the password from environment
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
