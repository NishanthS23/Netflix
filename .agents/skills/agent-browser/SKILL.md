---
name: agent-browser
description: Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing web apps, or automating any browser task. Triggers include requests to "open a website", "fill out a form", "click a button", "take a screenshot", "scrape data from a page", "test this web app", "login to a site", "automate browser actions", or any task requiring programmatic web interaction.
---

# agent-browser

Fast browser automation CLI for AI agents using Chrome/Chromium via CDP with accessibility-tree snapshots and compact `@eN` element refs.

## Core Loop

1. **Session Setup**: Always isolate browser sessions per task:
   ```bash
   export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix task)"
   ```
2. **Open Page**:
   ```bash
   agent-browser open <url>
   ```
3. **Inspect Interactive Elements**:
   ```bash
   agent-browser snapshot -i
   ```
4. **Interact Using Refs**:
   ```bash
   agent-browser click @e3
   agent-browser fill @e2 "value"
   agent-browser press Enter
   ```
5. **Re-snapshot**:
   Always take a fresh snapshot after actions that change page state:
   ```bash
   agent-browser snapshot -i
   ```

## Common Commands

- **Navigation & Reading**:
  - `agent-browser open <url>`: Navigate to URL
  - `agent-browser snapshot -i`: View interactive elements with `@eN` refs
  - `agent-browser snapshot -i -u`: Include link URLs
  - `agent-browser read [url]`: Read rendered DOM or markdown of a page
  - `agent-browser get text @eN`: Read visible text of an element
  - `agent-browser get title` / `agent-browser get url`: Page title and URL

- **Interactions**:
  - `agent-browser click @eN` / `agent-browser dblclick @eN`
  - `agent-browser fill @eN "text"`: Clear and type
  - `agent-browser type @eN "text"`: Type without clearing
  - `agent-browser press Enter` / `agent-browser press Control+a`
  - `agent-browser hover @eN` / `agent-browser focus @eN`
  - `agent-browser select @eN "option"`
  - `agent-browser scroll down 500` / `agent-browser scrollintoview @eN`

- **Waiting**:
  - `agent-browser wait @eN`: Wait until element appears
  - `agent-browser wait --text "text"`: Wait for text on page
  - `agent-browser wait --url "**/pattern"`: Wait for URL match
  - `agent-browser wait --load load`: Wait for load event

- **Screenshots & Media**:
  - `agent-browser screenshot [path.png]`
  - `agent-browser screenshot --full [path.png]`
  - `agent-browser screenshot --annotate [path.png]`

- **Tabs & Sessions**:
  - `agent-browser tab`: List open tabs
  - `agent-browser tab new <url>`: Open new tab
  - `agent-browser tab <tabId>`: Switch to tab
  - `agent-browser close`: Close active browser session

## CLI Skill References
- Core guide: `agent-browser skills get core`
- Full reference: `agent-browser skills get core --full`
- Diagnostics: `agent-browser doctor`
