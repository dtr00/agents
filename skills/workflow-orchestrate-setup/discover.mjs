#!/usr/bin/env node
// Lists this machine's Codex homes for /orchestrate-setup. Prints JSON only.
// Reads just the email and plan claims from each login's ID token; never prints tokens.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const home = homedir();

function claimsOf(authPath) {
  try {
    const auth = JSON.parse(readFileSync(authPath, "utf8"));
    const payload = auth?.tokens?.id_token?.split(".")[1];
    if (!payload) return {};
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return { email: claims.email ?? null, plan: claims["https://api.openai.com/auth"]?.chatgpt_plan_type ?? null };
  } catch {
    return {};
  }
}

function loginStatus(codexHome) {
  const r = spawnSync("codex", ["login", "status"], {
    env: { ...process.env, CODEX_HOME: codexHome },
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const text = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n")[0];
  return { loggedIn: r.status === 0, detail: text };
}

const candidates = new Set(
  readdirSync(home, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith(".codex"))
    .map((e) => join(home, e.name)),
);
if (process.env.CODEX_HOME) candidates.add(process.env.CODEX_HOME);

const homes = [...candidates].sort().map((dir) => {
  const authPath = join(dir, "auth.json");
  const hasAuth = existsSync(authPath);
  return { home: dir, hasAuth, ...(hasAuth ? { ...loginStatus(dir), ...claimsOf(authPath) } : {}) };
});

const servers = [];
try {
  const cfg = JSON.parse(readFileSync(join(home, ".claude.json"), "utf8"));
  for (const [name, s] of Object.entries(cfg.mcpServers ?? {})) {
    const cmd = [s.command, ...(s.args ?? [])].join(" ");
    if (cmd.includes("codex-delegate-mcp")) servers.push({ name, codexHome: s.env?.CODEX_HOME ?? null, command: cmd });
  }
} catch {}

console.log(JSON.stringify({ platform: process.platform, envCodexHome: process.env.CODEX_HOME ?? null, homes, servers }, null, 2));
