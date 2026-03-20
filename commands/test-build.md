---
name: test-build
description: Runs the build-dev script and iteratively fixes any errors until the build passes. Use when the user invokes /test-build.
---

# Test Build

## Steps

1. **Check for `build-dev` script** in the root `package.json`. If it does not exist, stop and notify the user.

2. **Run `build-dev`** using the project's package manager (e.g. `bun run build-dev`).

3. **Fix any errors** that occur, then re-run the build. Repeat until the build passes with no errors.

4. **Summarize the results** — report whether the build passed, and list any changes made during the process (if any).
