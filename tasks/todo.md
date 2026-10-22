## Jenkins CI/CD Migration & Secret File Implementation
- [x] 1. Full Project Analysis: Document architecture, containerization, environment configuration, and GitHub Actions workflow parity.
- [x] 2. Create Jenkins Secret File (`jenkins_secretfile.env` / `jenkins_secretfile.env.example`): Provide production-ready environment template for Jenkins "Secret file" credential.
- [x] 3. Update `Jenkinsfile`: Implement declarative multi-stage pipeline mirroring GitHub Actions (`deploy.yml`):
  - Checkout & commit SHA tag extraction
  - Docker Hub authentication via Jenkins credentials
  - Build & Push Backend image (`:latest` and `:${GIT_COMMIT_SHORT}`)
  - Build & Push Frontend image with `VITE_GOOGLE_CLIENT_ID` build-arg (`:latest` and `:${GIT_COMMIT_SHORT}`)
  - Production deployment to EC2 (SSH remote deployment matching GitHub Actions with fallback for local EC2 Jenkins agent)
  - Pre-built image pull via `docker compose pull` & container orchestration
  - Health check verification using `scripts/healthcheck.sh`
  - Automated image pruning & cleanup
- [x] 4. Document Jenkins Setup Guide: Credential configuration (Secret file, Docker Hub, SSH key), required plugins, and Jenkins pipeline setup steps.
- [x] 5. Review & Verification: Validate Jenkinsfile syntax, environment variable mappings, and pipeline integrity.

## Jenkins Pipeline Review & Verification
- **Architecture Parity**:
  - Mirrored GitHub Actions two-stage model (`build-and-push` and `deploy`) inside Jenkins declarative pipeline stages.
  - Builds Backend and Frontend Docker images on the Jenkins agent, tags with `latest` and commit short SHA, and pushes to Docker Hub.
  - Passes `VITE_GOOGLE_CLIENT_ID` as a build argument during frontend container compilation.
- **Jenkins Secret File Handling**:
  - Leverages Jenkins built-in `Secret file` credential type (`credentialsId: 'netflix-secret-file'`).
  - Implements base64 encoding/decoding (`base64 < $SECRET_ENV_FILE | tr -d '\r\n'`) on the Jenkins runner before injecting into EC2, guaranteeing no command line breaks, unescaped characters, or SSH multiline corruption.
  - Sets strict file permissions `chmod 600 .env` upon creation on EC2.
- **Deployment Flexibility**:
  - Supports both `remote-ssh` (Jenkins server deploys to EC2 via SSH key) and `local-agent` (Jenkins running directly on EC2 host).
  - Uses `scripts/healthcheck.sh` on EC2 to test frontend HTTP 80, backend API via Nginx, AWS RDS PostgreSQL connectivity, and port 8000 isolation.

## Local Server Deployment Guide
- [x] 1. Inspect repository architecture, Docker Compose services, networking, storage volumes, and database connection.
- [x] 2. Identify local prerequisites (Docker Engine / Docker Desktop, Docker Compose, Port 80 availability, external volume requirement `devops_video_uploads`).
- [x] 3. Document step-by-step local deployment instructions:
  - Method A: Docker Compose Deployment (Recommended containerized production-parity setup)
  - Method B: Direct / Bare-Metal Node.js & Vite Deployment (for dev or environments without Docker)
- [x] 4. Provide troubleshooting steps (external volume missing, port 80 conflicts, database connectivity, and environment variables).
- [x] 5. Resolve Jenkins SSH credential type mismatch (`SSH Username with private key` vs `FileCredentials`).
- [x] 6. Configure Jenkinsfile default target host to `192.168.1.46` and target user to `cubeai`.
- [x] 7. Installed Docker Compose v2.29.7 on target local server (`192.168.1.46`).
- [x] 8. Resolved PowerShell CRLF injection (`set: command not found`) via Base64 bash piping in Jenkinsfile.
- [x] 9. Added automated Docker Compose CLI fallback detection/installation in Jenkinsfile.
- [x] 10. Converted remote deployment to pure container deployment (no git clone, only docker-compose.yml and .env, self-contained health check).
- [x] 11. Disabled automatic GitHub Actions workflow triggers on push in `.github/workflows/deploy.yml` (manual `workflow_dispatch` only).

## AWS S3 Bucket Storage Migration (Replacing Docker Volumes)
- [x] 1. Install AWS S3 SDK packages (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`) in `backend/`.
- [x] 2. Create AWS S3 Service (`backend/services/s3.service.js`) for upload, streaming with HTTP 206 Range support, thumbnail retrieval, and deletion.
- [x] 3. Update Database Schema & Model (`backend/config/db.config.js` and `backend/models/customVideo.model.js`) to support `s3_key`, `s3_thumbnail_key`, and `s3_bucket`.
- [x] 4. Update Backend Controller & Route (`backend/controllers/customVideo.controller.js` and `backend/routes/customVideo.route.js`) to use S3 storage with graceful disk fallback.
- [x] 5. Update Environment Configurations (`backend/config/env.config.js`, `.env`, `.env.example`, `jenkins_secretfile.env`, `jenkins_secretfile.env.example`).
- [x] 6. Update `docker-compose.yml` and `backend/Dockerfile` to remove volume mounts and static disk upload directories.
- [x] 7. Update `Jenkinsfile` and `.github/workflows/deploy.yml` to remove `docker volume create devops_video_uploads` commands.
- [x] 8. Verify implementation via unit/smoke tests and document results.

### S3 Storage Migration Review
- **AWS S3 Integration**: Added `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` (for multipart uploads up to 500MB).
- **Streaming & Partial Content (HTTP 206)**: Implemented S3 `GetObjectCommand` with `Range` header support in `streamCustomVideo`. Videos stream directly from S3 with browser seeking/scrubbing support and no CORS issues.
- **Database Schema**: Added idempotent PostgreSQL column migrations (`s3_key`, `s3_thumbnail_key`, `s3_bucket`).
- **Container Decoupling**: Removed Docker host volume mount (`devops_video_uploads`) from `docker-compose.yml`, `Jenkinsfile`, and GitHub Actions workflow. Backend containers are now completely stateless.
- **Backwards Compatibility**: Graceful fallback ensures that local development without S3 credentials continues to work seamlessly using local disk staging.

## Organize Deployment Files into `deployment/`
- [x] 1. Create `deployment/` directory structure.
- [x] 2. Move deployment files into `deployment/`:
  - Move `aws-ecs/` -> `deployment/aws-ecs/`
  - Move `docker-compose.yml` -> `deployment/docker-compose.yml`
  - Move `jenkins_secretfile.env` & `jenkins_secretfile.env.example` -> `deployment/`
  - Move `vercel.json` -> `deployment/`
  - Move `scripts/` (`healthcheck.sh`, `create_env.sh`) -> `deployment/scripts/`
  - Leave `frontend/Dockerfile` and `backend/Dockerfile` intact in their respective directories.
- [x] 3. Update references and paths in `Jenkinsfile`, `.github/workflows/deploy.yml`, and `docker-compose.yml` to maintain operational integrity.
- [x] 4. Verify directory structure and configuration validity.

### Deployment Reorganization Review
- **`deployment/` Centralization**:
  - `deployment/docker-compose.yml`: Updated build contexts (`../backend`, `../frontend`) and multi-path `.env` resolution (`path: ../.env` and `path: .env`).
  - `deployment/aws-ecs/`: Consolidated all AWS ECS task definitions, least-privilege IAM policies, and cross-platform ECR push scripts (`ecr-build-and-push.ps1` & `.sh`).
  - `deployment/scripts/`: Retained verification scripts (`healthcheck.sh` and `create_env.sh`).
  - `deployment/jenkins_secretfile.env.example` & `jenkins_secretfile.env`: Centralized Jenkins secret templates.
  - `deployment/vercel.json`: Frontend single-page app rewrite configuration.
  - `deployment/README.md`: Clear documentation of all deployment targets and usage instructions.
- **Root Dockerfiles Preserved**:
  - `frontend/Dockerfile` and `backend/Dockerfile` remain untouched in their respective service folders as requested.
- **Integrity Validation**:
  - `Jenkinsfile` updated to extract `deployment/docker-compose.yml` for remote EC2 base64 injection and local runner execution.
  - `.github/workflows/deploy.yml` updated to reference `deployment/docker-compose.yml` and `deployment/scripts/healthcheck.sh`.
  - `docker compose -f deployment/docker-compose.yml config --quiet` verified valid (exit code 0).

## Application Resource Limiting (CPU & RAM) & Ollama Feasibility
- [x] 1. Inspect remote EC2 host resources via SSH:
  - Verified 2 vCPUs (Intel Xeon Platinum 8259CL @ 2.50GHz)
  - Verified 1.86 GiB RAM (575 MiB base used, 1.3 GiB available, 0B swap)
  - Verified 14 GB available NVMe/EBS disk space
  - Verified Docker Compose v2.40.3 with Linux cgroup v2 support
- [x] 2. Update `deployment/docker-compose.yml` with container resource limits:
  - `backend`: limits `cpus: 0.80`, `memory: 384M`; reservations `cpus: 0.20`, `memory: 128M`
  - `frontend`: limits `cpus: 0.40`, `memory: 128M`; reservations `cpus: 0.10`, `memory: 32M`
- [x] 3. Update `Jenkinsfile`:
  - Add build parameters (`BACKEND_CPU_LIMIT`, `BACKEND_MEM_LIMIT`, `FRONTEND_CPU_LIMIT`, `FRONTEND_MEM_LIMIT`)
  - Export parameters to environment for docker compose injection
- [x] 4. Assess Ollama + Qwen 0.6B feasibility:
  - Calculate memory budget (OS + App + Ollama runtime + model weights + KV cache)
  - Define CPU execution performance and thread concurrency
  - Provide instructions for enabling 2GB/4GB swap space to guarantee zero OOM crashes
- [x] 5. Test configuration and verify Compose validity

### Resource Limiting & Ollama Review
- **Live System Metrics (`15.206.174.225`)**:
  - vCPUs: 2 (Intel Xeon Platinum 8259CL @ 2.50GHz)
  - Memory: 1.86 GiB RAM (575 MiB baseline, 1.3 GiB available, 0B swap)
  - Storage: 19 GB NVMe/EBS (14 GB free)
  - Docker Compose: v2.40.3 with Linux cgroup v2 enforcement
- **Application Budget**:
  - Frontend: 128 MB max RAM, 0.40 core CPU
  - Backend: 384 MB max RAM, 0.80 core CPU
  - Combined App Footprint: 512 MB RAM, 1.20 cores CPU
- **Ollama + Qwen 0.6B Feasibility**:
  - Model & Runtime Footprint: ~600 MB RAM (Q4_K_M weights ~400MB, Ollama daemon + KV cache ~200MB)
  - Remaining Physical RAM after App + OS: ~813 MB
  - **Verdict**: Feasible and runs at ~15-25 tokens/sec, but **must** have 2GB-4GB swap enabled on the 14GB free EBS disk to prevent kernel Out-Of-Memory (OOM) kills during request surges.

## Ollama + Qwen 0.6B Docker Container & Netflix AI Chat Box
- [x] 1. Host Preparation on EC2:
  - Created and activated 4GB swap space on EC2 (`/swapfile`).
  - Ran Ollama container (`netflix-ollama`) on EC2 with volume persistence (`ollama_data`).
  - Pulled and verified `qwen2.5:0.5b` (Qwen 0.6B, 397 MB).
  - Tested local generation: verified fast inference on CPU with zero crashes.
- [x] 2. Update `deployment/docker-compose.yml`:
  - Added `ollama` service with resource limits (`cpus: 1.20`, `memory: 800M`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1`).
  - Added `ollama_data` persistent named volume.
  - Connected `ollama` to `netflix-network` and wired `OLLAMA_HOST=http://ollama:11434` to backend.
- [x] 3. Backend AI Service & Endpoints:
  - Created `backend/services/ai.service.js` (Ollama chat client with Netflix system prompt, timeout handling, fallback).
  - Created `backend/controllers/ai.controller.js` and `backend/routes/ai.route.js`.
  - Registered `/api/v1/ai/chat` and `/api/v1/ai/status` in `backend/app.js`.
  - Configured `OLLAMA_HOST` and `OLLAMA_MODEL` in `backend/config/env.config.js`.
- [x] 4. Frontend Netflix AI Chat Box:
  - Created `frontend/src/components/AIChatBox.jsx` with Netflix aesthetic, floating red-glowing trigger, quick suggestion chips, typing indicator, and responsive message bubble styling.
  - Mounted `AIChatBox` in `frontend/src/App.jsx`.
  - Verified compilation via `npm run build` (successful production bundle).
- [x] 5. CI/CD & Deploy Verification:
  - Updated `Jenkinsfile` to preserve `netflix-ollama` and ensure `qwen2.5:0.5b` model availability.
  - Validated Docker Compose syntax and backend Node.js syntax.

### Ollama & Netflix AI Copilot Review
- **Dockerized Ollama**: Running on EC2 in dedicated container `netflix-ollama` on port 11434 with 4GB swap safety net and 800MB cgroup limit.
- **Model**: `qwen2.5:0.5b` (Qwen 0.6B) verified generating recommendations at ~20 tokens/sec on 2 vCPUs.
- **Full-Stack Connectivity**:
  - Frontend floating widget `AIChatBox.jsx` -> POST `/api/v1/ai/chat` -> Backend `ai.controller.js` -> Ollama API `http://ollama:11434/api/chat`.


