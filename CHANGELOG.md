# Changelog

This project adheres to [Semantic Versioning](https://semver.org).

## [0.2.6] - 2026-06-05

### Added
- **`database-reviewer` agent** — reviews Prisma/Drizzle schemas, raw SQL, migrations, and data-access functions for N+1 queries, missing indexes, migration safety, SQL injection risk, and data integrity constraints. Read-only (reports findings, does not edit files).
- **`database.md` rule** — guardrail rules for database access: parameterized queries, unbounded queries, N+1 detection, index requirements, migration discipline (additive-first, backfill discipline, rollback planning), and data integrity (ON DELETE behavior, transactions, optimistic locking, soft-delete filtering).
- **Enhanced `security.md` rule** — added an AI/LLM Security section covering OWASP LLM Top 10: prompt injection (LLM01), insecure output handling (LLM02), training data poisoning (LLM03), excessive agency (LLM08), model access controls, sensitive data in prompts (LLM06), and supply chain (LLM05).
- **`architect` agent** — system architecture reviewer. Reads source code and produces findings grouped by severity (Critical / Significant / Suggestion) across security, data model, API surface, scalability, AI/agent systems, and operational concerns. Can create ADRs at `docs/architecture/ADR-NNN-<title>.md`. Read-only on source files.
- **`tech-writer` agent** — documentation writer for READMEs, API/Server Action docs, JSDoc, ADRs, and changelogs. Reads source files to verify accuracy before writing. Does not modify source code.
- **`tdd-red` agent** — TDD red phase: writes failing tests before any implementation, following AAA pattern. Presents a test plan and waits for confirmation before writing. Part of the `/tdd` workflow.
- **`tdd-green` agent** — TDD green phase: writes the minimum production code to make failing tests pass. Lists shortcuts for the refactor phase. Does not modify tests.
- **`tdd-refactor` agent** — TDD refactor phase: cleans up the implementation after tests are green, applying code-standards, nextjs-patterns, and security-review. Does not add features not covered by tests.
- **`/tdd` command** — orchestrates the full TDD cycle (red → green → refactor) through the three TDD agents, with user confirmation gates between phases.
- **`/context-map` command** — maps the callers, dependencies, and shared contracts of a file or feature before a change, so the blast radius and sequencing are clear.
- **`/refactor-plan` command** — sequences a multi-file refactor into safe, atomic, independently-committable steps with rollback paths. Flags coordination points (migrations, feature flags).
- **`devrails report`** — reads `logs/devrails/session.log` (written by the `posttooluse-logger` hook) and generates a markdown activity summary grouped by day, showing tool invocations and files touched. Accepts `--since <date>` and `--output <file>`.

## [0.2.5] - 2026-06-05

### Added
- **`pretooluse-guardian` hook** — adapted from [github/awesome-copilot tool-guardian](https://github.com/github/awesome-copilot/tree/main/hooks/tool-guardian). Fires on the `Bash` tool and blocks destructive operations before Claude executes them: recursive deletes (`rm -rf /`, `~`, `.`), force-pushes to protected branches, database drops/truncates, world-writable permissions, and piping remote content to a shell. Configurable via `SKIP_TOOL_GUARDIAN` and `TOOL_GUARDIAN_ALLOWLIST`.
- **`posttooluse-licenses` hook** — adapted from [github/awesome-copilot dependency-license-checker](https://github.com/github/awesome-copilot/tree/main/hooks/dependency-license-checker). After Claude writes `package.json`, detects newly added npm packages that carry a restrictive license (GPL, AGPL, LGPL, SSPL, etc.) and warns. Always exits 0 — license decisions are business calls. Configurable via `SKIP_LICENSE_CHECK` and `LICENSE_ALLOWLIST`.
- **`posttooluse-logger` hook** — adapted from [github/awesome-copilot session-logger](https://github.com/github/awesome-copilot/tree/main/hooks/session-logger). Appends a JSON record (`{timestamp, tool, file, cwd}`) to `logs/devrails/session.log` for every file-editing tool use, giving an audit trail of what the agent changed in a session. Configurable via `SKIP_LOGGING` and `DEVRAILS_LOG_DIR`.
- **Expanded secret patterns in `block-secrets`** — adapted from [github/awesome-copilot secrets-scanner](https://github.com/github/awesome-copilot/tree/main/hooks/secrets-scanner). Added detection for: GCP service account keys, Azure storage connection strings/account keys, Stripe live keys, Slack tokens, Twilio API key SIDs, SendGrid API keys, GitHub fine-grained PATs, hardcoded JWT tokens, and database connection strings with embedded credentials.

### Not ported (no Claude Code equivalent)
- **Session Auto-Commit** — requires a `sessionEnd` lifecycle event that Claude Code does not expose.
- **Session Logger (session lifecycle)** / **Governance Audit** — require `sessionStart`, `sessionEnd`, and `userPromptSubmitted` events not available in Claude Code hooks. The threat-detection aspect of Governance Audit is covered by `pretooluse-guardian`.

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
