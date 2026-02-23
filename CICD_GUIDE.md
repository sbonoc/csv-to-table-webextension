# Continuous Integration & Deployment Guide

## Overview

The project includes a complete CI/CD pipeline using GitHub Actions that:

1. **Tests** your code (Unit, Integration, E2E)
2. **Builds** the Firefox extension (.xpi file)
3. **Reports** test results with Test Pyramid visualization
4. **Releases** the add-on for public download

## Quick Start

### For Regular Development

Just commit and push normally:
```bash
git add .
git commit -m "Your feature"
git push origin main
```

GitHub Actions automatically:
- ✅ Installs dependencies
- ✅ Lints code
- ✅ Runs all tests
- ✅ Builds the extension
- ✅ Reports results in job summary

### For Creating a Release

Tag your commit and push the tag:
```bash
# Create a version tag
git tag v1.0.0

# Push the tag
git push origin v1.0.0
```

This automatically:
1. Builds the extension
2. Creates a GitHub Release
3. Uploads the `.xpi` file
4. Makes it available for download

## Test Pyramid Report

After tests complete, GitHub Actions shows a summary with:

```
              ▌ 🎯 E2E (10%)
              ▌ 10 tests | ✅ 10 | ❌ 0 | ⏭️ 0 | ⏱️ 45s
             ▐─────────────────▌
            ▌   📦 Integration (20%)
            ▌   20 tests | ✅ 20 | ❌ 0 | ⏭️ 0 | ⏱️ 8s
           ▐─────────────────────────────▌
          ▌     🏗️ Unit (70%)
          ▌     60 tests | ✅ 60 | ❌ 0 | ⏭️ 0 | ⏱️ 3s
         ▐───────────────────────────────────────▌
```

Showing:
- **Total tests per level**
- **Passed/Failed/Skipped counts**
- **Duration for each test type**
- **Success rate percentage**

## Where to Find Results

### In GitHub

1. Go to your repository
2. Click **Actions** tab
3. Select the workflow run
4. View **Job Summary** for test pyramid
5. Download **Artifacts** for:
   - Built `.xpi` file
   - Detailed test reports

### For Releases

1. Go to **Releases** tab
2. Click the release version
3. Download the `.xpi` file
4. Follow installation instructions

## Local Testing (Before Push)

Run tests locally before pushing:

```bash
# Quick unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires Playwright setup)
npm run test:e2e

# Full test suite with report
npm run test:all

# Watch mode while developing
npm run test:watch
```

## GitHub Actions Features

### Automatic Testing

- Runs on every push to `main` and `develop`
- Runs on all pull requests
- Tests on Node.js 18.x and 20.x
- Tests with Firefox browser (E2E)

### Artifacts

**Artifacts are kept for 90 days by default**

Downloads include:
- `firefox-addon-node-*.xpi` - Built extension
- `test-results/` - All test reports

### Branch Protection

Set up branch protection to require tests passing:

1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable "Require status checks to pass"
4. Select `required-checks` from list
5. Enable "Require branches to be up to date"

Now no one can merge without passing tests!

## Release Workflow

### Automatic Release

```bash
# Tag a release
git tag v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0
```

**Workflow creates:**
- GitHub Release page
- Release notes (from tag message)
- Downloadable `.xpi` file
- Installation instructions

### Manual Release (Fallback)

If automation fails:

1. Go to Actions → Last run
2. Download the artifact (`.xpi` file)
3. Go to Releases → Create release
4. Upload the `.xpi` file manually

## Configuration Files

### GitHub Actions
- `.github/workflows/build-and-release.yml` - Main workflow
- `.github/workflows/README.md` - Workflow documentation

### Test Configuration
- `scripts/generate-test-report.js` - Report generator
- `vitest.config.js` - Unit test configuration
- `playwright.config.js` - E2E test configuration

### NPM Scripts
- `npm run test:unit` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run test:e2e` - Run E2E tests (requires Playwright)
- `npm run test:all` - Run all tests and generate report

## Monitoring

### Workflow Health

1. Go to Actions tab
2. Filter by workflow name
3. Watch for ✅ or ❌ status
4. Click runs to see details

### Test Trends

From GitHub:
1. Insights → Actions
2. See workflow run frequency and times
3. Track success rate over time

## Troubleshooting

### Tests fail in GitHub but pass locally

**Common causes:**
- Node.js version mismatch
- Environment variables not set
- File path issues (Windows vs Unix)
- Timing issues in async tests

**Fix:**
1. Check error logs in workflow
2. Reproduce locally with same Node version
3. Review recent changes

### Build fails in GitHub Actions

**Possible issues:**
- `web-ext build` error
- Missing dependencies
- Wrong file paths
- Manifest.json problems

**Fix:**
1. Run locally: `npm run build`
2. Check for errors in output
3. Review `manifest.json` syntax

### No test results in summary

**Possible issues:**
- Tests didn't run
- Report generation failed
- Wrong output format

**Fix:**
1. Check workflow logs
2. Verify test commands ran
3. Enable debugging if needed

## Performance Tips

### Reduce Build Time

- Tests run in parallel across Node versions
- E2E tests can be skipped for draft PRs
- Skip on specific paths with:

```yaml
on:
  push:
    paths:
      - '**.md'  # Skip for docs-only changes
      - 'src/**'
      - 'tests/**'
```

### Optimize Tests

- Unit tests: Keep < 5 seconds
- Integration: Keep < 10 seconds
- E2E: 30-60 seconds is normal
- Parallel execution by type

## Security

### Secrets & Tokens

GitHub Actions tokens used:
- `secrets.GITHUB_TOKEN` - For releases (built-in, no setup needed)

No other secrets needed for this project.

### Security Best Practices

- ✅ No hardcoded credentials
- ✅ No environment variables in code
- ✅ All code reviewed before merge
- ✅ Tests must pass before release

## Next Steps

1. **Merge to main**: Workflow runs tests
2. **Check test summary**: View pyramid report
3. **Create release**: Push version tag
4. **Download .xpi**: Get from Releases page
5. **Share with users**: Send release link

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Web-ext Documentation](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
- [Firefox Add-on Distribution](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Semantic Versioning](https://semver.org/)

## Getting Help

If anything fails:
1. Check workflow logs (Actions tab)
2. Review error messages carefully
3. Run locally to reproduce
4. Check recent changes
5. Open an issue with logs

---

**Need to modify the workflow?**
Edit `.github/workflows/build-and-release.yml` and commit your changes. The workflow validates itself on the next run.
