#!/usr/bin/env bash
set -e

CLIENT_HOST="${1:-18.227.46.71}"
JWT_SEC="${2:-netflix_super_secret_jwt_key_2026}"
DB_USER_VAL="${3:-nishanth}"
DB_PASS_VAL="${4:-nishanth}"
DB_HOST_VAL="${5:-netflix-db-cluster.czg2ay4ugjsp.us-east-2.rds.amazonaws.com}"
DB_NAME_VAL="${6:-netflix}"
TMDB_KEY="${7:-}"
MAILTRAP_TOK="${8:-}"
MAILTRAP_EP="${9:-}"

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
DATABASE_URL=postgresql://${DB_USER_VAL}:${DB_PASS_VAL}@${DB_HOST_VAL}:5432/${DB_NAME_VAL}?sslmode=require
TMDB_API_KEY=${TMDB_KEY}
MAILTRAP_TOKEN=${MAILTRAP_TOK}
MAILTRAP_ENDPOINT=${MAILTRAP_EP}
EOF

echo "Generated .env successfully for ${CLIENT_HOST}"
