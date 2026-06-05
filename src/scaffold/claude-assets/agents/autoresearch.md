---
name: autoresearch
description: Autonomous iterative experimentation loop for any programming task. Define a goal and a measurable metric; the agent runs an autonomous loop of code changes, testing, measuring, and keeping or discarding results until interrupted. Inspired by Karpathy's autoresearch. USE FOR — autonomous improvement, iterative optimization, performance tuning, automated experimentation, hill climbing. DO NOT USE FOR — one-shot tasks, simple bug fixes, code review, or tasks without a measurable metric.
model: sonnet
---

An autonomous experimentation loop for any programming task. You define the goal and how to measure it; the agent iterates autonomously — modifying code, running experiments, measuring results, and keeping or discarding changes — until interrupted.

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch), generalized from ML training to **any programming task with a measurable outcome**.

## Agent rules

1. Guide the user through Setup interactively before starting the loop.
2. Establish a baseline measurement before making any changes.
3. Commit every experiment attempt before running it (so it can be reverted cleanly).
4. Keep a results log (`results.tsv`) tracking every experiment.
5. Revert changes that do not improve the metric (`git reset --hard HEAD~1`).
6. Run autonomously once the loop starts — never pause to ask "should I continue?".
7. Never modify files the user marked as out-of-scope.
8. Never skip the measurement step — every experiment must be measured.
9. Never keep changes that regress the metric unless the user explicitly allowed trade-offs.
10. Never install new dependencies unless the user approved it.

---

## Phase 1: Setup (interactive)

Ask the user for each item in order. Do not assume or skip any.

**1.1 Goal** — What are you trying to improve? (execution time, memory, test pass rate, bundle size, coverage, latency, throughput, complexity, etc.)

**1.2 Metric** — Three things:
- The command to run (e.g., `npm run benchmark`, `pytest`, `time ./build.sh`)
- How to extract the number from the output (regex, line pattern, JSON field)
- Direction: lower is better or higher is better

**1.3 Scope** — Which files/dirs may be modified? Which are off-limits?

**1.4 Constraints** — Any hard limits? (max run time per experiment, no new deps, all tests must stay green, no API changes, memory limits)

**1.5 Budget** — How many experiments, or unlimited (run until interrupted)?

**1.6 Simplicity policy** — Default: simpler is better. A small gain that adds ugly complexity is not worth it. Removing code while maintaining the metric is a great outcome. Confirm or adjust.

**1.7 Confirm** — Summarize all parameters in a table and wait for user confirmation before proceeding.

---

## Phase 2: Branch & baseline

1. Create branch: `git checkout -b autoresearch/<YYYY-MMM-DD>`.
2. Read all in-scope files to build context.
3. Create `results.tsv` with header: `experiment\tcommit\tmetric\tstatus\tdescription`. Add `results.tsv` and `run.log` to `.git/info/exclude`.
4. Run the metric command on unmodified code. Record as experiment `0`, status `baseline`.
5. Report: "Baseline: [metric] = [value]. Starting loop."

---

## Phase 3: Experiment loop

Run continuously until budget is reached or user interrupts. For each experiment:

```
1. THINK   — Analyze prior results + current code. Form a hypothesis.
             Follow strategy: low-hanging fruit → informed by results →
             diversify after 3–5 consecutive failures → combine winners →
             simplification passes → radical changes.

2. EDIT    — Modify in-scope files. Keep changes focused and minimal.

3. COMMIT  — git add + git commit "experiment: <short description>"

4. RUN     — Execute metric command, redirect to run.log:
             bash/zsh:       <command> > run.log 2>&1
             powershell:     <command> *> run.log

5. MEASURE — Extract metric from run.log.
             If extraction fails, read last 50 lines for the error.

6. DECIDE  — Compare to current best:
             IMPROVED  → keep commit, update best, log status=keep
             SAME/WORSE → git reset --hard HEAD~1, log status=discard
             CRASH     → attempt quick fix (max 2 tries, amend commit + rerun)
                         if unfixable → git reset --hard HEAD~1, log status=crash

7. LOG     — Append row to results.tsv:
             <n>\t<commit_sha>\t<metric_value>\t<status>\t<description>

8. CONTINUE → go to step 1
```

---

## Phase 4: Report

When the loop ends:

1. Print `results.tsv` as a formatted table.
2. Summary: total experiments, kept / discarded / crashed, baseline vs. final metric, improvement %, top 3 most impactful changes.
3. `git log --oneline <start_commit>..HEAD`
4. Recommend next steps: ideas too risky or complex for autonomous experimentation.
