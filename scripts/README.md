# Test Report Generation

This directory contains scripts for generating test reports and managing the build process.

## Scripts

### `generate-test-report.js`

Generates comprehensive test reports with Test Pyramid visualization.

**Usage:**
```bash
node scripts/generate-test-report.js
```

**Input:**
- Expects test results in JSON format from:
  - `test-results/unit.json` (Vitest output)
  - `test-results/integration.json` (Vitest output)
  - `test-results/e2e.json` (Playwright output)

**Output:**
- **Console**: Displays Test Pyramid with stats
- **test-results/summary.json**: Detailed statistics in JSON format
- **test-results/summary.md**: Markdown report for GitHub Actions

**Test Pyramid Format:**
```
              ▌ 🎯 E2E (10%)
             ▐─────────────────▌
            ▌   📦 Integration (20%)
           ▐─────────────────────────────▌
          ▌     🏗️ Unit (70%)
         ▐───────────────────────────────────────▌
```

## GitHub Actions Integration

The workflow automatically:
1. Runs on push to `main` and `develop`
2. Runs on all pull requests
3. Executes tests and generates reports
4. Uploads results as artifacts
5. Creates releases for version tags

### Test Report in GitHub Actions

The test report is automatically added to the job summary in GitHub Actions:
1. Go to your Actions run
2. Click the run you want to view
3. Scroll to see the "Test Results" section with:
   - Test counts by type
   - Pass/fail/skip statistics
   - Duration by test type
   - Visual Test Pyramid

### Manual Local Execution

```bash
# Run all tests and generate report
npm run test:all

# Or individually:
npm run test:unit
npm run test:integration
npm run test:e2e

# Generate report (automatic after tests)
node scripts/generate-test-report.js
```

## Report Contents

### JSON Report (`test-results/summary.json`)
```json
{
  "totalTests": 90,
  "totalPassed": 87,
  "totalFailed": 0,
  "totalSkipped": 3,
  "successRate": 96,
  "byType": {
    "unit": { ... },
    "integration": { ... },
    "e2e": { ... }
  }
}
```

### Markdown Report (`test-results/summary.md`)

Human-readable format suitable for:
- GitHub Actions job summaries
- Commit comments
- Pull request reviews
- Documentation

## Exit Codes

- **0**: All tests passed
- **1**: Some tests failed

## Performance Tips

- **Unit tests**: Should complete in < 5s
- **Integration tests**: Should complete in < 10s
- **E2E tests**: May take 30-60s (depends on Playwright setup)

## Troubleshooting

### No test results found
- Ensure tests are run before calling `generate-test-report.js`
- Check that `test-results/` directory exists
- Verify JSON files are valid

### Incorrect test counts
- Ensure Vitest and Playwright reporters are configured correctly
- Check that the JSON format matches expectations
- Review the test output for parsing errors

### Report not showing in GitHub Actions
- Verify the workflow has completed
- Check the job summary section
- Look for error messages in the workflow logs
