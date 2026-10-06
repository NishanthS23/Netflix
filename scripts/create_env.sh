#!/usr/bin/env bash
set -e

# Strip all Windows CRLF (\r), newlines (\n), trailing whitespace, and drone ssh exit code injections
clean_val() {
  printf '%s' "$1" | sed -e 's/DRONE_SSH_PREV_COMMAND_EXIT_CODE=.*//g' | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

clean_token() {
  printf '%s' "$1" | sed -e 's/DRONE_SSH_PREV_COMMAND_EXIT_CODE=.*//g' | tr -d '\r\n '
}

CLIENT_HOST=$(clean_token "${1:-${CLEAN_EC2_HOST:-${EC2_HOST:-localhost}}}")
JWT_SEC=$(clean_val "${2:-${CLEAN_JWT:-${JWT_SECRET:-}}}")
DB_USER_VAL=$(clean_token "${3:-${CLEAN_DB_USER:-${DB_USER:-}}}")
DB_PASS_VAL=$(clean_val "${4:-${CLEAN_DB_PASS:-${DB_PASSWORD:-}}}")
DB_HOST_VAL=$(clean_token "${5:-${CLEAN_DB_HOST:-${DB_HOST:-}}}")
DB_NAME_VAL=$(clean_token "${6:-${CLEAN_DB_NAME:-${DB_NAME:-}}}")
TMDB_KEY=$(clean_token "${7:-${CLEAN_TMDB:-${TMDB_API_KEY:-}}}")
MAILTRAP_TOK=$(clean_token "${8:-${CLEAN_MAILTRAP_TOK:-${MAILTRAP_TOKEN:-}}}")
MAILTRAP_EP=$(clean_token "${9:-${CLEAN_MAILTRAP_EP:-${MAILTRAP_ENDPOINT:-}}}")
DOCKERHUB_USER=$(clean_token "${10:-${CLEAN_DH_USER:-${DOCKERHUB_USERNAME:-nishanthsaravanan503}}}")
DATABASE_URL_VAL=$(clean_val "${11:-${CLEAN_DB_URL:-${DATABASE_URL:-}}}")

# Construct DATABASE_URL if not directly supplied
if [ -n "${DATABASE_URL_VAL}" ]; then
  DATABASE_URL="${DATABASE_URL_VAL}"
elif [ -n "${DB_USER_VAL}" ] && [ -n "${DB_HOST_VAL}" ]; then
  DATABASE_URL="postgresql://${DB_USER_VAL}:${DB_PASS_VAL}@${DB_HOST_VAL}:5432/${DB_NAME_VAL}?sslmode=require"
else
  DATABASE_URL=""
fi

cat << EOF > .env
NODE_ENV=production
SERVER_PORT=8000
CLIENT_URL=http://${CLIENT_HOST}
JWT_SECRET=${JWT_SEC}
DB_HOST=${DB_HOST_VAL}
DB_PORT=5432
DB_USER=${DB_USER_VAL}
DB_PASSWORD=${DB_PASS_VAL}
DB_NAME=${DB_NAME_VAL}
DB_SSL=true
DATABASE_URL=${DATABASE_URL}
TMDB_API_KEY=${TMDB_KEY}
MAILTRAP_TOKEN=${MAILTRAP_TOK}
MAILTRAP_ENDPOINT=${MAILTRAP_EP}
DOCKERHUB_USERNAME=${DOCKERHUB_USER}
EOF

echo "Generated .env successfully for ${CLIENT_HOST} without exposing hardcoded secrets"
