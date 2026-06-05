"use strict";

const { init, sync, check } = require("./commands.js");

const VERSION = require("../package.json").version;

const HELP = `devrails ${VERSION} — tool-agnostic guard-rails for AI-assisted development

Usage:
  devrails init [options]     Scaffold .devrails/, pick targets, install enforcement, and sync
  devrails sync               Regenerate every target's files from .devrails/
  devrails check [files...]   Run guard-rails over files (used by git hook & CI)
  devrails help               Show this help

init options:
  --tools <list>    Comma-separated targets: agents,claude,cursor,copilot,gemini
  --force           Overwrite existing .devrails/ source files
  --no-git-hook     Do not install the git pre-commit hook
  --no-ci           Do not write the CI workflow

check options:
  --staged          Check files staged in git (default for the pre-commit hook)

Targets:
  agents  → AGENTS.md (open standard; also read by Cursor, Copilot, Gemini CLI)
  claude  → CLAUDE.md
  cursor  → .cursor/rules/*.mdc
  copilot → .github/copilot-instructions.md (+ .github/instructions/*.instructions.md)
  gemini  → GEMINI.md

Edit your rules once in .devrails/rules/, then \`devrails sync\` to every tool.`;

function parse(args) {
  const cmd = args[0];
  const opts = { files: [], tools: null, force: false, noGitHook: false, noCi: false, staged: false };
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === "--tools") opts.tools = (args[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--force") opts.force = true;
    else if (a === "--no-git-hook") opts.noGitHook = true;
    else if (a === "--no-ci") opts.noCi = true;
    else if (a === "--staged") opts.staged = true;
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
    case "check":
      check(cwd, opts);
      break;
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
