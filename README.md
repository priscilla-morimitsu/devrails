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
devrails check [files...] [--staged]
```

- **init** — scaffolds `.devrails/`, detects (or accepts via `--tools`) which tools to target, installs the git pre-commit hook and CI workflow, and runs the first sync.
- **sync** — regenerates every target's files from `.devrails/rules/`. Run it whenever you edit a rule.
- **check** — runs the guard-rail scripts in `.devrails/guardrails/` over the given files (or staged files). Exits non-zero on a violation. This is what the git hook and CI call.

## Targets

| Target  | Output                                                                  |
| ------- | ----------------------------------------------------------------------- |
| agents  | `AGENTS.md` (open standard; also read by Cursor, Copilot, Gemini CLI)   |
| claude  | `CLAUDE.md`                                                             |
| cursor  | `.cursor/rules/*.mdc` (per-rule, with `globs` + `alwaysApply`)          |
| copilot | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` |
| gemini  | `GEMINI.md`                                                             |

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

Rules with `globs` become file-scoped where the tool supports it (Cursor `.mdc`, Copilot `applyTo`). Rules with empty `globs` / `alwaysApply: true` apply globally. Flat formats (AGENTS.md, CLAUDE.md, GEMINI.md) include every rule and note the globs as an "Applies to" line, since markdown can't scope by file.

The default rules ship a solid baseline for a **Next.js fullstack** project (App Router patterns, code standards, accessibility, security) — edit them to fit your stack.

## Enforcement is tool-agnostic by design

Only some tools support native enforcement hooks; git does not care which tool you use. So devrails wires enforcement at the git/CI layer: `init` installs a pre-commit hook that runs `devrails check --staged`, and a GitHub Actions workflow that runs `devrails check` on changed files in a PR. The same guard-rail blocks a leaked secret whether it came from Cursor, Copilot, Gemini, Claude Code, or a human.

## Requirements

- Node ≥ 18. Zero runtime dependencies.
- Guard-rail scripts are bash; they run on macOS/Linux and in CI. On Windows use WSL or Git Bash.

## License

MIT © 2026 Priscilla Morimitsu
