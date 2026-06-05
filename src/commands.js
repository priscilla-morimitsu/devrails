"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  ALL_TARGETS,
  loadRules,
  loadConfig,
  copyDir,
  ensureDir,
  writeFile,
  detectTools,
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

module.exports = { init, sync, check };
