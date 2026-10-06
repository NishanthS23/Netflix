# Lessons Learned

## PostgreSQL Migration & Mongoose Compatibility
- **Mongoose Document Methods**: When replacing Mongoose models with custom SQL-backed classes, always implement `toObject()`, `toJSON()`, and `_doc`. Controllers and serialization often rely on `.toObject()` or expect clean plain JavaScript objects.
- **Auto-Migration of Schema Changes**: `CREATE TABLE IF NOT EXISTS` will not add new columns to an existing table. Whenever adding a column to an existing schema (such as `views INT DEFAULT 0`), always include an idempotent migration statement like `ALTER TABLE <table_name> ADD COLUMN IF NOT EXISTS <col> <type> DEFAULT <default>;` during database initialization.
- **Defensive Property Access**: Protect object method calls with guards like `typeof v.toObject === 'function' ? v.toObject() : { ...v }` and ensure numerical counters default cleanly to `0` (`Number(item.views || 0) + 1`).

## Repository Hygiene & Build Optimization
- **Prevent Heavy Runtime Artifact Leaks**: When introducing disk volume file storage (e.g., custom video/image uploads), immediately add `uploads/` and `**/uploads/` to `.gitignore` and `.dockerignore`. Failing to do so can cause multi-gigabyte media uploads to accidentally leak into Git history or bloat Docker build contexts.
- **Dead Migration Artifacts**: Following a database engine migration (e.g., MongoDB -> PostgreSQL), thoroughly search for and prune dead imports, unused driver dependencies (e.g., `mongoose`), and legacy storage services (e.g., `GridFS`) to keep container images lean and code maintainable.

## CI/CD & Drone SSH Multiline Secret Injection
- **Drone SSH Line Splitting**: Actions like `appleboy/ssh-action` (backed by Drone SSH) append exit code evaluation (`DRONE_SSH_PREV_COMMAND_EXIT_CODE=...`) to every single physical line in the `script: |` block.
- **Embedded Newlines in Secrets**: If a secret in GitHub Secrets contains an accidental trailing newline (common when pasting from AWS Console), interpolating `${{ secrets.VAR }}` inside the multi-line script causes Drone SSH to treat the trailing newline as a command boundary, injecting the exit code check directly into the string value (e.g., `mydb.rds.amazonaws.comDRONE_SSH_PREV_COMMAND_EXIT_CODE=...`).
- **Airtight Fix**:
  1. Never interpolate un-sanitized secrets directly into multi-line SSH script commands.
  2. Strip CRLF/newlines on the GitHub runner (`printf '%s' "$val" | tr -d '\r\n '`).
  3. Bundle production `.env` files and base64-encode them on the runner (`base64 | tr -d '\r\n'`), decoding on the target server via `echo "$ENV_B64" | base64 -d > .env`. Base64 contains zero newlines or special characters, completely eliminating command line injection risks.
- **Heredocs in YAML `run: |` blocks**: Never drop lines to column 0 inside a YAML literal scalar block (`run: |`). Standard YAML parsers interpret column 0 as the end of the block, causing subsequent lines to be parsed as invalid root YAML keys. Always use indented shell command grouping (e.g. `{ echo "..."; } > file`) or properly indented heredocs to maintain YAML indentation.

## Docker & Client-Side Environment Best Practices
- **Docker Compose `.env` Variable Quoting**: Complex strings containing angle brackets or spaces like `EMAIL_FROM="Netflix Clone <user@gmail.com>"` must be wrapped entirely in quotes. Partial quoting like `"Name" <user@email>` causes Compose to fail parsing with `unexpected character "<" in variable name`.
- **Vite Client-Side Build Arguments in Docker**: Variables prefixed with `VITE_*` are baked into JavaScript bundles at build time (compile-time) rather than container runtime. When dockerizing Vite applications, declare `ARG VITE_*` and `ENV VITE_*=$VITE_*` before `RUN npm run build`, and pass them via `build-args` in Docker Compose and CI/CD pipelines.


