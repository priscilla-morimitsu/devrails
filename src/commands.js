"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const {
  ALL_TARGETS,
  loadRules,
  loadConfig,
  copyDir,
  ensureDir,
  writeFile,
  detectTools,
  walkProjectFiles,
} = require("./lib.js");
const { WRITERS } = require("./targets.js");

const SCAFFOLD = path.join(__dirname, "scaffold");

// ---- sync --------------------------------------------------------------------
function sync(cwd) {
  const devrailsDir = path.join(cwd, ".devrails");
  if (!fs.existsSync(devrailsDir)) {
    console.error("devrails: no .devrails/ found. Run `devrails init` first.");
    process.exit(1);
  }
  const config = loadConfig(devrailsDir) || { targets: ALL_TARGETS };
  const rules = loadRules(devrailsDir);
  if (rules.length === 0) {
    console.error("devrails: no rules found in .devrails/rules/. Nothing to sync.");
    process.exit(1);
  }

  let total = 0;
  for (const target of config.targets) {
    const writer = WRITERS[target];
    if (!writer) {
      console.error(`devrails: unknown target "${target}" (skipped).`);
      continue;
    }
    const written = writer(rules, cwd);
    total += written.length;
    console.log(`  ${target.padEnd(8)} → ${written.length} file(s)`);
  }
  console.log(`devrails: synced ${rules.length} rule(s) to ${config.targets.length} target(s), ${total} file(s) written.`);
}

// ---- check (enforcement, tool-agnostic via git/CI) ---------------------------
function listStagedFiles(cwd) {
  try {
    const out = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM"], {
      cwd,
      encoding: "utf8",
    });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function check(cwd, opts) {
  const devrailsDir = path.join(cwd, ".devrails");
  const guardrailsDir = path.join(devrailsDir, "guardrails");
  if (!fs.existsSync(guardrailsDir)) {
    console.error("devrails: no .devrails/guardrails/ found. Run `devrails init` first.");
    process.exit(1);
  }

  let files = opts.files;
  if ((!files || files.length === 0) && opts.staged) files = listStagedFiles(cwd);
  if (!files || files.length === 0) {
    console.log("devrails check: no files to check.");
    return;
  }

  const scripts = fs
    .readdirSync(guardrailsDir)
    .filter((f) => f.endsWith(".sh"))
    .sort()
    .map((f) => path.join(guardrailsDir, f));

  let failed = false;
  for (const script of scripts) {
    try {
      execFileSync("bash", [script, ...files], { cwd, stdio: "inherit" });
    } catch {
      failed = true;
    }
  }
  if (failed) {
    console.error("devrails check: FAILED — fix the issues above before committing.");
    process.exit(1);
  }
  console.log("devrails check: passed.");
}

// ---- init --------------------------------------------------------------------
function installGitHook(cwd) {
  const gitDir = path.join(cwd, ".git");
  if (!fs.existsSync(gitDir)) {
    console.log("  (no .git/ — skipped git hook; run `git init` then `devrails init` again)");
    return;
  }
  const hookPath = path.join(gitDir, "hooks", "pre-commit");
  ensureDir(path.dirname(hookPath));
  const hook = `#!/usr/bin/env bash
# Installed by devrails — runs guard-rails on staged files before commit.
npx --no-install devrails check --staged || exit 1
`;
  fs.writeFileSync(hookPath, hook);
  fs.chmodSync(hookPath, 0o755);
  console.log("  git pre-commit hook installed (.git/hooks/pre-commit)");
}

function writeCiWorkflow(cwd) {
  const file = path.join(cwd, ".github", "workflows", "devrails.yml");
  const wf = `# Installed by devrails — runs guard-rails in CI.
name: devrails
on: [pull_request]
jobs:
  guard-rails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Run devrails check on changed files
        run: |
          BASE="\${{ github.event.pull_request.base.sha }}"
          FILES=$(git diff --name-only --diff-filter=ACM "$BASE"...HEAD)
          [ -z "$FILES" ] && echo "No files changed" && exit 0
          npx devrails check $FILES
`;
  writeFile(file, wf);
  console.log("  CI workflow written (.github/workflows/devrails.yml)");
}

function init(cwd, opts) {
  const devrailsDir = path.join(cwd, ".devrails");

  // 1. Scaffold the source of truth.
  if (fs.existsSync(devrailsDir) && !opts.force) {
    console.log("  .devrails/ already exists (use --force to overwrite source files)");
  } else {
    copyDir(path.join(SCAFFOLD, ".devrails"), devrailsDir);
    // ensure guardrail scripts are executable
    const gdir = path.join(devrailsDir, "guardrails");
    if (fs.existsSync(gdir)) {
      for (const f of fs.readdirSync(gdir)) {
        if (f.endsWith(".sh")) fs.chmodSync(path.join(gdir, f), 0o755);
      }
    }
    console.log("  .devrails/ source created");
  }

  // 2. Decide targets: --tools flag > detected > all.
  let targets = opts.tools;
  if (!targets || targets.length === 0) {
    const detected = detectTools(cwd);
    targets = detected.length ? detected : ALL_TARGETS.slice();
    console.log(`  targets: ${targets.join(", ")} ${detected.length ? "(detected)" : "(default: all)"}`);
  } else {
    console.log(`  targets: ${targets.join(", ")} (from --tools)`);
  }

  // 3. Persist config.
  writeFile(
    path.join(devrailsDir, "config.json"),
    JSON.stringify({ targets, note: "Edit rules in .devrails/rules/ then run `devrails sync`." }, null, 2)
  );

  // 4. Enforcement layer (tool-agnostic): git hook + CI.
  if (!opts.noGitHook) installGitHook(cwd);
  if (!opts.noCi) writeCiWorkflow(cwd);

  // 5. First sync.
  console.log("");
  sync(cwd);
  console.log("\ndevrails: init complete. Edit .devrails/rules/ and re-run `devrails sync` anytime.");
}

// ---- audit -------------------------------------------------------------------
// Scans the whole project (not just staged files) against every guardrail
// script and reports findings grouped by guardrail. Returns true if clean.
function audit(cwd, opts) {
  const devrailsDir = path.join(cwd, ".devrails");
  const guardrailsDir = path.join(devrailsDir, "guardrails");
  if (!fs.existsSync(guardrailsDir)) {
    console.error("devrails: no .devrails/guardrails/ found. Run `devrails init` first.");
    process.exit(1);
  }

  const scanRoot = opts.path ? path.resolve(cwd, opts.path) : cwd;
  const files = walkProjectFiles(scanRoot);

  if (files.length === 0) {
    console.log("devrails audit: no source files found to scan.");
    return true;
  }

  console.log(`devrails audit — scanning ${files.length} file(s)\n`);

  const scripts = fs
    .readdirSync(guardrailsDir)
    .filter((f) => f.endsWith(".sh"))
    .sort();

  let totalViolations = 0;
  let failedGuardrails = 0;
  const COL = 28;

  for (const scriptName of scripts) {
    const script = path.join(guardrailsDir, scriptName);
    const label = scriptName.replace(/\.sh$/, "");
    const result = spawnSync("bash", [script, ...files], { cwd, encoding: "utf8" });

    // Violation lines from our scripts always start with "  [label] ..."
    // Summary lines (e.g. "block-secrets: N issue(s)") are excluded from display.
    const violationLines = (result.stderr || "")
      .split("\n")
      .filter((l) => /^\s+\[/.test(l))
      .map((l) => l.replace(/^\s+\[[^\]]+\]\s*/, "").trim());

    if (result.status === 0 || violationLines.length === 0) {
      console.log(`  ${label.padEnd(COL)} \x1b[32mpassed\x1b[0m`);
    } else {
      failedGuardrails++;
      totalViolations += violationLines.length;
      console.log(`  ${label.padEnd(COL)} \x1b[31m${violationLines.length} violation(s)\x1b[0m`);
      for (const line of violationLines) {
        console.log(`    ${line}`);
      }
    }
  }

  console.log("");
  if (failedGuardrails === 0) {
    console.log(`\x1b[32mdevrails audit: clean\x1b[0m — all guardrails passed (${files.length} file(s) scanned).`);
    return true;
  }

  console.log(
    `\x1b[31mdevrails audit: ${failedGuardrails} guardrail(s) failed\x1b[0m — ` +
    `${totalViolations} violation(s) in ${files.length} file(s).`
  );
  return false;
}

// ---- report ------------------------------------------------------------------
// Reads logs/devrails/session.log and generates a markdown activity summary.
function report(cwd, opts) {
  const logFile = opts.logFile || path.join(cwd, "logs", "devrails", "session.log");
  if (!fs.existsSync(logFile)) {
    console.error(`devrails report: no log file found at ${path.relative(cwd, logFile)}`);
    console.error("  Run a Claude Code session first (the posttooluse-logger.sh hook writes logs automatically).");
    process.exit(1);
  }

  const raw = fs.readFileSync(logFile, "utf8").trim();
  if (!raw) {
    console.log("devrails report: log is empty.");
    return;
  }

  const entries = raw
    .split("\n")
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);

  if (entries.length === 0) {
    console.log("devrails report: no parseable entries in log.");
    return;
  }

  // Filter by --since (ISO date prefix, e.g. "2024-06-01")
  const since = opts.since ? new Date(opts.since) : null;
  const filtered = since ? entries.filter((e) => e.timestamp && new Date(e.timestamp) >= since) : entries;

  if (filtered.length === 0) {
    console.log(`devrails report: no entries since ${opts.since}.`);
    return;
  }

  // Group by session date (YYYY-MM-DD) then by tool
  const byDate = {};
  for (const e of filtered) {
    const day = (e.timestamp || "unknown").slice(0, 10);
    if (!byDate[day]) byDate[day] = [];
    byDate[day].push(e);
  }

  const lines = ["# devrails session report", ""];
  for (const day of Object.keys(byDate).sort()) {
    lines.push(`## ${day}`);
    lines.push("");
    const toolCounts = {};
    const filesChanged = new Set();
    for (const e of byDate[day]) {
      toolCounts[e.tool] = (toolCounts[e.tool] || 0) + 1;
      if (e.file) filesChanged.add(e.file);
    }
    lines.push(`**${byDate[day].length} tool invocations** across ${filesChanged.size} file(s)`);
    lines.push("");
    lines.push("| Tool | Count |");
    lines.push("|------|-------|");
    for (const [tool, count] of Object.entries(toolCounts).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${tool} | ${count} |`);
    }
    lines.push("");
    if (filesChanged.size > 0) {
      lines.push("**Files touched:**");
      for (const f of [...filesChanged].sort()) {
        lines.push(`- ${f}`);
      }
      lines.push("");
    }
  }

  const md = lines.join("\n");

  if (opts.output) {
    fs.writeFileSync(path.resolve(cwd, opts.output), md);
    console.log(`devrails report: written to ${opts.output}`);
  } else {
    console.log(md);
  }
}

module.exports = { init, sync, check, audit, report };
