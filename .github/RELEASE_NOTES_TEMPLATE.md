# Release Notes - CSV to Table Filler

## Version Template

```
# v1.X.X - [Release Date]

## 🎉 Features
- Feature 1
- Feature 2

## 🐛 Bug Fixes
- Bug fix 1
- Bug fix 2

## 📚 Documentation
- Doc update 1

## 🚀 Performance
- Performance improvement 1

## 🔄 Dependencies
- Dependency update 1

## ⚠️ Breaking Changes
List any breaking changes here

## 📦 Installation

Download the `.xpi` file below and install in Firefox:

1. Download `csv-to-table-filler-1.X.X.xpi`
2. Open Firefox
3. Go to `about:addons`
4. Click the gear icon → "Install Add-on From File"
5. Select the downloaded file

## 🙏 Contributors

- @contributor1
- @contributor2

## 📋 Changelog

Full changelog: [v1.X.X commits](https://github.com/sbonoc/firefox-addon-csv-to-table-filler/commits/v1.X.X)
```

## How to Create a Release

### 1. Tag the Release
```bash
# Create an annotated tag
git tag -a v1.X.X -m "Release version 1.X.X"

# Push the tag
git push origin v1.X.X
```

### 2. GitHub Actions Automatically:
- Builds the extension
- Creates the GitHub Release
- Uploads the `.xpi` file
- Publishes it for download

### 3. Add Release Notes
If automation didn't include full notes:
1. Go to GitHub Releases
2. Edit the release
3. Add detailed release notes, features, bug fixes
4. Save

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):
- **Major** (1.0.0): Breaking changes
- **Minor** (1.1.0): New features, backwards compatible
- **Patch** (1.0.1): Bug fixes only

Examples:
- `v1.0.0` - First release
- `v1.1.0` - New feature added
- `v1.1.1` - Bug fix
- `v2.0.0` - Major breaking change

## Announcing Releases

After publishing:
1. Update [CHANGELOG.md](https://github.com/sbonoc/firefox-addon-csv-to-table-filler/blob/main/CHANGELOG.md)
2. Announce on:
   - GitHub Releases page ✅ (automatic)
   - GitHub Issues (discussion/milestone)
   - README.md (update links if needed)

---

For more info on creating releases, see:
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- [Semantic Versioning](https://semver.org/)
