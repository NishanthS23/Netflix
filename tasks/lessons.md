# Lessons Learned

## PostgreSQL Migration & Mongoose Compatibility
- **Mongoose Document Methods**: When replacing Mongoose models with custom SQL-backed classes, always implement `toObject()`, `toJSON()`, and `_doc`. Controllers and serialization often rely on `.toObject()` or expect clean plain JavaScript objects.
- **Auto-Migration of Schema Changes**: `CREATE TABLE IF NOT EXISTS` will not add new columns to an existing table. Whenever adding a column to an existing schema (such as `views INT DEFAULT 0`), always include an idempotent migration statement like `ALTER TABLE <table_name> ADD COLUMN IF NOT EXISTS <col> <type> DEFAULT <default>;` during database initialization.
- **Defensive Property Access**: Protect object method calls with guards like `typeof v.toObject === 'function' ? v.toObject() : { ...v }` and ensure numerical counters default cleanly to `0` (`Number(item.views || 0) + 1`).

## Repository Hygiene & Build Optimization
- **Prevent Heavy Runtime Artifact Leaks**: When introducing disk volume file storage (e.g., custom video/image uploads), immediately add `uploads/` and `**/uploads/` to `.gitignore` and `.dockerignore`. Failing to do so can cause multi-gigabyte media uploads to accidentally leak into Git history or bloat Docker build contexts.
- **Dead Migration Artifacts**: Following a database engine migration (e.g., MongoDB -> PostgreSQL), thoroughly search for and prune dead imports, unused driver dependencies (e.g., `mongoose`), and legacy storage services (e.g., `GridFS`) to keep container images lean and code maintainable.

