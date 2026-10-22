#!/usr/bin/env bash
# ==============================================================================
# Script: aws-ecs/ecr-build-and-push.sh
# Purpose: Authenticate, build, and push Netflix Clone images to AWS ECR
# ==============================================================================
set -e

AWS_ACCOUNT_ID="${1:-$AWS_ACCOUNT_ID}"
AWS_REGION="${2:-${AWS_REGION:-us-east-1}}"
VITE_GOOGLE_CLIENT_ID="${3:-$VITE_GOOGLE_CLIENT_ID}"

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Usage: ./aws-ecs/ecr-build-and-push.sh <AWS_ACCOUNT_ID> [AWS_REGION] [VITE_GOOGLE_CLIENT_ID]"
  echo "Example: ./aws-ecs/ecr-build-and-push.sh 123456789012 us-east-1"
  exit 1
fi

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
BACKEND_REPO="${ECR_REGISTRY}/netflix-backend"
FRONTEND_REPO="${ECR_REGISTRY}/netflix-frontend"

echo "========================================="
echo "1. Logging in to AWS ECR..."
echo "========================================="
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "========================================="
echo "2. Ensuring ECR Repositories Exist..."
echo "========================================="
aws ecr describe-repositories --repository-names netflix-backend --region "${AWS_REGION}" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name netflix-backend --region "${AWS_REGION}"

aws ecr describe-repositories --repository-names netflix-frontend --region "${AWS_REGION}" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name netflix-frontend --region "${AWS_REGION}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/../../backend" ]; then
  REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
else
  REPO_ROOT="$(pwd)"
fi

echo "========================================="
echo "3. Building & Pushing Backend Image..."
echo "========================================="
docker build -t "${BACKEND_REPO}:latest" "${REPO_ROOT}/backend"
docker push "${BACKEND_REPO}:latest"

echo "========================================="
echo "4. Building & Pushing Frontend Image..."
echo "========================================="
if [ -n "$VITE_GOOGLE_CLIENT_ID" ]; then
  docker build --build-arg VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID}" -t "${FRONTEND_REPO}:latest" "${REPO_ROOT}/frontend"
else
  docker build -t "${FRONTEND_REPO}:latest" "${REPO_ROOT}/frontend"
fi
docker push "${FRONTEND_REPO}:latest"

echo "========================================="
echo "✅ All images built and pushed successfully!"
echo "Backend:  ${BACKEND_REPO}:latest"
echo "Frontend: ${FRONTEND_REPO}:latest"
echo "========================================="
