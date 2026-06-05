# /discover

Maps the current project's stack and gaps, then searches external sources for tools, rules, agents, hooks, patterns, and libraries that would improve quality, safety, and developer experience — from every angle.

## Usage

```
/discover
```

No arguments needed. Works on any project.

---

## What this command does

### Phase 1 — Map the project

Read the following to understand what's already in place:

- `package.json` — runtime, framework, dependencies, scripts
- `.devrails/config.json` and `.devrails/rules/` — which guard-rails are active
- `.claude/agents/`, `.claude/commands/`, `.claude/hooks/` — which Claude Code extras are installed
- `README.md` / `CLAUDE.md` / `AGENTS.md` — documented conventions
- Spot-check key directories: `app/`, `src/`, `lib/`, `prisma/`, `drizzle/`, `test/`, `__tests__/`, `.github/`

From this, determine:
- **Primary language and runtime** (Node.js, Python, Rust, Go, …)
- **Framework** (Next.js App Router, Express, FastAPI, …)
- **Data layer** (Prisma, Drizzle, raw SQL, Supabase, …)
- **Auth** (NextAuth, Clerk, Auth.js, custom JWT, …)
- **Testing setup** (Jest, Vitest, Playwright, Cypress, …)
- **CI/CD** (GitHub Actions, Vercel, …)
- **AI/LLM integration** (OpenAI SDK, Vercel AI SDK, Anthropic, Langchain, …)
- **Gaps**: what's missing from the devrails rule set, hooks, and agents for this stack?

### Phase 2 — Search external sources

Search the following, in this order:

1. **`https://github.com/github/awesome-copilot`** — scan the README for hooks, instructions, and agents relevant to the detected stack. Fetch the raw README and index the entries.

2. **`https://cursor.directory`** — search for rules matching the detected framework and language.

3. **GitHub** — search `site:github.com "AGENTS.md" <framework>` and `site:github.com ".claude/agents" <framework>` for public examples of agent configurations for this stack.

4. **Official docs** for any framework or library in use that has an AI coding guide, a `.cursorrules` or `AGENTS.md` template, or a recommended Claude / Copilot configuration.

5. **npm / PyPI** — if the project is missing a common quality tool for its stack (linter, formatter, test runner, type checker), surface the canonical choice.

### Phase 3 — Build the recommendation report

Produce a structured report in the following sections. For each item: what it is, why it's relevant to **this specific project**, and a concrete next step (install command, URL, or devrails command to run).

---

## Output format

```markdown
# /discover — Resource Report for <project name>

**Stack detected:** <framework>, <language>, <data layer>, <auth>, <testing>, <CI>
**devrails rules active:** <list>
**Gaps identified:** <list>

---

## Guard-rail rules to add

Rules that should be in `.devrails/rules/` given this stack but aren't yet.

| Rule | Why | How to add |
|------|-----|------------|
| ... | ... | copy template or `devrails sync` after adding |

---

## Claude Code agents to add

Agents from awesome-copilot or other sources that fit this project.

| Agent | Source | Why | Install |
|-------|--------|-----|---------|
| ... | ... | ... | copy to `.claude/agents/` |

---

## Claude Code hooks to add

| Hook | Source | Trigger | Purpose | Install |
|------|--------|---------|---------|---------|
| ... | ... | ... | ... | copy to `.claude/hooks/` + wire in settings.json |

---

## External tools and libraries

Quality tools, linters, formatters, or testing utilities not yet in the project.

| Tool | Purpose | Install |
|------|---------|---------|
| ... | ... | `npm install --save-dev ...` |

---

## Learning resources

Docs, guides, or reference implementations directly relevant to this stack.

| Resource | Why relevant | URL |
|----------|-------------|-----|
| ... | ... | ... |

---

## Quick wins (do these first)

A prioritized list of 3–5 actions, ordered by impact:

1. ...
2. ...
3. ...
```

---

## Constraints

- Only recommend freely available resources (open source, free tier, public docs).
- If a source cannot be reached, note it and continue with what is available.
- Do not recommend tools that duplicate something already installed and working.
- Flag any resource that requires a paid plan or sign-up.
- Where devrails has a built-in solution (agent, hook, rule), prefer it over an external alternative.
