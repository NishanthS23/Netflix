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

## Review & Verification
- **Preview Relocation**: Moved `preview/` to `frontend/public/preview/` and updated all image markdown links in `README.md`.
- **API Relocation**: Moved `api/` into `backend/api/`, updated imports in `backend/api/index.js` (`../app.js`, `../config/db.config.js`), and updated Vercel rewrite destination in `vercel.json` (`/backend/api/index.js`).
- **AI Agent Gitignore**:
  - Added `.agents/`, `.gemini/`, `.antigravity/`, `.claude/`, `.cursor/`, `*.local.json` to `.gitignore`.
  - Untracked `.agents/` via `git rm -r --cached .agents`.
  - Verified local skills files remain intact on disk while being ignored by Git.
  - Added `.agents` to both `backend/.dockerignore` and `frontend/.dockerignore`.


