# Changelog

This project adheres to [Semantic Versioning](https://semver.org).

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
