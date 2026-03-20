---
name: prettier
description: Runs Prettier on all untracked, modified, and staged files, removes unused imports, and fixes any lint errors. Use when the user invokes /prettier, asks to format changed files, or requests prettier on modified files.
---

# Prettier on New and Changed Files

## Steps

### 1. Get Changed Files
Use `git status --porcelain=v1 --untracked-files=all` as the single source of truth.
- Keep untracked (`??`), modified, and staged files
- Drop deleted files
- For renames, use the destination path
- De-duplicate the final list

### 2. Filter Files
Exclude `node_modules`, `.next`, and `dist`. Apply per tool:
- **organize-imports:** `ts, tsx, js, jsx` only
- **Prettier:** `ts, tsx, js, jsx, json, md, css, scss, yaml, yml`

### 3. Re-resolve the File List Before Each Step
Do not reuse a stale list between commands.

### 4. Run `organize-imports-cli`
Remove unused imports on `ts/tsx/js/jsx` files first.

**Bash/Unix:**
```bash
mapfile -t changedFiles < <(
  git status --porcelain=v1 --untracked-files=all | awk '
    {
      status = substr($0, 1, 2)
      path = substr($0, 4)
      if (status ~ /D/) next
      if (path ~ / -> /) {
        split(path, parts, " -> ")
        path = parts[length(parts)]
      }
      print path
    }
  ' | sort -u
)

tsJsFiles=()
for file in "${changedFiles[@]}"; do
  [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]] || continue
  [[ "$file" =~ (node_modules|\.next|dist) ]] && continue
  tsJsFiles+=("$file")
done

[ ${#tsJsFiles[@]} -gt 0 ] && bunx organize-imports-cli "${tsJsFiles[@]}"
```

**Windows PowerShell:**
```powershell
$changedFiles = @(git status --porcelain=v1 --untracked-files=all) | ForEach-Object {
  if (-not $_) { return }
  $status = $_.Substring(0, 2)
  if ($status -match "D") { return }
  $path = $_.Substring(3)
  if ($path -match " -> ") { $path = ($path -split " -> ", 2)[1] }
  $path
} | Sort-Object -Unique

$tsJsFiles = $changedFiles | Where-Object {
  $_ -match '\.(ts|tsx|js|jsx)$' -and $_ -notmatch 'node_modules|\.next|dist'
}

if ($tsJsFiles.Count -gt 0) { bunx organize-imports-cli @tsJsFiles }
```

### 5. Run Prettier

**Bash/Unix:**
```bash
mapfile -t changedFiles < <(
  git status --porcelain=v1 --untracked-files=all | awk '
    {
      status = substr($0, 1, 2)
      path = substr($0, 4)
      if (status ~ /D/) next
      if (path ~ / -> /) {
        split(path, parts, " -> ")
        path = parts[length(parts)]
      }
      print path
    }
  ' | sort -u
)

files=()
for file in "${changedFiles[@]}"; do
  [[ "$file" =~ \.(ts|tsx|js|jsx|json|md|css|scss|yaml|yml)$ ]] || continue
  [[ "$file" =~ (node_modules|\.next|dist) ]] && continue
  files+=("$file")
done

[ ${#files[@]} -gt 0 ] && bunx prettier --write "${files[@]}"
```

**Windows PowerShell:**
```powershell
$changedFiles = @(git status --porcelain=v1 --untracked-files=all) | ForEach-Object {
  if (-not $_) { return }
  $status = $_.Substring(0, 2)
  if ($status -match "D") { return }
  $path = $_.Substring(3)
  if ($path -match " -> ") { $path = ($path -split " -> ", 2)[1] }
  $path
} | Sort-Object -Unique

$files = $changedFiles | Where-Object {
  $_ -match '\.(ts|tsx|js|jsx|json|md|css|scss|yaml|yml)$' -and $_ -notmatch 'node_modules|\.next|dist'
}

if ($files.Count -gt 0) { bunx prettier --write @files }
```

### 6. Run Lint and Fix Errors
After formatting, run the project's lint command (e.g. `bun run lint` or `turbo run lint`). Fix all reported errors — do not skip or ignore them. Lint errors are part of the task.

## Package Manager
Use the project's package manager (`bun`, `npm`, `pnpm`, or `yarn`). Default to `bunx` or `npx` for running tools when no format script exists.
