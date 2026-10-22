# Netflix Clone - Deployment Directory

This directory centralizes all deployment, infrastructure-as-code, CI/CD templates, and container orchestration configurations for the Netflix Clone application across different environments.

---

## Directory Structure

```
deployment/
├── README.md                      # This documentation guide
├── docker-compose.yml             # Docker Compose orchestration (Local / EC2 / Server)
├── jenkins_secretfile.env.example # Jenkins Secret File credential template
├── vercel.json                    # Vercel SPA deployment configuration
├── aws-ecs/                       # AWS ECS (Fargate & EC2) & ECR deployment assets
│   ├── DEPLOYMENT_GUIDE.md        # CLI guide for ECS Fargate & ALB
│   ├── EC2_DEPLOYMENT_GUIDE.md    # Guide for ECS on self-managed EC2 instances
│   ├── GUI_DEPLOYMENT_GUIDE.md    # AWS Management Console GUI step-by-step guide
│   ├── ecr-build-and-push.ps1     # PowerShell script to build & push images to ECR
│   ├── ecr-build-and-push.sh      # Bash script to build & push images to ECR
│   ├── iam-task-execution-role-policy.json # IAM Execution Role policy template
│   ├── iam-task-role-policy.json  # IAM Task Role policy template (S3 / RDS access)
│   ├── s3-cors.json               # S3 bucket CORS configuration for HTTP 206 streaming
│   ├── task-def-backend.json      # Backend ECS task definition (Fargate)
│   ├── task-def-frontend.json     # Frontend ECS task definition (Fargate)
│   ├── task-def-backend-ec2.json  # Backend ECS task definition (EC2)
│   ├── task-def-frontend-ec2.json # Frontend ECS task definition (EC2)
│   └── task-def-backend-rds-s3.json # Backend task definition with RDS & S3 integration
└── scripts/                       # Deployment helper & verification scripts
    ├── healthcheck.sh             # Production verification (Containers, Nginx Port 80, /api/health)
    └── create_env.sh              # Secret sanitization & .env generator
```

---

## Deployment Targets

### 1. Docker Compose (Local / VM / EC2)
- Configuration: `deployment/docker-compose.yml`
- Runs pre-built Docker Hub images (`netflix-backend` and `netflix-frontend`), plus the local **Ollama AI Container** (`netflix-ollama`) running `qwen2.5:0.5b` for the cinematic AI Copilot chat box.
- Enforces strict CPU and Memory limits (Linux cgroup v2) to prevent out-of-memory errors on 2GB RAM instances.
- Run from repository root:
  ```bash
  docker compose -f deployment/docker-compose.yml --env-file .env up -d
  ```

### 2. Jenkins CI/CD Pipeline
- Pipeline definition: `Jenkinsfile` (Root directory for standard SCM discovery)
- Template: `deployment/jenkins_secretfile.env.example`
- Uses base64 secret injection and automatically pulls `deployment/docker-compose.yml` and runs `deployment/scripts/healthcheck.sh`.

### 3. AWS ECS (Fargate & EC2)
- Guides & manifests: `deployment/aws-ecs/`
- Build & push to ECR:
  - Windows: `.\deployment\aws-ecs\ecr-build-and-push.ps1 -AwsAccountId "<ACCOUNT_ID>" -AwsRegion "us-east-1"`
  - Linux/macOS: `./deployment/aws-ecs/ecr-build-and-push.sh <ACCOUNT_ID> us-east-1`

### 4. Vercel (Frontend SPA)
- Configuration: `deployment/vercel.json`
- Manages client-side SPA rewrite rules to `index.html`.

---

> [!NOTE]
> Application container definitions remain inside their respective service directories (`frontend/Dockerfile` and `backend/Dockerfile`) to ensure independent development context and standard container build practices.
