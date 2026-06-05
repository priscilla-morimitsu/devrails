# Project context & decision log

> A summary of the reasoning behind devrails, written so a fresh session (human or AI) can pick up the project with the *why*, not just the *what*. Code lives in the repo; this file captures the decisions that produced it.

## What devrails is

A **tool-agnostic CLI** that standardizes guard-rails for AI-assisted development. You write your rules (code standards, quality, accessibility, security) **once** in `.devrails/`, and `devrails sync` projects them into the native format of each AI coding tool. Deterministic enforcement runs through git hooks + CI so it works regardless of which tool produced the code.

- Author: Priscilla Morimitsu — License: MIT
- npm package name: `devrails` (fallback `devrails-ai` if taken — reconfirm with `npm view devrails` before publishing).

## Key decisions and the reasoning

### Name
Chose `devrails`: reads instantly as "dev + rails / guard-rails for development", is model- and tool-agnostic (no brand lock-in), short and memorable. Verified available on npm at the time. Mild echo of "Ruby on Rails" deemed acceptable given the AI/guard-rails context.

### Scope: tool-agnostic, not just Claude Code
The project started (v0.1.0) as a Claude Code plugin, then pivoted to a tool-agnostic CLI (v0.2.x) because the user works across Cursor, Copilot, Gemini, and Claude Code. The crucial insight: **publishing to npm does not make something tool-agnostic** — npm is just delivery; what matters is the *format of the files inside*. Each tool has its own rules format, so the plugin format alone only works in Claude Code.

### Architecture: one source, many targets
`.devrails/` is the single source of truth (you edit only here):
- `rules/*.md` — rules with frontmatter (`title`, `description`, `globs`, `alwaysApply`).
- `guardrails/*.sh` — deterministic checks run by `devrails check`.
- `templates/` — PRD, spec, ADR.

`devrails sync` generates per-tool outputs (treated as generated, not hand-edited — they carry a banner):
- `agents` → `AGENTS.md` (open standard; also read by Cursor/Copilot/Gemini CLI)
- `claude` → rich target (see below)
- `cursor` → `.cursor/rules/*.mdc` (glob-scoped, frontmatter)
- `copilot` → `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md`
- `gemini` → `GEMINI.md`

Rules with `globs` are file-scoped where the tool supports it; flat formats (AGENTS/CLAUDE/GEMINI) include all rules with an "Applies to" note since markdown can't scope by file.

### The two layers of guard-rails
- **Soft layer** (rules/context): portable across all tools — synced.
- **Hard layer** (enforcement): NOT portable, because only some tools have native hooks. Solution: move deterministic enforcement to the **universal** layer — git pre-commit hook + CI — via `devrails check`. The same secret-scan blocks a leak whether it came from any tool or a human.

### Rich Claude Code target (v0.2.1)
Because Claude Code uniquely supports skills, subagents, commands, and native hooks, the `claude` target generates the full set instead of only `CLAUDE.md`:
- global rules → `CLAUDE.md`; glob-scoped rules → `.claude/skills/<slug>/SKILL.md`
- subagents → `.claude/agents/` (code-reviewer, security-auditor, accessibility-auditor, test-writer; reviewers are read-only via `disallowedTools`)
- commands → `.claude/commands/` (`/review`, `/new-feature`)
- hooks → `.claude/hooks/` adapter scripts + **safely merged** `.claude/settings.json` (existing settings preserved). The adapters call the same shared `.devrails/guardrails/` scripts, so secret logic is defined once.

### Default content
Ships a Next.js fullstack baseline: App Router patterns, code standards, accessibility (WCAG 2.2 AA), security. Meant to be edited per project.

## Publishing notes
- Requires npm 2FA. Use `npm publish --otp=<code>`, or a granular access token with "bypass 2FA" for CI.
- Reconfirm the package name is free immediately before publishing.
- Zero runtime dependencies; Node ≥ 18. Guard-rail scripts are bash (WSL/Git Bash on Windows).

## Validated
- Smoke test (`npm test`) covers init + sync + the rich Claude target and is green.
- `devrails check` proven to block hardcoded secrets and `NEXT_PUBLIC_*` leaks (exit 1 → aborts commit).
- `settings.json` merge proven to preserve existing keys.
- NOT validated in a live Claude Code runtime (no Claude Code in the build env): hook *execution* behavior should be confirmed with `claude plugin validate` / a real run.

## Roadmap / next steps discussed
- `devrails doctor` — per-tool report of what each tool gains and what it can't support (e.g. only Claude Code gets native agents/hooks).
- Interactive, **stack-aware** `init` — ask front/back/infra + technologies and sync only the relevant module subset. Recommended build order: module schema + dependency resolver first (data-modeling problem), interactive prompt last. Auto-detect stack from `package.json`/`go.mod`/etc. to pre-fill answers.
