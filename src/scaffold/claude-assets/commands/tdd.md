# /tdd

Orchestrates a full TDD cycle: red → green → refactor.

## Usage

```
/tdd <feature or bug description>
```

## What this command does

1. **Red phase** — invokes the `tdd-red` agent to write failing tests that define the expected behavior. Presents a test plan and waits for your confirmation before writing anything.
2. **Green phase** — invokes the `tdd-green` agent to write the minimum production code needed to make all tests pass. Does not modify tests.
3. **Refactor phase** — invokes the `tdd-refactor` agent to clean up the implementation: remove duplication, improve names, apply code standards and security review. Tests stay green throughout.

## Rules

- Each phase completes fully before the next begins.
- You are consulted before the red phase writes tests and before the green phase begins implementation.
- If tests go red during refactor, the refactor agent reverts immediately.
- Feature scope is fixed after the red phase — no new behavior is added during green or refactor.
