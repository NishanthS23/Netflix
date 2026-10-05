#!/usr/bin/env bash
set -e

echo "=== 5. Verifying All Three Containers Are Running ==="
sleep 10

REQUIRED_CONTAINERS=("netflix-frontend" "netflix-backend" "netflix-db")
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

if [ "$FAILED" -ne 0 ]; then
  echo "❌ Health check failed! One or more containers are down or unhealthy."
  docker ps -a
  exit 1
fi

echo "🎉 Health Check Passed: All 3 containers are active and operational!"
