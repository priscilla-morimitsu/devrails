# /discover [-f]

Detecta o stack do projeto e busca recursos externos complementares ao devrails.

## Execução — 3 passos, mínimo de tokens

### 1. Extração (1 comando bash)

```bash
node -e "
const p=require('./package.json');
const deps={...p.dependencies,...p.devDependencies};
const keys=Object.keys(deps).join(',');
console.log(JSON.stringify({name:p.name,scripts:Object.keys(p.scripts||{}),deps:keys}));
" 2>/dev/null; ls .devrails/rules/ 2>/dev/null; ls .claude/agents/ 2>/dev/null; ls .claude/hooks/ 2>/dev/null
```

Com o output desse único comando, derive internamente (sem ler mais arquivos):
- Framework: next → Next.js App Router; express/fastify → API server; etc.
- Data layer: prisma/drizzle/mongoose/pg/kysely
- Auth: next-auth/clerk/@clerk//@auth/
- Testes: vitest/jest/playwright/cypress
- AI: openai/anthropic/@anthropic-ai/ai (Vercel AI SDK)
- Regras já ativas: listagem de `.devrails/rules/`
- Agents/hooks já instalados: listagem de `.claude/agents/` e `.claude/hooks/`

### 1b. Catálogo nativo do devrails (nunca recomendar estes)

O devrails já oferece os itens abaixo. Exclua-os das recomendações mesmo que não estejam instalados no projeto — basta sugerir `npx devrails init` se a pasta `.devrails/` não existir.

**Regras**: security, code-standards, nextjs, accessibility, database

**Agents**: code-reviewer, security-auditor, accessibility-auditor, test-writer, architect, tech-writer, tdd-red, tdd-green, tdd-refactor, database-reviewer, acquire-codebase, agent-owasp, ai-team, prompt-safety, autoresearch

**Comandos**: review, new-feature, tdd, context-map, refactor-plan, discover, spec-driven, breakdown, llms-txt, git-release

**Hooks**: pretooluse-secrets, pretooluse-guardian, posttooluse-quality, posttooluse-licenses, posttooluse-logger

### 2. Busca externa (paralela, 2 fontes apenas)

Execute as duas buscas **em paralelo**:

**Busca A** — fetch do índice do awesome-copilot (raw, não renderizado):
`https://raw.githubusercontent.com/github/awesome-copilot/main/README.md`

**Busca B** — uma única query de busca consolidando stack + gaps:
`<framework> <data-layer> AGENTS.md OR ".claude/agents" OR cursorrules site:github.com`

Não faça mais de 2 buscas externas. Se uma falhar, continue com a outra.

### 3. Output — compacto, sem seções vazias

Omita qualquer categoria onde não há nada novo para recomendar. Máximo 5 itens por categoria. Formato:

```
## /discover — <project name>
Stack: <framework> · <data layer> · <auth> · <testes> · <AI se houver>
Já instalado: <n> regras, <n> agents, <n> hooks

### Regras a adicionar
- **<nome>** — <motivo em 1 linha> → `cp <origem> .devrails/rules/`

### Agents a adicionar
- **<nome>** (<fonte>) — <motivo> → `cp <arquivo> .claude/agents/`

### Hooks a adicionar
- **<nome>** (<fonte>) — <motivo> → `cp <arquivo> .claude/hooks/` + wired em settings.json

### Ferramentas externas
- **<pacote>** — <motivo> → `npm i -D <pacote>`

### Quick wins (por impacto)
1. ...
2. ...
3. ...
```

## Modo deep: /discover -f

Remove os limites de tokens e de buscas. Use quando quiser uma varredura completa.

Execute até 5 buscas externas em paralelo:
- **Busca A**: fetch awesome-copilot README (raw)
- **Busca B**: cursor.directory para o framework detectado
- **Busca C**: `<framework> AGENTS.md OR ".claude/agents" site:github.com`
- **Busca D**: npm — ferramentas de qualidade padrão do stack (linter, formatter, type checker)
- **Busca E**: docs oficiais do framework — seção de AI coding guides ou configuração de copilot

Sem cap de itens por categoria. Sem limite de tokens no output.

## Restrições
- Apenas recursos gratuitos e open source.
- **Nunca recomendar itens do catálogo nativo do devrails** (listados na seção 1b), mesmo que não instalados.
- Nunca recomendar algo já presente nas listagens extraídas no passo 1.
- Sem tabelas — bullets consomem menos tokens.
- Sem seções com "nenhum item encontrado" — omita a seção inteira.
- Sem a flag `-f`: output máximo de 1 000 tokens e no máximo 2 buscas externas.
