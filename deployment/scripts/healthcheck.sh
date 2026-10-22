#!/usr/bin/env bash
set -e

echo "=== 5. Verifying Application Containers and AWS RDS Connectivity ==="
sleep 5

REQUIRED_CONTAINERS=("netflix-frontend" "netflix-backend")
FAILED=0

echo "--- Container Status Checks ---"
for c in "${REQUIRED_CONTAINERS[@]}"; do
  STATUS=$(docker inspect --format '{{.State.Status}}' "$c" 2>/dev/null || echo "not_found")
  HEALTH=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$c" 2>/dev/null || echo "none")

  if [ "$STATUS" = "running" ]; then
    if [ "$HEALTH" = "unhealthy" ]; then
      echo "❌ Container $c: RUNNING but UNHEALTHY"
      FAILED=1
    elif [ "$HEALTH" = "healthy" ]; then
      echo "✅ Container $c: RUNNING and HEALTHY"
    else
      echo "✅ Container $c: RUNNING"
    fi
  else
    echo "❌ Container $c: NOT RUNNING ($STATUS)"
    echo "--- Recent Logs for $c ---"
    docker logs "$c" --tail 25 2>&1 || true
    FAILED=1
  fi
done

echo "--- HTTP Port 80 Check (Frontend SPA) ---"
if curl -fs http://localhost:80 > /dev/null; then
  echo "✅ Frontend HTTP check passed (Port 80 responding)"
else
  echo "❌ Frontend HTTP check failed (Port 80)"
  FAILED=1
fi

echo "--- Backend API via Nginx (Port 80 /api/health) Check ---"
HEALTH_OK=0
for i in {1..6}; do
  HTTP_CODE=$(curl -s -o /tmp/health_resp.txt -w "%{http_code}" http://localhost:80/api/health || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend API health check passed via Nginx (Attempt $i: HTTP 200)"
    HEALTH_OK=1
    break
  else
    echo "⏳ Attempt $i/6: /api/health returned HTTP $HTTP_CODE, retrying in 5s..."
    sleep 5
  fi
done

if [ "$HEALTH_OK" -ne 1 ]; then
  echo "❌ Backend API health check failed via Nginx (Last HTTP Code: $HTTP_CODE)"
  echo "--- Health Response ---"
  cat /tmp/health_resp.txt 2>/dev/null || true
  echo ""
  echo "--- Backend Logs ---"
  docker logs netflix-backend --tail 50 2>&1 || true
  echo "--- Nginx Logs ---"
  docker logs netflix-frontend --tail 50 2>&1 || true
  FAILED=1
fi

echo "--- Database Query Check (/api/v1/custom-videos) ---"
DB_OK=0
for i in {1..6}; do
  HTTP_CODE=$(curl -s -o /tmp/db_resp.txt -w "%{http_code}" http://localhost:80/api/v1/custom-videos || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Database connectivity verified via Nginx (Attempt $i: HTTP 200)"
    DB_OK=1
    break
  else
    echo "⏳ Attempt $i/6: /api/v1/custom-videos returned HTTP $HTTP_CODE, waiting 5s for DB connection..."
    sleep 5
  fi
done

if [ "$DB_OK" -ne 1 ]; then
  echo "❌ Database query check failed via Nginx (Last HTTP Code: $HTTP_CODE)"
  echo "--- DB Query Response ---"
  cat /tmp/db_resp.txt 2>/dev/null || true
  echo ""
  echo "--- Backend Logs ---"
  docker logs netflix-backend --tail 50 2>&1 || true
  FAILED=1
fi

echo "--- Backend Port 8000 Isolation Check ---"
if curl -s --connect-timeout 2 http://localhost:8000 > /dev/null 2>&1; then
  echo "⚠️ Warning: Backend Port 8000 is directly accessible on host (should be isolated behind Nginx)"
else
  echo "✅ Security Check Passed: Backend Port 8000 is isolated from host and routed strictly through Nginx"
fi

if [ "$FAILED" -ne 0 ]; then
  echo "❌ Health check failed! One or more services are down or unhealthy."
  docker ps -a
  exit 1
fi

echo "🎉 Health Check Passed: Application is running and connected to AWS RDS PostgreSQL!"
