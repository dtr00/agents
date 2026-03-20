---
name: generate-commits
description: Generates atomic commit messages for all uncommitted work. Use when the user invokes /generate-commits or asks to generate commit messages for current changes.
---

# Generate Commits

Generate atomic commit messages for all currently uncommitted work.

## Before Writing Commits

Run `git diff` or `git diff --stat` to inspect the actual changes. **Do not default to `feat`** — evaluate the diff and pick the correct type:

- **feat** — new functionality, components, or capabilities
- **fix** — bug fixes, correcting behavior, reverting regressions
- **refactor** — restructuring code; behavior change is incidental or internal

> Changing existing component behavior (e.g. replace → push/pop) is typically `fix` or `refactor`, not `feat`.
> Changing loading UI presentation (e.g. text → spinner) is `refactor`, not `fix`.

Match the commit style used in the existing git history.

## Commit Scope

Group commits by **feature or scope**, not by tiny individual changes (exception: things like `chore: update bun.lock`).

Do not create separate commits for formatting-only changes. Omit formatting-only files or fold them into the relevant feature commit.

## Subject Line

Keep it short and direct. Do not over-explain the scope in the subject.

## Description

- Use bullet points if covering multiple changes
- Keep it brief — 1 to 3 short lines or bullets
- Do not repeat the subject line
- Do not list files or implementation details
- Generalize the changes rather than over-specifying

**Avoid:**
```
