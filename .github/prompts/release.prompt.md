---
agent: agent
---

# Release Automation Prompt

Prepare and publish a new release of the Tenstorrent Simulator Playground.

## Prerequisites

Before running this prompt, ensure:
- All features for this release are merged to the current branch
- All tests pass
- You have push access to the repository

## Tasks

### 1. Determine Version

Ask the user what type of release this is:
- **major**: Breaking changes or significant new features (X.0.0)
- **minor**: New features, backward compatible (x.Y.0)  
- **patch**: Bug fixes, backward compatible (x.y.Z)

Read the current version from `backend/pyproject.toml` and calculate the new version.

### 2. Update Documentation

Review and update documentation to reflect current state:

- **README.md**: Ensure features, installation instructions, and examples are current
- **backend/README.md**: Update API documentation if endpoints changed
- **frontend/README.md**: Update component documentation if UI changed
- **docs/**: Update any guides or technical documentation

Check for:
- Outdated screenshots or diagrams
- Missing new features in feature lists
- Deprecated functionality that should be removed
- Correct version numbers in examples

### 3. Update CHANGELOG.md

Update `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features added in this release

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Removed
- Removed features or deprecated functionality

### Security
- Security fixes (if any)
```

To identify changes since the last release:
1. Check git log: `git log --oneline <last-tag>..HEAD`
2. Review closed PRs and issues
3. Check for dependency updates

### 4. Bump Version Numbers

Update version in all locations:
- `backend/pyproject.toml` - `version = "X.Y.Z"`
- `frontend/package.json` - `"version": "X.Y.Z"`

Ensure consistency across all version references.

### 5. Commit Release Changes

Create a release commit with all documentation and version changes:

```bash
git add -A
git commit -m "chore: release vX.Y.Z

- Update CHANGELOG.md
- Bump version to X.Y.Z
- Update documentation"
```

### 6. Create Git Tag

Create an annotated tag for the release:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z

<Brief summary of key changes>"
```

### 7. Push to Remote

Push the commit and tag to the `dev` branch:

```bash
git push origin dev
git push origin vX.Y.Z
```

## Success Criteria

- [ ] Version numbers updated consistently across all files
- [ ] CHANGELOG.md includes all notable changes since last release
- [ ] Documentation reflects current functionality
- [ ] Release commit created with appropriate message
- [ ] Git tag created with version number
- [ ] Changes pushed to `dev` branch
- [ ] Tag pushed to remote

## Notes

- If CHANGELOG.md doesn't exist, create it with the full history
- Use semantic versioning (semver.org)
- Include migration notes for breaking changes in major releases
- Consider creating GitHub release after pushing (manual step)