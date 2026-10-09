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

