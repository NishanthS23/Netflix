#!/usr/bin/env bash
set -e

# Strip all Windows CRLF (\r), newlines (\n), and whitespace from secret inputs
clean_val() {
  printf '%s' "$1" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

CLIENT_HOST=$(clean_val "${1:-localhost}")
JWT_SEC=$(clean_val "${2:-}")
DB_USER_VAL=$(clean_val "${3:-}")
DB_PASS_VAL=$(clean_val "${4:-}")
DB_HOST_VAL=$(clean_val "${5:-}")
DB_NAME_VAL=$(clean_val "${6:-}")
TMDB_KEY=$(clean_val "${7:-}")
MAILTRAP_TOK=$(clean_val "${8:-}")
MAILTRAP_EP=$(clean_val "${9:-}")
DOCKERHUB_USER=$(clean_val "${10:-nishanthsaravanan503}")
DATABASE_URL_VAL=$(clean_val "${11:-}")

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
