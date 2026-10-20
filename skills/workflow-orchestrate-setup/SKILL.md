---
name: workflow-orchestrate-setup
description: Configure which Codex accounts and model /workflow-orchestrate uses on this machine. Discovers Codex homes, asks the user how to route them, registers the MCP servers, and writes the config block in the orchestrate skill. Runs only when the user types /workflow-orchestrate-setup.
disable-model-invocation: true
argument-hint: [dry-run]
---

# Orchestrate setup: map this machine's Codex accounts for /workflow-orchestrate

The user invoked `/workflow-orchestrate-setup` with: $ARGUMENTS

If the arguments contain `dry-run`: do steps 0 to 3 (including 0b), print which copy you would configure and what you found and the config block you would write, and change nothing and ask nothing.

Goal: make `/workflow-orchestrate` route Codex delegations across this machine's Codex accounts, in an order the user chooses. `/workflow-orchestrate` reads its accounts from the block between `<!-- ORCHESTRATE-CONFIG:BEGIN -->` and `<!-- ORCHESTRATE-CONFIG:END -->` in the `SKILL.md` of the orchestrate skill that sits next to this skill (see "0b. Pick which orchestrate copy to configure"). Setup is the only thing that rewrites that block.

Rules for the whole run:
- Never print, copy or edit tokens or `auth.json` contents. The discovery helper reads the email and plan claims; use only those, to label accounts.
- Never run `codex login` for the user (it opens a browser). Tell them the exact command and wait.
- Don't delete or change an existing MCP server unless the user agrees.
- Ask with the AskUserQuestion tool (load it with ToolSearch `select:AskUserQuestion` if deferred). Recommend a default in each question; keep it to what the user must decide.

## 0. Check file access

Setup must read the user's home folder (`~/.codex*`, `~/.claude.json`) and edit the orchestrate skill's `SKILL.md`, which may be under `~/.claude/skills`. Try listing the user's home folder. If that is blocked (for example by the `blockReadsOutsideWorkingDirectories` permission setting), stop and tell the user to do one of these, then run `/workflow-orchestrate-setup` again:

- run `/add-dir <their home folder>` in this session, or
- start Claude Code from their home folder, or
- temporarily relax that permission setting.

Don't try to work around the block with other tools or shells.

## 0b. Pick which orchestrate copy to configure

Configure the copy that sits next to this setup skill: the sibling directory named `workflow-orchestrate` (or `orchestrate` if it was installed under the short name). That is the copy the user is invoking, so a project-local install configures the project and a personal install configures the personal one. Follow the project's local skills; don't go looking elsewhere for a "better" copy.

1. Resolve the absolute path of that copy's `SKILL.md`, and say whether it is project-local (inside the current project, for example `.claude/skills/` or `.agents/skills/`) or personal (`~/.claude/skills/`).
2. Look for other copies named `orchestrate` or `workflow-orchestrate` in the current project's `.claude/skills/` and `.agents/skills/` and in `~/.claude/skills/`. List any you are not updating and ask whether to update them too. If a project copy and a personal copy both exist, warn that they can shadow each other and the user should keep one as the source of truth.
3. If the chosen copy is inside a git repository, its config block will be committed with the project. Account routing belongs to the machine, so for such copies label accounts by plan only (for example `Plus`, `Team`), never by email, and tell the user why. Use emails only if they explicitly ask for them. The MCP servers are registered at user scope regardless.

## 1. Check prerequisites

Run, and report any that fail (stop on a failure the user must fix):

- `node --version` (needs 20+), `claude --version`, `codex --version`, `git --version`
- `claude plugin list`: the `codex-delegate@codex-delegate-mcp` plugin must be installed and enabled. If not, offer to run `claude plugin marketplace add andreilungeanu/codex-delegate-mcp` then `claude plugin install codex-delegate@codex-delegate-mcp`, and note the user must restart Claude Code afterwards. Remember its version for step 5.

## 2. Discover Codex homes and servers

Run the helper from this skill's directory, as a plain command with no inline environment variables or `-e` snippets:

`node <this skill's directory>/discover.mjs`

It prints JSON: every `~/.codex*` directory (plus `$CODEX_HOME`) with whether it has an `auth.json`, its `codex login status`, and the account email and plan; and every already-registered MCP server that runs `codex-delegate-mcp` with the `CODEX_HOME` it is pinned to. It never prints tokens. Don't read `auth.json` yourself.

From its output: report homes that exist but aren't logged in separately; flag two homes with the same email as the same account; and note which existing servers you can reuse. The plugin's own server is `plugin:codex-delegate:codex-delegate`; it uses whichever `CODEX_HOME` Claude Code was started with, which is `~/.codex` unless `envCodexHome` says otherwise. The user decides what to do with homes not currently in `/workflow-orchestrate`'s config.

Also run `codex debug models` and list the model slugs and reasoning efforts it offers (print only slug and efforts).

## 3. Propose a routing

Build a proposed ordered list of accounts: one entry per distinct logged-in account, with its home, email, plan and the MCP server that will serve it (reuse an existing server that already points at that home; the plugin's server for `~/.codex`; otherwise a new server named `codex-delegate-<label>`, with a short label like `two`, `three`, or a name the user gives).

Suggest the order Plus/personal first only as a default; the user decides.

## 4. Ask the user (skip in dry-run)

Ask, in as few questions as possible:

1. Which of the discovered accounts should `/workflow-orchestrate` use, and in what order (first = used first, the rest are fallbacks when a usage limit is hit)? Present the proposed list.
2. If a home exists but isn't logged in, ask whether to skip it or wait while they log in. Give the exact command (PowerShell: `$env:CODEX_HOME="<home>"; codex login`; bash: `CODEX_HOME=<home> codex login`) and re-check after they say it's done.
3. If the user wants an account whose home doesn't exist yet, create the empty directory for them and give the login command above.
4. The Codex model and reasoning effort. Offer the model they pick from step 2's list. Recommend `gpt-6.1-sol` at `medium` if it's offered, otherwise the first listed model at `medium`. Don't enable fast mode.

Only one account is a valid setup: then there is no failover, which is fine.

## 5. Apply (skip in dry-run)

For each chosen account that needs a new MCP server, register it at user scope. Put the server name first, because `-e` swallows the next argument:

- Windows: `claude mcp add <name> --scope user -e CODEX_HOME=<absolute home path> -- cmd /c npx -y codex-delegate-mcp@<plugin version>`
- macOS/Linux: `claude mcp add <name> --scope user -e CODEX_HOME=<absolute home path> -- npx -y codex-delegate-mcp@<plugin version>`

If the chosen first account isn't `~/.codex` or the plugin server doesn't map to a chosen home, register every account as its own server and leave the plugin's server unused; say so.

Then rewrite the block between the markers in the copy chosen in step 0b (edit only the lines between the markers), in this exact shape:

```
<!-- ORCHESTRATE-CONFIG:BEGIN -->
- Codex model: `<model>`
- Reasoning effort: `<effort>`

| Order | MCP server | Codex home | Account |
|---|---|---|---|
| 1 | `<server>` | `<home>` | <label> (<plan>) |
...
<!-- ORCHESTRATE-CONFIG:END -->
```

`<label>` is the email for a personal copy, and the plan alone for a copy inside a git repository (step 0b). Use `~/` for homes under the user's home folder. If the skill file or markers are missing, stop and tell the user the orchestrate skill needs reinstalling; don't create a second config.

## 6. Verify and report

- `claude mcp list`: every chosen server must show Connected. Investigate any that don't.
- `codex login status` for each chosen home.
- Report the final routing table, the model and effort, and what you registered or changed.
- Tell the user to **restart Claude Code** so the new servers and the updated skill load, then try `/workflow-orchestrate` on a small task. Offer a quick connectivity check afterward: one tiny `ask`-mode delegation per account.
