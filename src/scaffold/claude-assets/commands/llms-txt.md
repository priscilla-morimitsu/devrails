# /llms-txt

Generates an `llms.txt` file at the project root following the official [llms.txt specification](https://llmstxt.org/). Serves as the entry point for AI assistants to understand and navigate the repository.

## Usage

```
/llms-txt
```

## Phase 1: Review spec + scan repo (parallel)

Fetch the spec and scan the repo at the same time:

**Fetch:** `https://llmstxt.org/` — read to confirm current format requirements before writing.

**Bash scan:**
```bash
node -e "try{const p=require('./package.json');console.log(p.name,p.description,p.version);}catch{}" 2>/dev/null
find . -maxdepth 4 \( -name "README*" -o -name "CONTRIBUTING*" -o -name "CHANGELOG*" -o -name "LICENSE*" -o -name "*.md" \) -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*" -not -path "*/.git/*" | sort | head -60
ls docs/ spec/ examples/ 2>/dev/null
```

Read `README.md` (first 80 lines only). Do not read more files than necessary to write accurate descriptions.

## Phase 2: Plan content

Group discovered files into sections. Only include files that actually exist.

| Section | What belongs here |
|---------|------------------|
| **Documentation** | README, CONTRIBUTING, guides, architecture docs |
| **Specifications** | Technical specs, API contracts, data models |
| **Examples** | Sample code, usage demos, templates |
| **Configuration** | Setup guides, deployment, env configuration |
| **Optional** | Secondary files an LLM can skip for shorter context (ADRs, changelogs, design decisions) |

Omit sections with no relevant files.

## Phase 3: Write `llms.txt`

Exact format per the llms.txt spec:

```
# <Project Name>

> <One sentence: what the project is and what problem it solves>

<Optional: 1–3 sentences of additional context — tech stack, target users, key constraints>

## Documentation

- [<Descriptive name>](<relative-path>): <what an LLM gains from reading this>
- ...

## Specifications

- [<name>](<path>): <description>

## Examples

- [<name>](<path>): <description>

## Configuration

- [<name>](<path>): <description>

## Optional

- [<name>](<path>): <description>
```

## Validation checklist

Before writing the file, verify:
- [ ] H1 header with project name (required)
- [ ] Blockquote summary (recommended)
- [ ] All links are valid relative paths to files that exist
- [ ] No broken links, no invented files
- [ ] `Optional` section contains only truly secondary content
- [ ] File is concise — under 80 lines unless the repo genuinely requires more

## Rules
- Only reference files you confirmed exist in the scan output.
- Descriptions must say what an LLM *gains* from the file, not just what the file *is*.
- Overwrite any existing `llms.txt` — this command is idempotent.
- If the spec at llmstxt.org has changed since the agent's knowledge cutoff, follow the fetched version.
