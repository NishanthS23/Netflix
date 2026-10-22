<#
.SYNOPSIS
  Build and push Netflix Clone Docker images to AWS ECR (PowerShell for Windows)
.USAGE
  .\aws-ecs\ecr-build-and-push.ps1 -AwsAccountId "123456789012" -AwsRegion "us-east-1"
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$AwsAccountId,

    [Parameter(Mandatory=$false)]
    [string]$AwsRegion = "us-east-1",

    [Parameter(Mandatory=$false)]
    [string]$ViteGoogleClientId = ""
)

$ErrorActionPreference = "Stop"

$ECR_REGISTRY = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"
$BACKEND_REPO = "$ECR_REGISTRY/netflix-backend"
$FRONTEND_REPO = "$ECR_REGISTRY/netflix-frontend"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "1. Authenticating Docker with AWS ECR... " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $ECR_REGISTRY
if ($LASTEXITCODE -ne 0) { throw "ECR Login Failed" }

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "2. Ensuring ECR Repositories Exist...    " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
aws ecr describe-repositories --repository-names netflix-backend --region $AwsRegion 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating repository netflix-backend..." -ForegroundColor Yellow
    aws ecr create-repository --repository-name netflix-backend --region $AwsRegion
}

aws ecr describe-repositories --repository-names netflix-frontend --region $AwsRegion 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating repository netflix-frontend..." -ForegroundColor Yellow
    aws ecr create-repository --repository-name netflix-frontend --region $AwsRegion
}

$REPO_ROOT = if (Test-Path "$PSScriptRoot\..\..\backend") { (Resolve-Path "$PSScriptRoot\..\..").Path } else { (Get-Location).Path }

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "3. Building & Pushing Backend Image...  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
docker build -t "$BACKEND_REPO`:latest" "$REPO_ROOT/backend"
docker push "$BACKEND_REPO`:latest"

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "4. Building & Pushing Frontend Image... " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
if ($ViteGoogleClientId) {
    docker build --build-arg "VITE_GOOGLE_CLIENT_ID=$ViteGoogleClientId" -t "$FRONTEND_REPO`:latest" "$REPO_ROOT/frontend"
} else {
    docker build -t "$FRONTEND_REPO`:latest" "$REPO_ROOT/frontend"
}
docker push "$FRONTEND_REPO`:latest"

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "SUCCESS! Both images pushed to AWS ECR: " -ForegroundColor Green
Write-Host "Backend:  $BACKEND_REPO:latest" -ForegroundColor Green
Write-Host "Frontend: $FRONTEND_REPO:latest" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
