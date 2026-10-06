# Plan: Fix Custom Video Loading and Model Compatibility

## Architecture Overview
- **Issue**:
  - `custom upload video not working Could not load custom video`
  - When opening `/watch-custom/:id` or `/custom-videos`, backend fails with:
    `TypeError: v.toObject is not a function` at `getAllCustomVideos` and `getCustomVideoById`.
  - Secondary issue: `custom_videos` PostgreSQL table in AWS RDS is missing the `views` column (which defaults to 0 in original schema and is incremented in `getCustomVideoById`).
  - Secondary issue: `video.views += 1` results in `NaN` when `views` is undefined, and `save()` did not persist or return `views`.
- **Target Changes**:
  1. Add `views` column auto-migration (`ALTER TABLE custom_videos ADD COLUMN IF NOT EXISTS views INT DEFAULT 0;`) in `backend/config/db.config.js`.
  2. Implement `toObject()` and `toJSON()` methods on `CustomVideo` in `backend/models/customVideo.model.js`, map `views` in constructor and `mapRowToCustomVideo`, and include `views` in `save()` UPDATE/INSERT queries.
  3. Implement `toObject()` and `toJSON()` on `User` in `backend/models/user.model.js` for full parity.
  4. Add defensive guards in `backend/controllers/customVideo.controller.js` (`typeof v.toObject === 'function' ? v.toObject() : { ...v }`, fallback views to 0).
  5. Deploy backend changes directly to EC2 and test with curl and logs.

## Tasks
- [ ] 1. Update `backend/config/db.config.js` to ensure `views INT DEFAULT 0` column exists on `custom_videos`
- [ ] 2. Update `backend/models/customVideo.model.js` to add `toObject()`, `toJSON()`, `views` field handling in constructor, `mapRowToCustomVideo`, and `save()`
- [ ] 3. Update `backend/models/user.model.js` to add `toObject()` and `toJSON()` methods
- [ ] 4. Update `backend/controllers/customVideo.controller.js` with defensive `.toObject()` checks and proper views initialization
- [ ] 5. Push changes to git repository and deploy / rebuild backend container on EC2
- [ ] 6. Verify `GET /api/v1/custom-videos` and `GET /api/v1/custom-videos/:id` return HTTP 200 without errors
