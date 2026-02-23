# Test Report Format Examples

This document shows examples of how test reports are formatted in this project.

## Console Report (ASCII Tables)

When running tests or `npm run test:all`, you'll see output like this:

```
╔══════════════════════════════════════════════════════╗
║          📊 TEST EXECUTION SUMMARY                   ║
╚══════════════════════════════════════════════════════╝

OVERALL RESULTS:
┌───────────────────┬────────┬────────────┐
│      Metric       │ Count  │ Percentage │
├───────────────────┼────────┼────────────┤
│    Total Tests    │   68   │    100%    │
│     ✅ Passed      │   65   │    96%     │
│     ❌ Failed      │   0    │    0%      │
│    ⏭️ Skipped     │   3    │    4%      │
│ ⏱️ Total Duration │ 37.50s │     -      │
└───────────────────┴────────┴────────────┘

TEST PYRAMID:
┌────────────────┬───────────────────────┬─────┬───────┬──────────┬──────────┬──────────┬─────────────────┐
│      Type      │         Level         │  %  │ Total │ ✅ Passed │ ❌ Failed │ ⏭️ Skipped │ ⏱️ Duration (s) │
├────────────────┼───────────────────────┼─────┼───────┼──────────┼──────────┼──────────┼─────────────────┤
│    🏗️ Unit    │ █████████████████████ │ 54% │  37   │    35    │    0     │   2      │      3.50       │
│ 📦 Integration │      ███████████      │ 31% │  21   │    20    │    0     │   1      │      8.00       │
│     🎯 E2E     │          ██           │ 15% │  10   │    10    │    0     │   0      │      26.00      │
└────────────────┴───────────────────────┴─────┴───────┴──────────┴──────────┴──────────┴─────────────────┘

Status: ✅ PASSED
```

## GitHub Actions Summary (Markdown Tables)

When viewing test results in GitHub Actions, the report appears as markdown tables:

```markdown
# 🧪 Test Execution Report

## 📊 Overall Results

| Metric | Count | Percentage |
|--------|-------|-----------|
| Total Tests | 68 | 100% |
| ✅ Passed | 65 | 96% |
| ❌ Failed | 0 | 0% |
| ⏭️ Skipped | 3 | 4% |
| ⏱️ Total Duration | 37.50s | - |

## 📈 Test Results by Type

| Type | Total | ✅ Passed | ❌ Failed | ⏭️ Skipped | ⏱️ Duration |
|------|-------|----------|----------|-----------|-----------|
| 🏗️ Unit | 37 | 35 | 0 | 2 | 3.50s |
| 📦 Integration | 21 | 20 | 0 | 1 | 8.00s |
| 🎯 E2E | 10 | 10 | 0 | 0 | 26.00s |

## 📊 Test Pyramid Distribution

| Test Type | Level | Percentage | Visual |
|-----------|-------|-----------|--------|
| Unit | 🏗️ | 54% | ████████████████ |
| Integration | 📦 | 31% | █████████ |
| E2E | 🎯 | 15% | ████ |

## Final Status

**✅ ALL TESTS PASSED**

- Success Rate: 96%
- Total Execution Time: 37.50s
- Tests Run: 68
```

## Output Files

The test report generator creates the following files in `test-results/`:

1. **summary.json** - Machine-readable test statistics
2. **summary.md** - Markdown report for GitHub Actions
3. **unit.json** - Raw Vitest output
4. **integration.json** - Raw Vitest output
5. **e2e.json** - Raw Playwright output

## Test Metrics Explained

### Metric Definitions

| Metric | Meaning |
|--------|---------|
| Total Tests | Number of test cases executed |
| ✅ Passed | Tests that executed successfully |
| ❌ Failed | Tests that failed (should be 0) |
| ⏭️ Skipped | Tests marked as skip/todo |
| Duration | Time taken for each test type |
| Success Rate | (Passed / Total) × 100% |

### Understanding the Test Pyramid

The Test Pyramid follows best practices:

- **🏗️ Unit Tests (70%)**: Fast, isolated tests of single functions
  - Run in milliseconds
  - No external dependencies
  - Provides instant feedback

- **📦 Integration Tests (20%)**: Tests of module interactions
  - Run in seconds
  - Verify workflows between components
  - Catch integration bugs

- **🎯 E2E Tests (10%)**: Full user journeys
  - Run in tens of seconds
  - Test real browser interactions
  - Confirm complete workflows

### Optimal Distribution

- Unit: 60-80% of tests
- Integration: 15-25% of tests
- E2E: 5-15% of tests

Our current distribution (54% unit, 31% integration, 15% E2E) is slightly weighted toward integration tests, which is acceptable for this project.

## Using Reports

### For Local Development

```bash
# Run tests with built-in report
npm run test:all

# Output shows console tables immediately
```

### In GitHub Actions

After each workflow run:
1. Go to **Actions** tab
2. Click the workflow run
3. Scroll to **Job Summary**
4. View markdown tables with results

### For Tracking Progress

1. Save `summary.json` from each release
2. Compare metrics over time:
   - Are tests getting slower?
   - Is success rate consistent?
   - Are skipped tests increasing?

3. Use to identify:
   - Performance regressions
   - Flaky tests
   - Test coverage gaps

## Report Customization

To customize the report format, edit:
- `scripts/generate-test-report.js` for console/JSON/Markdown output

Key functions:
- `createTable()` - Creates ASCII tables
- `generateTestPyramid()` - Pyramid table with visual bar
- `generateSummaryReport()` - Overall statistics
- Main `mdReport` template - Markdown format

---

For more info, see [CICD_GUIDE.md](../CICD_GUIDE.md)
