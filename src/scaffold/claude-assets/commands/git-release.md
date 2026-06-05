# /git-release

Prepares a versioned release: bumps the version following SemVer, updates CHANGELOG.md following Keep a Changelog, and drafts a GitHub Release body.

## Usage

```
/git-release <major|minor|patch> [release notes]
```

## What this command does

### 1. Determine the new version
Read `package.json` (or `pyproject.toml`, `Cargo.toml`, `pom.xml`) for the current version. Apply the bump type:
- `patch` — bug fixes, no API changes
- `minor` — new features, backwards compatible
- `major` — breaking changes

### 2. Collect changes since last release
```bash
git log $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD --oneline 2>/dev/null | head -50
```

Group commits into Keep a Changelog categories:
- **Added** — new features (`feat:`)
- **Changed** — changes to existing behavior (`change:`, `refactor:`)
- **Fixed** — bug fixes (`fix:`)
- **Removed** — removed features (`remove:`)
- **Security** — security fixes (`security:`)

Ignore `chore:`, `docs:`, `style:`, `test:` unless significant.

### 3. Update CHANGELOG.md
Prepend a new section:
```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- ...

### Fixed
- ...
```

### 4. Bump version in manifest
Update the version field in `package.json` (or equivalent). Do not commit — present the change for review.

### 5. Draft GitHub Release body
```markdown
## What's new in vX.Y.Z

<2–3 sentence summary of the most important changes>

### Highlights
- **Feature** — description
- **Fix** — description

### Full changelog
See [CHANGELOG.md](./CHANGELOG.md#XYZ---YYYY-MM-DD)
```

## Output
- Updated `CHANGELOG.md` (written)
- Updated version manifest (written)
- GitHub Release body (printed, ready to paste)
- Commands to tag and push:
```bash
git add CHANGELOG.md package.json
git commit -m "chore: release vX.Y.Z"
git tag vX.Y.Z
git push && git push --tags
```
