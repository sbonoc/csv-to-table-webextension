# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the CSV to Table Filler project.

## Workflows

### `build-and-release.yml`

Automated build, test, and release workflow.

**Triggers:**
- Push to `main` or `develop` branches
- All pull requests to `main` or `develop`
- Push of version tags (e.g., `v1.0.0`)

**Jobs:**

#### 1. Test and Build (Multi-Node Version)
Runs on multiple Node.js versions (18.x, 20.x)

**Steps:**
1. Checkout code
2. Setup Node.js environment
3. Install dependencies
4. Lint code with web-ext
5. Run Unit Tests → Generate JSON results
6. Run Integration Tests → Generate JSON results
7. Setup Playwright for E2E testing
8. Run E2E Tests → Generate JSON results
9. Generate Test Pyramid Report
10. Build Firefox extension (`.xpi` file)
11. Upload artifacts:
    - Firefox add-on files
    - Test results and reports
12. Generate GitHub job summary with test report

**Outputs:**
- `firefox-addon-node-*.xpi`: Built extension file
- `test-results/`: Test reports (JSON, Markdown summaries)
- Job Summary: Rendered test pyramid with statistics

#### 2. Release (Tag-based)
Only runs when pushing version tags (e.g., `v1.0.0`)

**Triggers:**
- Tag matching pattern `v*` (e.g., `v1.0.0`, `v2.1.3`)

**Steps:**
1. Checkout code
2. Download build artifacts from test-and-build job
3. Extract version from git tag
4. Create GitHub Release with:
    - Release name and version
    - Installation instructions
    - Link to commits
5. Upload `.xpi` file to release

**Release Notes Template:**
Automatically includes:
- Version number
- Installation instructions for end-users
- Link to commit history

#### 3. Required Checks
Validates overall job status

**Purpose:**
- Ensure all required checks pass
- Provide clear success/failure signal for branch protection rules

## How to Use

### Regular Development

Just push to `main` or create a pull request:
```bash
git push origin main
# or
git push origin feature-branch
```

The workflow automatically:
- ✅ Installs dependencies
- ✅ Lints code
- ✅ Runs all tests
- ✅ Builds the extension
- ✅ Reports results

### Creating a Release

Tag your commit and push:
```bash
# Create a version tag
git tag v1.0.0

# Push the tag
git push origin v1.0.0
```

This triggers:
1. Full test and build on the tag commit
2. Automatic GitHub Release creation
3. `.xpi` file available for download

### Manual Release (Alternative)

If automation doesn't work:
1. Go to your repository
2. Click "Releases" → "Create a new release"
3. Select tag version (e.g., `v1.0.0`)
4. Manual upload the `.xpi` file
5. Publish the release

## Test Pyramid Report

### What It Shows

The GitHub Actions summary displays:

```
╔══════════════════════════════════════════╗
║         TEST PYRAMID REPORT              ║
╚══════════════════════════════════════════╝

              ▌ 🎯 E2E (10%)
              ▌ 10 tests | ✅ 10 | ❌ 0 | ⏭️ 0 | ⏱️ 45000ms
             ▐─────────────────▌
            ▌   📦 Integration (20%)
            ▌   20 tests | ✅ 20 | ❌ 0 | ⏭️ 0 | ⏱️ 8000ms
           ▐─────────────────────────────▌
          ▌     🏗️ Unit (70%)
          ▌     60 tests | ✅ 60 | ❌ 0 | ⏭️ 0 | ⏱️ 3000ms
         ▐───────────────────────────────────────▌
```

### Metrics Included

For each test type:
- **Total**: Number of tests
- **✅ Passed**: Number passed
- **❌ Failed**: Number failed
- **⏭️ Skipped**: Number skipped
- **⏱️ Duration**: Total time in milliseconds

### Interpreting Results

- **Test Pyramid Shape**: Unit (70%) > Integration (20%) > E2E (10%)
  - More unit tests = faster feedback
  - Fewer E2E tests = less fragile, less infrastructure cost

- **Success Rate**: `passed / total * 100`
  - Aim for 100%
  - Skipped tests don't count against success rate

- **Duration**: Total time across all test types
  - Unit tests should be < 5s
  - Integration tests should be < 10s
  - E2E tests typically 30-60s

## Artifact Management

### Downloading Artifacts

1. Go to the specific workflow run
2. Scroll to "Artifacts" section
3. Click to download:
    - `firefox-addon-node-*.xpi`: The extension file
    - `test-results-node-*`: Full test reports

### Artifact Retention

GitHub keeps artifacts for 90 days by default.

To change retention:
```yaml
- uses: actions/upload-artifact@v3
  with:
    retention-days: 180  # Change default retention
```

## Troubleshooting

### Build fails with "web-ext build" error
- Check `manifest.json` syntax
- Ensure all referenced files exist
- Review error message in logs

### Tests fail in GitHub Actions but pass locally
- Node.js version mismatch: Check your local version
- Environment variables: GitHub Actions doesn't use `.env` files
- Path issues: Use `/` not `\` (happens on Windows)

### E2E tests skip in workflow
- E2E tests only run on `main` or pull requests (not develop)
- Playwright installation may fail: Check logs
- Firefox binary might not be found: Workflow handles setup

### Release not created
- Ensure tag follows pattern `v*` (e.g., `v1.0.0`)
- Check GitHub token permissions
- Verify no existing release for that tag

### Test report not showing in summary
- Check job has completed
- Verify test files exist and run
- Review `generate-test-report.js` logs

## Configuration

Main configuration file: `build-and-release.yml`

### To modify test behavior:

```yaml
# In .github/workflows/build-and-release.yml

# Change Node.js versions
strategy:
  matrix:
    node-version: [18.x, 20.x]  # Add/remove versions here

# Change which branches trigger workflow
on:
  push:
    branches: [ main, develop ]  # Add/remove branches
```

### To change artifact retention:

```yaml
- uses: actions/upload-artifact@v3
  with:
    retention-days: 180  # Change retention period
```

## Best Practices

1. **Tag Naming**: Use semantic versioning (v1.0.0, v1.1.0, etc.)
2. **Commit Messages**: Write clear messages for release notes
3. **Test Coverage**: Aim for 80%+ coverage before release
4. **Documentation**: Update README.md in releases
5. **Performance**: Monitor test duration trends

## Monitoring

### Check Workflow Status

1. Go to "Actions" tab in your repository
2. Click "Build, Test & Release" workflow
3. View recent runs with status (✅ pass, ❌ fail)

### Set Required Checks

To enforce passing tests:
1. Go to Settings → Branches
2. Edit branch protection rules
3. Enable "Require status checks to pass"
4. Select "required-checks" from the list

This prevents merging to main if tests fail.

## Performance Benchmarks

Current typical timings:
- **Checkout + Setup**: ~15s
- **Install deps**: ~30s
- **Lint**: ~5s
- **Unit tests**: ~8s
- **Integration tests**: ~12s
- **E2E tests**: ~45s
- **Build**: ~10s
- **Total**: ~2 minutes per run

Times vary based on GitHub runner availability.
