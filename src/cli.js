"use strict";

const { init, sync, check, audit, report } = require("./commands.js");

const VERSION = require("../package.json").version;

const HELP = `devrails ${VERSION} — tool-agnostic guard-rails for AI-assisted development

Usage:
  devrails init [options]     Scaffold .devrails/, pick targets, install enforcement, and sync
  devrails sync               Regenerate every target's files from .devrails/
  devrails audit [dir]        Scan the whole project and report every rule violation
  devrails check [files...]   Run guard-rails over specific files (used by git hook & CI)
  devrails report             Generate a markdown activity summary from session logs
  devrails help               Show this help

init options:
  --tools <list>    Comma-separated targets: agents,claude,cursor,copilot,gemini
  --force           Overwrite existing .devrails/ source files
  --no-git-hook     Do not install the git pre-commit hook
  --no-ci           Do not write the CI workflow

audit options:
  [dir]             Directory to scan (default: project root)

check options:
  --staged          Check files staged in git (default for the pre-commit hook)

report options:
  --since <date>    Only include entries on or after this date (e.g. 2024-06-01)
  --output <file>   Write report to a file instead of stdout

Targets:
  agents  -> AGENTS.md (open standard; also read by Cursor, Copilot, Gemini CLI)
  claude  -> CLAUDE.md
  cursor  -> .cursor/rules/*.mdc
  copilot -> .github/copilot-instructions.md (+ .github/instructions/*.instructions.md)
  gemini  -> GEMINI.md

Edit your rules once in .devrails/rules/, then \`devrails sync\` to every tool.`;

function parse(args) {
  const cmd = args[0];
  const opts = { files: [], tools: null, force: false, noGitHook: false, noCi: false, staged: false, since: null, output: null };
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === "--tools") opts.tools = (args[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--force") opts.force = true;
    else if (a === "--no-git-hook") opts.noGitHook = true;
    else if (a === "--no-ci") opts.noCi = true;
    else if (a === "--staged") opts.staged = true;
    else if (a === "--since") opts.since = args[++i] || null;
    else if (a === "--output") opts.output = args[++i] || null;
    else if (a.startsWith("--")) { /* ignore unknown flags */ }
    else opts.files.push(a);
  }
  return { cmd, opts };
}

function main(args) {
  const { cmd, opts } = parse(args);
  const cwd = process.cwd();

  switch (cmd) {
    case "init":
      console.log("devrails init\n");
      init(cwd, opts);
      break;
    case "sync":
      console.log("devrails sync\n");
      sync(cwd);
      break;
    case "audit": {
      const auditOpts = { path: opts.files[0] || null };
      const ok = audit(cwd, auditOpts);
      if (!ok) process.exit(1);
      break;
    }
    case "check":
      check(cwd, opts);
      break;
    case "report": {
      const reportOpts = {
        since: opts.since || null,
        output: opts.output || null,
        logFile: opts.files[0] || null,
      };
      report(cwd, reportOpts);
      break;
    }
    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      break;
    case "--version":
    case "-v":
      console.log(VERSION);
      break;
    default:
      console.error(`devrails: unknown command "${cmd}". Run \`devrails help\`.`);
      process.exit(1);
  }
}

module.exports = { main };
