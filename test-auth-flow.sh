#!/usr/bin/env sh
set -e

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required to run this script. Please install jq."
  exit 1
fi

API_PORT=${API_PORT:-8080}
BASE_URL=${BASE_URL:-http://localhost:${API_PORT}}

USERNAME="user_$(date +%s)"
EMAIL="${USERNAME}@example.com"
PASSWORD="Passw0rd!"

register_response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
register_body=$(printf "%s" "${register_response}" | head -n 1)
register_code=$(printf "%s" "${register_response}" | tail -n 1)

if [ "${register_code}" -ne 201 ]; then
  echo "Registration failed: ${register_body}"
  exit 1
fi

echo "Registered user ${USERNAME}"

login_response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")
login_body=$(printf "%s" "${login_response}" | head -n 1)
login_code=$(printf "%s" "${login_response}" | tail -n 1)

if [ "${login_code}" -ne 200 ]; then
  echo "Login failed: ${login_body}"
  exit 1
fi

echo "Logged in successfully"

access_token=$(printf "%s" "${login_body}" | jq -r '.access_token')
refresh_token=$(printf "%s" "${login_body}" | jq -r '.refresh_token')

profile_response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/profile" \
  -H "Authorization: Bearer ${access_token}")
profile_body=$(printf "%s" "${profile_response}" | head -n 1)
profile_code=$(printf "%s" "${profile_response}" | tail -n 1)

if [ "${profile_code}" -ne 200 ]; then
  echo "Profile request failed: ${profile_body}"
  exit 1
fi

echo "Accessed protected profile"

refresh_response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"${refresh_token}\"}")
refresh_body=$(printf "%s" "${refresh_response}" | head -n 1)
refresh_code=$(printf "%s" "${refresh_response}" | tail -n 1)

if [ "${refresh_code}" -ne 200 ]; then
  echo "Refresh failed: ${refresh_body}"
  exit 1
fi

echo "Refreshed access token"

new_access_token=$(printf "%s" "${refresh_body}" | jq -r '.access_token')

profile2_response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/profile" \
  -H "Authorization: Bearer ${new_access_token}")
profile2_body=$(printf "%s" "${profile2_response}" | head -n 1)
profile2_code=$(printf "%s" "${profile2_response}" | tail -n 1)

if [ "${profile2_code}" -ne 200 ]; then
  echo "Profile request with new token failed: ${profile2_body}"
  exit 1
fi

echo "Accessed profile with refreshed token"

logout_response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/auth/logout" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"${refresh_token}\"}")
logout_code=$(printf "%s" "${logout_response}" | tail -n 1)

if [ "${logout_code}" -ne 204 ]; then
  echo "Logout failed"
  exit 1
fi

echo "Logged out successfully"

echo "Auth flow completed"
