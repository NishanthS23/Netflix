# Plan: Migrate Backend from MongoDB to AWS RDS PostgreSQL

## Architecture Overview
- **Database Engine**: AWS RDS PostgreSQL (`netflix-db-cluster.czg2ay4ugjsp.us-east-2.rds.amazonaws.com:5432`)
- **Connection**: `pg` (node-postgres connection pool) with SSL support
- **Schema & Tables**:
  - `users`: id, username, email, password, is_verified, last_login, profile_pic, search_history (JSONB), reset_password_token, reset_password_expires_at, verification_token, verification_expires_at, created_at, updated_at
  - `custom_videos`: id, title, description, category, video_path, video_file_id, video_filename, video_content_type, video_size, thumbnail_path, thumbnail_file_id, user_id, username, created_at, updated_at
- **Backward Compatibility**: Interface layer keeps `_id` and standard model methods (`findOne`, `findById`, `save`, `create`) so frontend contracts remain completely unchanged.
- **Docker & Deployment**: Local `netflix-db` container in `docker-compose.yml` retired in favor of the AWS RDS PostgreSQL database.

## Tasks
- [x] 1. Add `pg` dependency to `backend/package.json`
- [x] 2. Update `backend/config/env.config.js` to support PostgreSQL configuration (`DATABASE_URL`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, etc.)
- [x] 3. Implement PostgreSQL pool and table auto-initialization in `backend/config/db.config.js`
- [x] 4. Implement PostgreSQL data access models in `backend/models/user.model.js` and `backend/models/customVideo.model.js`
- [x] 5. Update controllers & middlewares (`auth.controller.js`, `protectedRoute.js`, `search.controller.js`, `customVideo.controller.js`) to work cleanly with PostgreSQL models
- [x] 6. Update `docker-compose.yml` (remove local MongoDB `db` service, pass PostgreSQL env vars to backend)
- [x] 7. Update `.env.example`, `.env`, and deployment files (`scripts/healthcheck.sh`, `.github/workflows/deploy.yml`)
- [ ] 8. Verify connection from EC2 backend to AWS RDS PostgreSQL, create test user, and verify health checks
