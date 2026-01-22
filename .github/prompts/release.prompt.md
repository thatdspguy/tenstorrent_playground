---
mode: agent
description: "Automated release process - Usage: /release v1.2.0"
---

# Automated Release Process

This prompt fully automates the release of Tenstorrent Simulator Playground.

**Usage:** `/release vX.Y.Z` (e.g., `/release v1.2.0`)

The version is provided by the user in the prompt. Extract it and proceed automatically.

---

## Step 1: Stage and Commit Outstanding Changes

First, check for any uncommitted changes and commit them:

```bash
git status --porcelain
```

If there are unstaged or uncommitted changes:
1. Stage all changes: `git add -A`
2. Create a commit with a descriptive message based on the changed files
3. If no changes, proceed to next step

---

## Step 2: Identify Previous Release Tag

Find the most recent release tag:

```bash
git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0"
```

Store this as the previous version for comparison.

---

## Step 3: Get Commits Since Last Release

Get all commits since the last release tag:

```bash
git log <previous-tag>..HEAD --oneline --no-merges
```

Categorize these commits by their prefixes:
- `feat:` → Added
- `fix:` → Fixed
- `docs:` → Documentation (may affect README updates)
- `refactor:`, `perf:` → Changed
- `chore:`, `build:`, `ci:` → Infrastructure (usually not in changelog)
- `BREAKING CHANGE` or `!:` → Breaking Changes

---

## Step 4: Update CHANGELOG.md

Read the current `CHANGELOG.md` and insert a new release section at the top (after the header), following [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- (features from feat: commits)

### Changed  
- (changes from refactor:, perf: commits)

### Fixed
- (fixes from fix: commits)
```

Only include sections that have entries. Use today's date.

---

## Step 5: Update Version Numbers

Update the version in these files to match the release version:

1. **backend/pyproject.toml**: Update `version = "X.Y.Z"`
2. **frontend/package.json**: Update `"version": "X.Y.Z"`
3. **README.md**: Update version badge if present (e.g., `version-X.Y.Z-blue`)

---

## Step 6: Update Documentation

Review commits for documentation-relevant changes and update:

1. **README.md**: 
   - Update Features section if new features were added
   - Update any outdated instructions
   - Ensure version badge matches new version

2. **CHANGELOG.md**: Already updated in Step 4

Only make changes if the commits indicate new features, API changes, or UI changes that aren't already documented.

---

## Step 7: Create Release Commit

Stage all changes and create the release commit:

```bash
git add -A
git commit -m "chore: release vX.Y.Z

- Update CHANGELOG.md with release notes
- Bump version to X.Y.Z in pyproject.toml and package.json
- Update documentation"
```

---

## Step 8: Create Git Tag

Create an annotated tag with a summary of key changes:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z

Key changes:
- (2-4 bullet points summarizing major changes from changelog)"
```

---

## Step 9: Push to Remote

Push the commit and tag to the dev branch:

```bash
git push origin dev
git push origin vX.Y.Z
```

---

## Completion Summary

After all steps complete, output a summary:

```
✅ Release vX.Y.Z completed successfully!

📋 Summary:
- Commits included: <count>
- Previous version: <old-version>
- New version: <new-version>
- Tag created: vX.Y.Z
- Pushed to: origin/dev

🔗 Next steps (manual):
- Create GitHub Release at: https://github.com/thatdspguy/tenstorrent_playground/releases/new?tag=vX.Y.Z
```

---

## Error Handling

- If git push fails, inform user and provide manual commands
- If no commits found since last release, warn but proceed with version bump
- If version parsing fails, abort and ask user to verify version format