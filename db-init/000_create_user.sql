-- Create auth_user role
CREATE USER auth_user WITH PASSWORD 'auth_password';

-- Create auth_db database
CREATE DATABASE auth_db OWNER auth_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;
