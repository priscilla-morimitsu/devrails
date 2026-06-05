# devrails

**Tool-agnostic guard-rails for AI-assisted development.** Write your code standards, quality, accessibility, and security rules **once**, in `.devrails/`, and devrails syncs them to every AI coding tool's native format — Claude Code, Cursor, GitHub Copilot, Gemini, and the open AGENTS.md standard. Deterministic enforcement (secret scanning, quality gates) runs through git hooks and CI, so it works no matter which tool wrote the code.

```bash
npx devrails init
```

## Why

Every AI tool invented its own rules format. Cursor uses `.cursor/rules/*.mdc`, Claude Code uses `CLAUDE.md`, Copilot uses `.github/copilot-instructions.md`, Gemini uses `GEMINI.md`. Keeping them in sync by hand is tedious and they drift apart. devrails gives you one source of truth and projects it everywhere.

And because rules are *soft* (the AI may ignore them), devrails adds a *hard* layer the tools can't bypass: a git pre-commit hook and a CI check that run deterministic guard-rails on your actual changes.

## Commands

```
devrails init [--tools a,b,c] [--force] [--no-git-hook] [--no-ci]
devrails sync
devrails audit [dir]
devrails check [files...] [--staged]
devrails report [--since YYYY-MM-DD] [--output file.md]
```

- **init** — scaffolds `.devrails/`, detects (or accepts via `--tools`) which tools to target, installs the git pre-commit hook and CI workflow, and runs the first sync.
- **sync** — regenerates every target's files from `.devrails/rules/`. Run it whenever you edit a rule.
- **audit** — scans the whole project against every guardrail and lists all violations. Useful after first install to see what's already broken.
- **check** — runs the guard-rail scripts over the given files (or `--staged` files). Exits non-zero on a violation. Used by the git hook and CI.
- **report** — reads `logs/devrails/session.log` (written by the logger hook) and generates a markdown summary of AI tool activity by day.

## Targets

| Target  | Output                                                                       |
| ------- | ---------------------------------------------------------------------------- |
| agents  | `AGENTS.md` (open standard; also read by Cursor, Copilot, Gemini CLI)        |
| claude  | `CLAUDE.md` + `.claude/` (agents, commands, hooks, skills, settings)         |
| cursor  | `.cursor/rules/*.mdc` (per-rule, with `globs` + `alwaysApply`)               |
| copilot | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` |
| gemini  | `GEMINI.md`                                                                  |

## The source of truth: `.devrails/`

```
.devrails/
├── config.json          # which targets to sync
├── rules/*.md           # your rules (edit these) — frontmatter: title, description, globs, alwaysApply
├── guardrails/*.sh      # deterministic checks run by `devrails check`
└── templates/           # PRD / spec / ADR templates
```

A rule is plain markdown with a little frontmatter:

```markdown
---
title: Accessibility (WCAG 2.2 AA)
description: Accessibility requirements for all user-facing UI
globs: [**/*.tsx, **/*.jsx]
alwaysApply: false
---
- Use semantic HTML ...
```

Rules with `globs` become file-scoped where the tool supports it (Cursor `.mdc`, Copilot `applyTo`). Rules with empty `globs` / `alwaysApply: true` apply globally. Flat formats (AGENTS.md, CLAUDE.md, GEMINI.md) include every rule and note the globs as an "Applies to" line.

The default rules ship a solid baseline for **any TypeScript project** and a richer set for **Next.js fullstack** (App Router patterns, accessibility). Edit them to fit your stack.

## Bundled Claude Code extras

When the `claude` target is active, `init` also copies a curated set of agents, slash commands, and hooks into `.claude/`.

### Agents (`.claude/agents/`)

| Agent | Purpose |
|-------|---------|
| `code-reviewer` | Code review across correctness, security, performance |
| `security-auditor` | Security-focused review: auth, injection, secrets, headers |
| `accessibility-auditor` | WCAG 2.2 AA compliance audit |
| `test-writer` | Writes unit and integration tests for existing code |
| `architect` | Architecture review; creates ADRs |
| `tech-writer` | READMEs, API docs, JSDoc, changelogs |
| `database-reviewer` | N+1, indexes, migration safety, SQL injection |
| `acquire-codebase` | Maps a codebase into 7 structured docs in `docs/codebase/` |
| `agent-owasp` | Checks AI agent code against OWASP ASI Top 10 |
| `ai-team` | Bootstraps a multi-agent dev team (Producer/Frontend/Backend/QA/DevOps) |
| `prompt-safety` | Reviews AI prompts for safety, bias, injection, and effectiveness |
| `tdd-red` | TDD red phase — writes failing tests before implementation |
| `tdd-green` | TDD green phase — minimum code to pass tests |
| `tdd-refactor` | TDD refactor phase — cleans up without changing behavior |

### Slash commands (`.claude/commands/`)

| Command | Purpose |
|---------|---------|
| `/review` | Run a full code review on the current diff |
| `/new-feature` | Scaffold a new feature following project conventions |
| `/tdd` | Orchestrate a full TDD cycle (red → green → refactor) |
| `/spec-driven` | 6-phase workflow: Analyze → Design → Implement → Validate → Reflect → Handoff |
| `/breakdown` | Decompose an epic into Features → Tasks (with effort) → Test cases |
| `/context-map` | Map callers and dependencies of a file before a change |
| `/refactor-plan` | Sequence a multi-file refactor into atomic, rollback-safe steps |
| `/git-release` | Bump SemVer, update CHANGELOG, draft GitHub Release body |
| `/llms-txt` | Generate `llms.txt` — context file for AI assistants (<80 lines) |
| `/discover [-f]` | Find external resources that complement what devrails already provides |

### Hooks (`.claude/hooks/`)

| Hook | Event | Purpose |
|------|-------|---------|
| `pretooluse-secrets` | PreToolUse (Write/Edit) | Blocks writes with hardcoded secrets before they land |
| `pretooluse-guardian` | PreToolUse (Bash) | Blocks destructive shell operations (rm -rf, force-push, DROP TABLE) |
| `posttooluse-quality` | PostToolUse (Write/Edit) | Runs typecheck + lint after every file write |
| `posttooluse-licenses` | PostToolUse (Write/Edit) | Warns when new packages carry a restrictive license (GPL/AGPL/…) |
| `posttooluse-logger` | PostToolUse (Write/Edit) | Appends `{timestamp, tool, file}` to `logs/devrails/session.log` |

## `/discover` — find what's missing

Running `/discover` inside a Claude Code session detects your stack and searches [awesome-copilot](https://github.com/github/awesome-copilot) and GitHub for agents, hooks, rules, and tools that complement devrails — without recommending anything devrails already provides.

```
/discover       # compact output, 2 parallel searches, ≤1 000 tokens
/discover -f    # full scan, 5 parallel searches, no token cap
```

## Enforcement is tool-agnostic by design

Only some tools support native enforcement hooks; git does not care which tool you use. So devrails wires enforcement at the git/CI layer: `init` installs a pre-commit hook that runs `devrails check --staged`, and a GitHub Actions workflow that runs `devrails check` on changed files in a PR. The same guard-rail blocks a leaked secret whether it came from Cursor, Copilot, Gemini, Claude Code, or a human.

## Requirements

- Node ≥ 18. Zero runtime dependencies.
- Guard-rail scripts are bash; they run on macOS/Linux and in CI. On Windows use WSL or Git Bash.

## License

MIT © 2026 Priscilla Morimitsu
