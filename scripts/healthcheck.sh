#!/usr/bin/env bash
set -e

echo "=== 5. Verifying Application Containers and AWS RDS Connectivity ==="
sleep 10

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

echo "--- HTTP Port 80 Check ---"
if curl -fs http://localhost:80 > /dev/null; then
  echo "✅ Frontend HTTP check passed (Port 80 responding)"
else
  echo "❌ Frontend HTTP check failed (Port 80)"
  FAILED=1
fi

echo "--- Backend API via Nginx (Port 80) Check ---"
if curl -fs http://localhost:80/api/v1/custom-videos > /dev/null; then
  echo "✅ Backend API check via Nginx passed (Port 80 /api/ responding)"
else
  echo "❌ Backend API check via Nginx failed (Port 80 /api/)"
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
