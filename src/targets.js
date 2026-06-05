"use strict";

const fs = require("fs");
const path = require("path");
const { GENERATED_BANNER, writeFile, slugify, ensureDir, copyDir } = require("./lib.js");

const CLAUDE_ASSETS = path.join(__dirname, "scaffold", "claude-assets");

// ---- Flat markdown formats (AGENTS.md, CLAUDE.md, GEMINI.md) ------------------
// These formats cannot scope rules by file glob, so globs are recorded as a
// human-readable "Applies to" note and the rule body is included inline.
function renderFlat(rules, heading) {
  const parts = [GENERATED_BANNER, "", `# ${heading}`, ""];
  parts.push(
    "These are the project's guard-rails for AI-assisted development. Follow them on every change.",
    ""
  );
  for (const r of rules) {
    parts.push(`## ${r.title}`);
    if (r.description) parts.push(`_${r.description}_`);
    if (r.globs.length) parts.push(`\nApplies to: \`${r.globs.join("`, `")}\``);
    parts.push("", r.body, "");
  }
  return parts.join("\n");
}

function writeAgentsMd(rules, cwd) {
  return [writeFile(path.join(cwd, "AGENTS.md"), renderFlat(rules, "Project guard-rails (AGENTS.md)"))];
}

// ---- Claude Code (rich target) -----------------------------------------------
// Beyond CLAUDE.md, Claude Code supports skills, subagents, slash commands, and
// native hooks. This target recovers all of them:
//   - global rules        -> CLAUDE.md (always-on memory)
//   - glob-scoped rules    -> .claude/skills/<slug>/SKILL.md (auto-invoked)
//   - subagents & commands -> copied from the bundled claude-assets
//   - hooks                -> adapter scripts + merged .claude/settings.json
function copyExecutable(srcDir, destDir) {
  const written = [];
  if (!fs.existsSync(srcDir)) return written;
  ensureDir(destDir);
  for (const name of fs.readdirSync(srcDir)) {
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    fs.copyFileSync(src, dest);
    if (name.endsWith(".sh")) fs.chmodSync(dest, 0o755);
    written.push(dest);
  }
  return written;
}

function mergeSettingsHooks(cwd) {
  const file = path.join(cwd, ".claude", "settings.json");
  let settings = {};
  if (fs.existsSync(file)) {
    try {
      settings = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      settings = {};
    }
  }
  const cmd = (script) => `"$CLAUDE_PROJECT_DIR/.claude/hooks/${script}"`;
  settings.hooks = Object.assign({}, settings.hooks, {
    PreToolUse: [
      // Secrets: block writes that hardcode credentials or expose them to the client
      { matcher: "Write|Edit|MultiEdit", hooks: [{ type: "command", command: cmd("pretooluse-secrets.sh") }] },
      // Guardian: block dangerous Bash operations (rm -rf, force-push, DROP TABLE, etc.)
      { matcher: "Bash", hooks: [{ type: "command", command: cmd("pretooluse-guardian.sh") }] },
    ],
    PostToolUse: [
      // Quality gate: run typecheck + lint after edits
      { matcher: "Write|Edit|MultiEdit", hooks: [{ type: "command", command: cmd("posttooluse-quality.sh") }] },
      // License checker: warn when new npm packages carry a restrictive license
      { matcher: "Write|Edit|MultiEdit", hooks: [{ type: "command", command: cmd("posttooluse-licenses.sh") }] },
      // Session logger: append a JSON record for every file edit (audit trail)
      { matcher: "Write|Edit|MultiEdit", hooks: [{ type: "command", command: cmd("posttooluse-logger.sh") }] },
    ],
  });
  return writeFile(file, JSON.stringify(settings, null, 2));
}

function writeClaude(rules, cwd) {
  const written = [];
  const global = rules.filter((r) => r.alwaysApply || r.globs.length === 0);
  const scoped = rules.filter((r) => !r.alwaysApply && r.globs.length > 0);

  // CLAUDE.md — always-on global rules.
  const md = [GENERATED_BANNER, "", "# Project guard-rails", "",
    "Always-on conventions for this project. Scoped conventions (e.g. Next.js, accessibility) are provided as skills under `.claude/skills/` and applied automatically when relevant.", ""];
  for (const r of global) {
    md.push(`## ${r.title}`);
    if (r.description) md.push(`_${r.description}_`, "");
    md.push(r.body, "");
  }
  written.push(writeFile(path.join(cwd, "CLAUDE.md"), md.join("\n")));

  // Skills — one per glob-scoped rule.
  for (const r of scoped) {
    const applies = r.globs.length ? ` Apply to files matching: ${r.globs.join(", ")}.` : "";
    const fm = ["---", `name: ${r.slug}`, `description: ${r.description || r.title}.${applies}`, "---"].join("\n");
    const file = path.join(cwd, ".claude", "skills", r.slug, "SKILL.md");
    written.push(writeFile(file, `${fm}\n\n# ${r.title}\n\n${r.body}\n`));
  }

  // Subagents and slash commands — copied from bundled assets.
  written.push(...copyExecutable(path.join(CLAUDE_ASSETS, "agents"), path.join(cwd, ".claude", "agents")));
  written.push(...copyExecutable(path.join(CLAUDE_ASSETS, "commands"), path.join(cwd, ".claude", "commands")));

  // Native hooks — adapter scripts + merged settings.
  written.push(...copyExecutable(path.join(CLAUDE_ASSETS, "hooks"), path.join(cwd, ".claude", "hooks")));
  written.push(mergeSettingsHooks(cwd));

  return written;
}

function writeGemini(rules, cwd) {
  return [writeFile(path.join(cwd, "GEMINI.md"), renderFlat(rules, "Project guard-rails"))];
}

// ---- Cursor (.cursor/rules/*.mdc) --------------------------------------------
// One file per rule, with frontmatter: description, globs (comma-separated),
// alwaysApply. This is Cursor's native, glob-scoped format.
function writeCursor(rules, cwd) {
  const written = [];
  for (const r of rules) {
    const fm = [
      "---",
      `description: ${r.description || r.title}`,
      `globs: ${r.globs.join(", ")}`,
      `alwaysApply: ${r.alwaysApply ? "true" : "false"}`,
      "---",
    ].join("\n");
    const file = path.join(cwd, ".cursor", "rules", `${r.slug}.mdc`);
    written.push(writeFile(file, `${fm}\n\n${GENERATED_BANNER}\n\n# ${r.title}\n\n${r.body}\n`));
  }
  return written;
}

// ---- GitHub Copilot ----------------------------------------------------------
// Global rules go into .github/copilot-instructions.md.
// Glob-scoped rules become .github/instructions/<slug>.instructions.md with an
// `applyTo` frontmatter (supported since July 2025).
function writeCopilot(rules, cwd) {
  const written = [];
  const global = rules.filter((r) => r.alwaysApply || r.globs.length === 0);
  const scoped = rules.filter((r) => !r.alwaysApply && r.globs.length > 0);

  const main = [GENERATED_BANNER, "", "# Copilot instructions", "",
    "Project guard-rails for AI-assisted development.", ""];
  for (const r of global) {
    main.push(`## ${r.title}`);
    if (r.description) main.push(`_${r.description}_`, "");
    main.push(r.body, "");
  }
  written.push(writeFile(path.join(cwd, ".github", "copilot-instructions.md"), main.join("\n")));

  for (const r of scoped) {
    const fm = ["---", `applyTo: "${r.globs.join(",")}"`, "---"].join("\n");
    const file = path.join(cwd, ".github", "instructions", `${r.slug}.instructions.md`);
    written.push(writeFile(file, `${fm}\n\n${GENERATED_BANNER}\n\n# ${r.title}\n\n${r.body}\n`));
  }
  return written;
}

const WRITERS = {
  agents: writeAgentsMd,
  claude: writeClaude,
  gemini: writeGemini,
  cursor: writeCursor,
  copilot: writeCopilot,
};

module.exports = { WRITERS };
