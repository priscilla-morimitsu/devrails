# Changelog

This project adheres to [Semantic Versioning](https://semver.org).

## [0.2.4] - 2026-06-05

### Fixed
- `block-secrets` guardrail now reports **every matching line with its line number**, instead of one violation per pattern per file. Previously, a file with three hardcoded tokens was reported as a single violation — now each line appears individually, so `devrails audit` and `devrails check` give a complete picture of all exposures.

## [0.2.3] - 2026-06-05

### Changed
- Version bump to publish `audit` command and `check-code-quality` guardrail (v0.2.2 was already on npm before these changes landed).

## [0.2.2] - 2026-06-05

### Added
- **`devrails audit [dir]`** — scans the whole project (not just staged files) against every guardrail script and lists all violations grouped by guardrail. Designed for the "just installed devrails, what's broken?" workflow. Exits 0 when clean, 1 on any violation.
- **`check-code-quality` guardrail** — second guardrail script, installed alongside `block-secrets`. Covers TypeScript/JS quality issues: `any` type usage (`: any`, `as any`, `Array<any>`, `Promise<any>`), leftover `console.log` in non-test files, and empty `catch {}` blocks.

### Changed
- `src/lib.js` exports `walkProjectFiles` — recursive project walker that skips `node_modules`, `.git`, `.devrails`, `dist`, `.next`, `build`, and other generated directories. Used by `audit`.
- Smoke test updated to verify the full audit pass/fail/fix cycle end-to-end.

## [0.2.1] - 2026-06-05

### Added
- **Rich Claude Code target.** Syncing the `claude` target now generates the full native feature set, not just `CLAUDE.md`:
  - Glob-scoped rules become skills under `.claude/skills/<slug>/SKILL.md` (auto-invoked); global rules stay in `CLAUDE.md`.
  - Subagents (`code-reviewer`, `security-auditor`, `accessibility-auditor`, `test-writer`) under `.claude/agents/`.
  - Slash commands (`/review`, `/new-feature`) under `.claude/commands/`.
  - Native `PreToolUse`/`PostToolUse` hooks via adapter scripts in `.claude/hooks/`, wired through a **safely merged** `.claude/settings.json` (existing settings are preserved).
- The Claude hooks reuse the same shared `.devrails/guardrails/` scripts as `devrails check`, so secret-scanning logic is defined once.

### Notes
- Other targets (Cursor, Copilot, Gemini, AGENTS.md) are unchanged — only the `claude` target gained the extra outputs.

## [0.2.0] - 2026-06-04

### Added
- **Tool-agnostic CLI.** `devrails` is now a zero-dependency Node CLI distributed on npm.
- Single source of truth in `.devrails/rules/` synced to five targets: AGENTS.md, Claude Code (`CLAUDE.md`), Cursor (`.cursor/rules/*.mdc`), GitHub Copilot (`.github/copilot-instructions.md` + scoped `instructions/*.instructions.md`), and Gemini (`GEMINI.md`).
- `devrails init` — scaffold, target detection, git pre-commit hook + CI workflow, first sync.
- `devrails sync` — regenerate all targets from the source rules.
- `devrails check` — deterministic guard-rails over files/staged changes, for the git hook and CI.
- Default Next.js fullstack rule set (App Router patterns, code standards, accessibility WCAG 2.2 AA, security) and PRD/spec/ADR templates.
- `block-secrets` guard-rail: blocks hardcoded credentials and secrets leaking into client code / `NEXT_PUBLIC_*`.

### Changed
- Reframed from a Claude Code-only plugin (v0.1.0) to a tool-agnostic CLI. The Claude Code plugin format is now one of several sync targets rather than the whole product.

## [0.1.0] - 2026-06-04
- Initial Claude Code plugin: skills, agents, hooks, commands, and templates for a Next.js fullstack project.
