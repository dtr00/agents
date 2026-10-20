---
name: workflow-orchestrate
description: Plan a development task, delegate implementation to OpenAI Codex through the codex-delegate MCP servers, verify the result, and report. Runs only when the user types /workflow-orchestrate.
disable-model-invocation: true
argument-hint: <development task>
---

# Orchestrate: plan, delegate to Codex, verify, report

The user invoked `/workflow-orchestrate` for this task:

$ARGUMENTS

If no task was given, ask what to build and stop.

You (Claude) plan, delegate, verify and report. OpenAI Codex implements through the `codex-delegate` MCP `delegate` tool. Tool mechanics and result fields live in the plugin's `delegate` skill; load it before the first delegation. Don't restate it and don't shell out to `codex` when the MCP tool is available.

Project instructions (the repo's `CLAUDE.md`/`AGENTS.md`) always win over this file.

The orchestrator is whatever model the user is running this session on (Opus, Sonnet, Fable or anything else). Don't assume or switch it, and never set a `model` override when spawning subagents, so they inherit the user's model. Only the Codex worker model in the configuration is fixed.

## Configuration (written by `/workflow-orchestrate-setup`; don't hand-edit)

<!-- ORCHESTRATE-CONFIG:BEGIN -->
NOT CONFIGURED. Run `/workflow-orchestrate-setup` to choose the Codex model and accounts.
<!-- ORCHESTRATE-CONFIG:END -->

If the block above says `NOT CONFIGURED`, or a listed MCP server's `delegate` tool can't be found (look with ToolSearch), stop and tell the user to run `/workflow-orchestrate-setup`. Don't guess accounts.

## Standing preferences (the user has asked for these)

- Pass the configured Codex model and reasoning effort on every `delegate` call, resumes included. Raise the effort only when the user asks. Never set `fast: true` unless asked.
- If a call is refused for an unknown model, run `doctor` with `deep: true`, list the available models and efforts for the user, and don't switch silently.
- Never push, deploy or open a pull request through a delegation or otherwise unless the user explicitly says to. Say so in the brief.

## Usage-limit failover

Each configured account is its own MCP server with an identical `delegate`/`cancel`/`doctor` tool set, pinned to one `CODEX_HOME`. Rotate in the table's order. With a single account, there is nothing to rotate to: report the limit and its reset time.

- Start on the first account that isn't known to be limited. Keep a short list this session of which accounts are limited and when they reset.
- A run is **limit-blocked** when `status` isn't `completed` and the failure text (`warnings`, `result`, or the tool error) mentions a usage/rate limit or quota, "try again at", or "hit your limit". Record the reset time if given, then retry the **same brief** on the next account in order. Other failures (bad model, timeout, test failures, agent errors) are not limit-blocks. Don't rotate on those; diagnose them.
- Before retrying, run `git status`/`git diff`. A limited run can stop mid-task. If it left changes, either keep them and tell the next account in the brief what's already in the tree, or discard only Codex's own partial edits (never the user's).
- A thread belongs to one account. `resumeThreadId` only works on the server that created it. If that account is limited, start a fresh thread on another account (a `resumed: false` result is expected) and put the prior context in the brief.
- All accounts limited: stop, report each reset time, and offer to do the work yourself or wait. Don't loop.
- For two parallel delegations, put them on different accounts.
- Use the same model/effort settings on every account. Run `doctor` on the specific server if one acts up. Don't edit the accounts' `auth.json` files, and never print tokens.

## Planning and splitting

Examine the repo first, then decide the work before delegating anything.

1. Break the request into tasks small enough to review as one diff, each with a checkable outcome.
2. Order them by dependency. A task that needs another's new code or interface waits until that task is verified and its result is in the tree.
3. Treat tasks as independent only if they touch disjoint files and don't depend on a shared new interface. Otherwise serialize them. When tasks must share an interface, fix its exact shape in every brief.
4. Delegate each task with its own brief (below). One task per delegation.

## When to delegate

- Trivial (typo, rename, one-liner): do it yourself.
- Substantial implementation (multi-file feature, refactor, test suite): delegate, and don't also implement it yourself.
- Large, risky or ambiguous: `mode: "plan"` first, show the user the plan if it involves a real decision, then `mode: "agent"` on the same thread with `resumeThreadId`.
- Questions about the code: `mode: "ask"`. Review of a diff or commit: `mode: "review"` with a `reviewTarget`.
- Architecture, task splitting, dependency ordering and the final sign-off stay with you.

## Claude subagents for non-implementation work

Codex implements. Use Claude subagents (Agent tool, no `model` override so they inherit yours) for work around the implementation: exploring the codebase, researching an API, reading logs, drafting test plans, or reviewing a diff. Give each a narrow brief and a read-only job; they don't write the code that Codex is delegated, and you still check what they report against the repo.

## The brief (`spec`)

Write the spec with:

1. Objective and expected outcome.
2. Relevant files and directories (point at them; don't paste code).
3. Architectural constraints and the project conventions Codex can't see: lint/format commands, strictness rules, "don't edit generated or synced files", and so on.
4. Implementation requirements.
5. Decisions already made, quoting the user's exact values.
6. Done when: concrete, checkable criteria, including the exact test/typecheck/lint commands to run.

Never put credentials, tokens or keys in a brief; Codex stores whole threads in `~/.codex/sessions`.

## Verification (never accept "completed" as proof)

After every delegation:

1. `status` is `completed`; read `warnings` and `filesReportedByEditTools`.
2. Run `git status` and `git diff` yourself. The diff, not Codex's summary, is the record. Shell-written files don't appear in `filesReportedByEditTools`.
3. Look for unintended changes, files outside scope, and anything outside the workspace.
4. Run the relevant tests, typecheck and lint yourself.
5. Check each acceptance criterion.

If it fails, send a focused correction with `resumeThreadId` and the same `workspace`. At most 2 correction rounds. Then start one fresh thread with a rewritten brief, or stop and report the blocker to the user. Don't loop.

## Parallelism

- **Claude Code runs MCP tool calls one at a time**, even several `delegate` calls issued in one turn (measured: each starts right after the previous finishes). For real concurrency, spawn one background subagent per delegation (Agent tool, `run_in_background: true`, no `model` override so it inherits yours). Each subagent makes exactly one `delegate` call against its assigned server/account and workspace, and returns the raw result JSON (status, reason, warnings, threadId, delegationId, filesReportedByEditTools) without summarizing it away. You then verify each result yourself. Don't let a subagent edit files itself.
- A single delegation needs no subagent; call `delegate` directly.
- At most 2 implementation delegations at once, and only for genuinely independent work. The cap keeps parallel diffs reviewable; it isn't an account limit.
- Each needs its own workspace: a separate git worktree or an independent directory. Two delegations on the same tree overwrite each other.
- Keep a list of active `delegationId`s and their tasks. Cancel with `cancel` (by `delegationId`) when a run is stale or no longer needed.
- Review and merge each result deliberately, one at a time.

## Safety

`delegate` runs Codex with `--dangerously-bypass-approvals-and-sandbox` in every mode. `workspace` is a working directory, not a sandbox, and `plan`/`ask`/`review` don't prevent writes. So:

- Set `workspace` to the smallest directory that holds the task's files. Never `$HOME` or a drive root.
- Don't point a delegation at content the user didn't write (prompt-injection and exfiltration risk).
- Before starting, check for uncommitted user changes in the workspace. If there are some, commit them to a WIP commit or use a separate worktree so Codex can't clobber them. Never discard them.
- Inspect any unexpected change before accepting the result.

## Final report

Summarize: what was implemented, which work went to Codex (model, thread/delegation ids), files changed, which checks passed or failed (with output for failures), and any remaining issues.
