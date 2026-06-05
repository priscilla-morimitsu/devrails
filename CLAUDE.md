# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

devrails is a **zero-dependency Node.js CLI** (`npx devrails`) that lets teams write their AI coding guard-rails once in `.devrails/rules/` and sync them to every AI tool's native format (Claude Code, Cursor, GitHub Copilot, Gemini, and the open AGENTS.md standard). Enforcement runs through a git pre-commit hook and CI workflow that call `devrails check`, so the same guard-rails fire regardless of which AI tool wrote the code.

## Commands

```bash
npm test                    # run the smoke test (node test/smoke.js)

node bin/devrails.js init   # scaffold .devrails/ into cwd and sync all targets
node bin/devrails.js sync   # regenerate target files from .devrails/rules/
node bin/devrails.js check --staged   # run guardrails on staged files (git hook entry point)
```

There is no build step — plain CommonJS, no compilation.

## Architecture

```
bin/devrails.js     Entry point — requires src/cli.js and calls main()
src/cli.js          Arg parsing and command dispatch
src/commands.js     init / sync / check implementations
src/targets.js      One writer per target (agents, claude, gemini, cursor, copilot)
src/lib.js          Shared helpers: readFile, writeFile, slugify, ensureDir, copyDir,
                    GENERATED_BANNER, frontmatter parser, loadRules, loadConfig
src/scaffold/       Files copied verbatim into a project's .devrails/ by `init`
  .devrails/rules/          Default rule set (security, code-standards, nextjs, accessibility)
  .devrails/guardrails/     block-secrets.sh — the check script installed into user projects
  .devrails/templates/      PRD / spec / ADR markdown templates
  claude-assets/            Bundled Claude Code extras (agents, commands, hook adapter scripts)
test/smoke.js       End-to-end test: scaffolds into a temp dir, asserts all outputs exist
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
4. **`check`** collects files (from CLI args or `--staged` via `git diff --cached --name-only`), runs each `.sh` in `.devrails/guardrails/` over them, exits non-zero on violation.

## Key conventions

- The project is CommonJS (`"type": "commonjs"`). No ESM, no TypeScript, no build step.
- `GENERATED_BANNER` is inserted at the top of every generated file so users know to edit `.devrails/rules/` and re-run `sync`, not the generated outputs.
- `slugify` converts rule titles to filesystem-safe slugs used as filenames for Cursor `.mdc` and Copilot `.instructions.md` files.
- The smoke test is the spec: it exercises `init` + `sync` end-to-end and asserts every output exists with the right content. When adding a target or changing output structure, add assertions there.
