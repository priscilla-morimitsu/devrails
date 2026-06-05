# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

devrails is a **zero-dependency Node.js CLI** (`npx devrails`) that lets teams write their AI coding guard-rails once in `.devrails/rules/` and sync them to every AI tool's native format (Claude Code, Cursor, GitHub Copilot, Gemini, and the open AGENTS.md standard). Enforcement runs through a git pre-commit hook and CI workflow that call `devrails check`, so the same guard-rails fire regardless of which AI tool wrote the code.

## Commands

```bash
npm test                          # run the smoke test (node test/smoke.js)

node bin/devrails.js init         # scaffold .devrails/ into cwd and sync all targets
node bin/devrails.js sync         # regenerate target files from .devrails/rules/
node bin/devrails.js audit        # scan whole project and report all violations
node bin/devrails.js audit ./src  # scan a subdirectory
node bin/devrails.js check --staged   # run guardrails on staged files (git hook entry point)
```

There is no build step — plain CommonJS, no compilation.

## Architecture

```
bin/devrails.js     Entry point — requires src/cli.js and calls main()
src/cli.js          Arg parsing and command dispatch
src/commands.js     init / sync / check / audit implementations
src/targets.js      One writer per target (agents, claude, gemini, cursor, copilot)
src/lib.js          Shared helpers: writeFile, slugify, ensureDir, copyDir,
                    GENERATED_BANNER, frontmatter parser, loadRules, loadConfig,
                    walkProjectFiles
src/scaffold/       Files copied verbatim into a project's .devrails/ by `init`
  .devrails/rules/          Default rule set (security, code-standards, nextjs, accessibility)
  .devrails/guardrails/     block-secrets.sh + check-code-quality.sh — installed into user projects
  .devrails/templates/      PRD / spec / ADR markdown templates
  claude-assets/            Bundled Claude Code extras (agents, commands, hook adapter scripts)
test/smoke.js       End-to-end test: scaffolds into a temp dir, asserts all outputs and audit behavior
docs/               Additional documentation
```

## Data flow

1. **`init`** copies `src/scaffold/.devrails/` into the user's project, writes `config.json` for the selected targets, then calls `sync`.
2. **`sync`** reads every `*.md` file in `.devrails/rules/`, parses YAML frontmatter (`title`, `description`, `globs`, `alwaysApply`), and passes the rule list to each target writer in `src/targets.js`.
3. **Target writers** each produce different output:
   - `agents` / `gemini` → single flat markdown file (globs recorded as prose, all rules inlined)
   - `claude` (rich target) → splits rules: global rules (`alwaysApply: true` or no globs) go to `CLAUDE.md`; glob-scoped rules become `.claude/skills/<slug>/SKILL.md`. Bundled agents, commands, and hook adapter scripts are copied from `src/scaffold/claude-assets/`. `.claude/settings.json` is merged to wire `PreToolUse`/`PostToolUse` hooks.
   - `cursor` → one `.mdc` file per rule under `.cursor/rules/`, with `globs` and `alwaysApply` frontmatter
   - `copilot` → global rules → `.github/copilot-instructions.md`; scoped rules → `.github/instructions/<slug>.instructions.md` with `applyTo` frontmatter
4. **`check`** collects files (from CLI args or `--staged` via `git diff --cached --name-only`), runs each `.sh` in `.devrails/guardrails/` over them, exits non-zero on violation. Used by the git hook and CI.
5. **`audit`** walks the whole project via `walkProjectFiles` (skips `node_modules`, `.git`, `.devrails`, `dist`, `.next`, etc.), runs every guardrail script via `spawnSync` with `stderr: pipe`, parses violation lines (lines matching `  [script-name] ...`), and prints a grouped report. Returns `true` (clean) or `false` (violations found) — the CLI calls `process.exit(1)` on false.

## Guardrail scripts

Live in `src/scaffold/.devrails/guardrails/` — installed into the user's project by `init`. Contract: accept file paths as positional args, write violation lines to stderr as `  [script-name] filepath:line: message`, exit 0 if clean, exit 1 on violations.

- **`block-secrets.sh`** — detects hardcoded credentials, AWS/GCP/Azure keys, GitHub/Stripe/Slack/Twilio/SendGrid tokens, private keys, JWTs, DB connection strings with credentials, and secrets in `NEXT_PUBLIC_*` or `"use client"` files.
- **`check-code-quality.sh`** — detects `: any` / `as any` in TypeScript, `console.log` in non-test files, and empty `catch {}` blocks.

Adding a new guardrail: create `.sh` in `src/scaffold/.devrails/guardrails/`, make it executable, follow the contract above, add assertions to the smoke test.

## Claude Code hooks

Live in `src/scaffold/claude-assets/hooks/` — copied to `.claude/hooks/` by `init`. Wired in `mergeSettingsHooks` in `src/targets.js`. Hook contract: read JSON from stdin, exit 0 to allow, exit 2 to block (PreToolUse only — stderr is shown to the model).

| Hook | Event | Matcher | Purpose |
|---|---|---|---|
| `pretooluse-secrets.sh` | PreToolUse | Write\|Edit\|MultiEdit | Calls `block-secrets.sh` on the content about to be written |
| `pretooluse-guardian.sh` | PreToolUse | Bash | Blocks dangerous shell operations (rm -rf, force-push, DROP TABLE, curl\|bash, etc.) |
| `posttooluse-quality.sh` | PostToolUse | Write\|Edit\|MultiEdit | Runs `typecheck` + `lint` scripts from `package.json` |
| `posttooluse-licenses.sh` | PostToolUse | Write\|Edit\|MultiEdit | Warns when new npm packages added to `package.json` carry a restrictive license |
| `posttooluse-logger.sh` | PostToolUse | Write\|Edit\|MultiEdit | Appends `{timestamp, tool, file, cwd}` to `logs/devrails/session.log` |

To add a new hook: create the script in `claude-assets/hooks/`, add a matcher entry in `mergeSettingsHooks` in `targets.js`, add a smoke test assertion.

**Not implemented (no Claude Code equivalent):** `sessionStart`, `sessionEnd`, `userPromptSubmitted` lifecycle events (used by awesome-copilot's Session Auto-Commit, Session Logger, and Governance Audit) do not exist in Claude Code hooks.

## Key conventions

- The project is CommonJS (`"type": "commonjs"`). No ESM, no TypeScript, no build step.
- `GENERATED_BANNER` is inserted at the top of every generated file so users know to edit `.devrails/rules/` and re-run `sync`, not the generated outputs.
- `slugify` converts rule titles to filesystem-safe slugs used as filenames for Cursor `.mdc` and Copilot `.instructions.md` files.
- The smoke test is the spec: it exercises `init` + `sync` + `audit` end-to-end. When adding a command, guardrail, or target, add assertions there.
