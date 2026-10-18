# Code Development for AI Agents

Guide for AI agents working on **<project name>**, <one-line description of what it is and who it is for>.

Copy this file to the root of a project and fill in the placeholders. Delete any rule that does not apply.

## Principles

- **<Principle one>.** <What it means in practice.>
- **Keep it light.** Prefer the standard library and native platform features over new dependencies.
- **Ship to every target platform.** <List the platforms, for example Linux, Windows and macOS.>

## Stack

- <Package manager and workspace layout>
- <Language and runtime>
- <Framework>
- <Styling and UI libraries>

## Skills

Repository skills live under `.agents/skills/` and are grouped by namespace. Use the narrowest matching skill for the task, and read its `SKILL.md` before applying specialized guidance.

- `architecture-*`: module and interface design, where boundaries go, finding refactors that deepen modules, and Feature-Sliced Design for frontend structure.
- `frontend-*`: React, Vite, TanStack Start, Tailwind CSS and design tokens, shadcn, animation, visual design, UI polish, and frontend performance.
- `pstack-*`: from Cursor's [pstack](https://github.com/cursor/plugins/tree/main/pstack) plugin by Lauren Tan (MIT), installed as dependencies of `quality-no-comments`: code walkthroughs, design rationale, design sketches, parallel candidates, adversarial review, and debugging principles.
- `quality-*`: clean code principles, strict code quality reviews, AI slop cleanup, and comment cleanup.
- `workflow-*`: minimal solutions, test-driven development, conventional commits, and pull requests (`workflow-pull-request`: description plus before and after images).

Remove the groups a project does not use. Add a `backend-*` group (or any other) when the project needs one.

Subagents live under `.agents/agents/` and are symlinked into `.claude/agents/` and `.cursor/agents/`. `pstack-comment-sicko` is used by `quality-no-comments`.

Install skills to `.agents/skills/` as `<group>-<name>`. Record each one's upstream in `skills-lock.json`.

## Project rules

Defaults carried over from earlier projects. Keep, change or delete each one.

### Tooling

- <Package manager>: use it for every install and script, never another one. For Bun: `bun`/`bunx`, never npm, npx, yarn or pnpm.
- For a monorepo, run installs and root scripts from the repository root. Add each dependency to the workspace that imports it, never to the root, which only holds repo-wide tools. Do not add a build orchestrator or a second lockfile.
- An app never imports from another app. Code needed by two apps moves to a shared package.
- Prefer stdlib and native features over new dependencies.
- Code must work on every target platform.

### Code style

- Do not use `any` in TypeScript, explicit or implicit. Use precise types, or `unknown` and narrow it.
- Name files and folders in kebab-case (`note-editor.tsx`). Exceptions: languages with their own convention (Rust uses snake_case), conventional files (`README.md`, `AGENTS.md`, `SKILL.md`, `Cargo.toml`), and files a framework requires by name (`__root.tsx`, `index.tsx`, `$param.tsx`).
- No barrel exports: no `index.ts` files that re-export other modules. Import from the file that defines the export.
- Do not use em dashes in code, comments, documentation, or user-facing text.

### UI

- Add UI components through the component library's CLI, not by hand. Style with the theme tokens, not raw colors.
- Use one icon library for all icons.
- Do not use the HTML `title` attribute for hover hints. Use the project's `Tooltip` component.
- Context menu and dropdown menu items are text only. Do not add icons to them.

## Running the app as an agent

The user may keep their own dev server running. Agents have hung the session by waiting on the app with a loop that never ends. Follow these rules exactly:

- Use another port and a separate app identifier or data folder so you never touch the user's server or data.
- Run the app in the background with its output in a log file. Never run the dev server in the foreground.
- Every wait must have a hard limit (`timeout 120 ...`). It must also stop when the process dies.
- Match a plain substring that has no colour codes in it, such as a binary path. Many tools colour their output even with `NO_COLOR` set, so a pattern like `Running target` can fail to match.
- Also match failures (`error`, `panicked`) so a crash ends the wait too.
- Tool binaries may be missing from the agent shell's `PATH` (for example `$HOME/.cargo/bin`). Prepend them.
- Stop only what you started, by process group. Never `pkill -f vite` or `pkill -f <tool>`.

```sh
LOG=/tmp/agent-dev.log PIDFILE=/tmp/agent-dev.pid
setsid <dev command> --port=<free port> > $LOG 2>&1 &
echo $! > $PIDFILE
timeout 120 sh -c 'until grep -qE "<ready substring>|[Ee]rror|panicked" "$1"; do kill -0 "$(cat "$2")" 2>/dev/null || exit 1; sleep 1; done' _ $LOG $PIDFILE
tail -5 $LOG

# When done:
kill -- -$(cat $PIDFILE)
```
