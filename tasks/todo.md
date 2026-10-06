# Plan: Analyze Project Folder Structure, Organize Codebase, and Enhance .gitignore

## Architecture & Project Structure Overview
- **Project Scope**: Netflix Clone full-stack application (React 18 + Vite frontend, Express + Node.js backend, AWS RDS PostgreSQL database, Docker containerization, GitHub Actions / EC2 deployment).
- **Objectives**:
  1. Complete structural analysis of all folders and files across the repository.
  2. Identify and organize clutter, dead code, legacy files (GridFS / legacy MongoDB leftovers), and untracked skills.
  3. Consolidate and expand `.gitignore` into a clean, comprehensive, production-grade ignore configuration.
  4. Ensure Docker ignore files (`.dockerignore`) are aligned to prevent uploading or bundling unwanted assets.

## Tasks
- [x] 1. Conduct in-depth analysis of directory layout, tech stack, and identify redundant/unwanted files
- [x] 2. Update and organize root `.gitignore` with comprehensive rules (dependencies, builds, uploads, secrets, logs, OS, IDEs, caches)
- [x] 3. Align `backend/.dockerignore` and `frontend/.dockerignore` with the updated ignore policies
- [x] 4. Clean up and organize code (remove dead GridFS imports from `backend/controllers/customVideo.controller.js`, remove orphaned `gridfs.service.js`, clean `backend/package.json`)
- [x] 5. Organize untracked `.agents/skills/find-skills/`
- [x] 6. Verify git ignore behavior using `git status`, `git check-ignore`, and verify project integrity
- [x] 7. Document findings and results in `tasks/todo.md` and capture any lessons

## New Tasks: Move Preview, Move API, and Gitignore AI Agents
- [x] 1. Move `preview/` folder into `frontend/public/preview/` and update `README.md` image references
- [x] 2. Move `api/` folder into `backend/api/`, update relative imports in `backend/api/index.js`, and update `vercel.json`
- [x] 3. Add `.agents` and AI agent patterns (`.agents/`, `.claude/`, `.cursor/`, `.gemini/`, `.antigravity/`) to `.gitignore`
- [x] 4. Untrack `.agents` from git cache (`git rm -r --cached .agents`) while keeping local files intact
- [x] 5. Verify git status, ignored files, and build references
- [x] 6. Document results and review in `tasks/todo.md`

## Environment Secrets Hardening
- [x] 1. Audit `docker-compose.yml` for exposed endpoints, secrets, and usernames
- [x] 2. Remove hardcoded sensitive values (`JWT_SECRET`, `DB_HOST`, `DB_USER`, `DB_NAME`, `DB_PASSWORD`) from `docker-compose.yml`
- [x] 3. Configure `env_file: - .env` in `docker-compose.yml` for automatic environment injection
- [x] 4. Update `.env.example` with sanitized placeholders (PostgreSQL and application keys)
- [x] 5. Verify configuration resolution using `docker compose config`

## Docker Hub CI/CD & Nginx Isolation
- [x] 1. Update `docker-compose.yml` to tag images with `${DOCKERHUB_USERNAME:-nishanthsaravanan503}` and unexpose host port 8000
- [x] 2. Update `.github/workflows/deploy.yml` with `build-and-push` job targeting Docker Hub and `deploy` job using `docker compose pull`
- [x] 3. Update `scripts/create_env.sh` to write `DOCKERHUB_USERNAME` into `.env`
- [x] 4. Update `scripts/healthcheck.sh` to test Backend API through Nginx (port 80) and verify port 8000 isolation
- [x] 5. Update `.env.example` and local `.env` with `DOCKERHUB_USERNAME=nishanthsaravanan503`
- [x] 6. Validate configuration using `docker compose config`
- [x] 7. Create walkthrough artifact for documentation

## RDS Secrets Hardening to GitHub Secrets
- [x] 1. Remove hardcoded RDS cluster endpoint and credentials fallbacks from `backend/config/env.config.js`
- [x] 2. Remove hardcoded RDS default values from `scripts/create_env.sh` and support dynamic `DATABASE_URL`
- [x] 3. Update `.github/workflows/deploy.yml` to pass RDS secrets (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DATABASE_URL`) from GitHub Secrets
- [x] 4. Verify syntax with `node --check` and `docker compose config`

## Drone SSH Injection & Secrets Sanitization Fix
- [x] 1. Root Cause Analysis: Trailing newlines in GitHub Secrets caused Drone SSH to split command arguments across lines and inject `DRONE_SSH_PREV_COMMAND_EXIT_CODE=0 ; if [ 0 -ne 0 ]; then exit 0; fi;` directly into `DB_HOST` and `JWT_SECRET`.
- [x] 2. Update `.github/workflows/deploy.yml` runner step to sanitize all secrets (`tr -d '\r\n'` / `tr -d '\r\n '`) and base64-encode `.env` (`base64 | tr -d '\r\n'`).
- [x] 3. Update EC2 deployment step in `.github/workflows/deploy.yml` to safely decode base64 into `.env` with file permissions 600.
- [x] 4. Update `scripts/create_env.sh` with `clean_token` and `clean_val` regex stripping `DRONE_SSH_PREV_COMMAND_EXIT_CODE=.*` and adding environment variable fallbacks.
- [x] 5. Add defensive `sanitizeEnvString()` in `backend/config/env.config.js` to strip any lingering Drone SSH exit code injections at runtime.
- [x] 6. Verify Node.js syntax and git diffs before committing.

## Review & Verification
- **Docker Hub Images in Compose**:
  - `backend`: Image set to `nishanthsaravanan503/netflix-backend:latest`, port 8000 unmapped from host (`expose: - "8000"`).
  - `frontend`: Image set to `nishanthsaravanan503/netflix-frontend:latest`, port 80 mapped to host (`ports: - "80:80"`).
- **GitHub Actions Two-Stage Workflow**:
  - `build-and-push`: Runs on GitHub runner, authenticates with Docker Hub using `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`, builds backend & frontend Dockerfiles, pushes tags `latest` and commit SHA.
  - `deploy`: Runs on EC2 via SSH, pulls pre-built images with `docker compose pull`, restarts containers without building on EC2, runs health checks.
- **Port 8000 Isolation**:
  - Backend API calls from clients route exclusively through Nginx on Port 80 (`location /api/ -> http://backend:8000`).
  - Port 8000 is blocked from external access on EC2.
- **Complete RDS Secrets Security**:
  - All AWS RDS credentials (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DATABASE_URL`) are now 100% extracted from codebase into GitHub Secrets.
  - Zero hardcoded RDS URLs or passwords remain in tracked files.
- **Drone SSH / Multiline Secret Defense**:
  - Trailing newlines in secrets cannot corrupt command strings because production `.env` is created and base64 encoded on the GitHub runner.
  - Decoding on EC2 via `echo "${{ env.ENV_B64 }}" | base64 -d > .env` guarantees zero line breaks in the SSH command and byte-for-byte exact configuration.
- **Workflow YAML Indentation**:
  - Replaced unindented heredoc in `deploy.yml` with properly indented command group `{ echo "..."; } > .env.temp` so GitHub Actions parses the workflow without syntax errors. Validated with `yaml.safe_load`.

## SMTP Mail Authentication & Google Sign-In
- [x] 1. Backend: Install `nodemailer` and `google-auth-library`.
- [x] 2. Database & Models: Add `google_id` column to PostgreSQL `users` table and update `User` model to handle Google users with optional passwords.
- [x] 3. SMTP Service: Create `backend/services/email.service.js` with `nodemailer` transporter and responsive Netflix-branded HTML email templates for OTP verification, welcome, and password resets.
- [x] 4. Google Auth Controller: Add `googleLogin` endpoint in `backend/controllers/auth.controller.js` and register `POST /api/v1/account/google` route.
- [x] 5. Frontend Google Integration: Install `@react-oauth/google`, create `<GoogleAuthButton />`, integrate with `LoginPage.jsx` and `SignUpPage.jsx`, and update `useAuthStore`.
- [x] 6. Configuration & CI/CD: Update `.env.example`, `.env`, `docker-compose.yml`, `scripts/create_env.sh`, and `.github/workflows/deploy.yml` with new SMTP and Google OAuth variables.
- [x] 7. Verification: Test builds (`npm run build`, `node --check`), verify fallback mechanisms, and test end-to-end authentication flows.

## SMTP & Google Auth Review & Verification
- **SMTP Authentication Verification**:
  - Nodemailer configured for Gmail (`smtp.gmail.com:587`).
  - Successfully ran active SMTP verification check against Gmail servers: `GMAIL_SMTP_VERIFIED_SUCCESSFULLY`.
  - Netflix-branded HTML emails with 6-digit OTP codes, welcome greeting, and reset password actions.
- **Google Sign-In Verification**:
  - Google Client ID `315922735623-r9kc8d4jaau51e52up31vgg2e2ehq5g4.apps.googleusercontent.com` integrated on frontend and backend.
  - `@react-oauth/google` integrated into `LoginPage` and `SignUpPage` with custom dark-themed `<GoogleAuthButton />`.
  - Frontend compiled successfully with `npm run build` in 45.03s.
  - Backend `POST /api/v1/account/google` verified with `node --check`.
  - Idempotent database schema migration added for `google_id` and nullable passwords in PostgreSQL `users` table.








