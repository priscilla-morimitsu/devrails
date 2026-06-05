# /llms-txt

Generates an `llms.txt` file at the project root — a standard context file that tells AI assistants what this project is, how it works, and which files matter most.

## Usage

```
/llms-txt
```

## What this command does

1. Run one bash command to extract the essentials:
```bash
node -e "try{const p=require('./package.json');console.log(p.name,p.description,p.version);}catch{}" 2>/dev/null; ls; find . -maxdepth 2 -name "README*" -o -name "CLAUDE.md" -o -name "AGENTS.md" 2>/dev/null | grep -v node_modules | head -10
```

2. Read `README.md` (or `CLAUDE.md` / `AGENTS.md` if no README) — first 100 lines only.

3. Write `llms.txt` to the project root.

## Output format (`llms.txt`)

```
# <project name>

> <one-line description of what the project does>

<2–4 sentence summary: what it is, who uses it, what problem it solves>

## Key files

- <path>: <what it does>
- <path>: <what it does>
...

## Architecture

<3–6 bullet points covering the main components and how they connect>

## How to run

<the 2–4 commands needed to install, run, and test>

## What to read first

<ordered list of 3–5 files an AI assistant should read to understand the codebase>
```

## Rules
- Keep the file under 80 lines total — it's context, not documentation.
- File paths must be real (verifiable from the scan output).
- No invented claims. If something is unclear, omit it.
- Overwrite any existing `llms.txt` — this command is idempotent.
