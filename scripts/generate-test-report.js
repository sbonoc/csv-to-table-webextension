#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Parse Vitest JSON report
 */
function parseVitestReport(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    let passed = data.numPassedTests || 0;
    let failed = data.numFailedTests || 0;
    let skipped = data.numPendingTests || data.numTodoTests || 0;
    let duration = 0;

    if (data.testResults && Array.isArray(data.testResults)) {
      data.testResults.forEach(result => {
        if (result.assertionResults && Array.isArray(result.assertionResults)) {
          result.assertionResults.forEach(assertion => {
            if (assertion.status === 'passed') {
              // passed already counted
            } else if (assertion.status === 'failed') {
              // failed already counted
            } else if (assertion.status === 'pending' || assertion.status === 'todo') {
              // skipped already counted
            }
          });
        }
        if (result.duration) {
          duration += result.duration;
        } else if (result.endTime && result.startTime) {
          duration += result.endTime - result.startTime;
        }
      });
    }

    const total = passed + failed + skipped;

    return {
      type: 'vitest',
      passed,
      failed,
      skipped,
      total,
      duration,
      success: failed === 0
    };
  } catch (error) {
    console.error(`Error parsing Vitest report: ${filePath}`, error.message);
    return null;
  }
}

/**
 * Parse Playwright JSON report
 */
function parsePlaywrightReport(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let duration = 0;

    if (data.suites && Array.isArray(data.suites)) {
      function traverseSuites(suites) {
        suites.forEach(suite => {
          if (suite.tests && Array.isArray(suite.tests)) {
            suite.tests.forEach(test => {
              switch (test.status) {
                case 'passed':
                  passed++;
                  break;
                case 'failed':
                  failed++;
                  break;
                case 'skipped':
                  skipped++;
                  break;
              }
              duration += test.duration || 0;
            });
          }
          if (suite.suites) {
            traverseSuites(suite.suites);
          }
        });
      }
      traverseSuites(data.suites);
    }

    return {
      type: 'playwright',
      passed,
      failed,
      skipped,
      total: passed + failed + skipped,
      duration,
      success: failed === 0
    };
  } catch (error) {
    console.error(`Error parsing Playwright report: ${filePath}`, error.message);
    return null;
  }
}

/**
 * Create ASCII table
 */
function createTable(headers, rows) {
  // Calculate column widths
  const colWidths = headers.map((header, idx) => {
    const headerLen = String(header).length;
    const maxRowLen = Math.max(...rows.map(row => String(row[idx] || '').length));
    return Math.max(headerLen, maxRowLen) + 2;
  });

  // Create header
  let table = '┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐\n';
  table += '│' + headers.map((h, i) => padCenter(String(h), colWidths[i])).join('│') + '│\n';
  table += '├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤\n';

  // Create rows
  rows.forEach((row, idx) => {
    table += '│' + row.map((cell, i) => padCenter(String(cell || ''), colWidths[i])).join('│') + '│\n';
  });

  // Close table
  table += '└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘\n';

  return table;
}

/**
 * Pad string to center
 */
function padCenter(str, width) {
  const totalPad = width - str.length;
  const leftPad = Math.floor(totalPad / 2);
  const rightPad = totalPad - leftPad;
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}

/**
 * Pad string to right
 */
function padRight(str, width) {
  return str.padEnd(width, ' ');
}

/**
 * Generate test pyramid table
 */
function generateTestPyramid(unit, integration, e2e) {
  const total = unit.total + integration.total + e2e.total;
  const unitPercent = total > 0 ? Math.round((unit.total / total) * 100) : 0;
  const integrationPercent = total > 0 ? Math.round((integration.total / total) * 100) : 0;
  const e2ePercent = total > 0 ? Math.round((e2e.total / total) * 100) : 0;

  const headers = ['Type', 'Level', '%', 'Total', '✅ Passed', '❌ Failed', '⏭️ Skipped', '⏱️ Duration (s)'];
  const rows = [
    ['🏗️ Unit', '█████████████████████', `${unitPercent}%`, unit.total, unit.passed, unit.failed, unit.skipped, (unit.duration / 1000).toFixed(2)],
    ['📦 Integration', '███████████', `${integrationPercent}%`, integration.total, integration.passed, integration.failed, integration.skipped, (integration.duration / 1000).toFixed(2)],
    ['🎯 E2E', '██', `${e2ePercent}%`, e2e.total, e2e.passed, e2e.failed, e2e.skipped, (e2e.duration / 1000).toFixed(2)]
  ];

  return createTable(headers, rows);
}

/**
 * Generate summary report
 */
function generateSummaryReport(unit, integration, e2e) {
  const totalTests = unit.total + integration.total + e2e.total;
  const totalPassed = unit.passed + integration.passed + e2e.passed;
  const totalFailed = unit.failed + integration.failed + e2e.failed;
  const totalSkipped = unit.skipped + integration.skipped + e2e.skipped;
  const totalDuration = unit.duration + integration.duration + e2e.duration;
  const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  const status = totalFailed === 0 ? '✅ PASSED' : '❌ FAILED';

  // Overall summary table
  const summaryHeaders = ['Metric', 'Count', 'Percentage'];
  const summaryRows = [
    ['Total Tests', totalTests, '100%'],
    ['✅ Passed', totalPassed, `${successRate}%`],
    ['❌ Failed', totalFailed, totalTests > 0 ? `${Math.round((totalFailed / totalTests) * 100)}%` : '0%'],
    ['⏭️ Skipped', totalSkipped, totalTests > 0 ? `${Math.round((totalSkipped / totalTests) * 100)}%` : '0%'],
    ['⏱️ Total Duration', `${(totalDuration / 1000).toFixed(2)}s`, '-']
  ];

  const summaryTable = createTable(summaryHeaders, summaryRows);

  // Test pyramid
  const pyramidTable = generateTestPyramid(unit, integration, e2e);

  let summary = `
╔══════════════════════════════════════════════════════╗
║          📊 TEST EXECUTION SUMMARY                   ║
╚══════════════════════════════════════════════════════╝

OVERALL RESULTS:
${summaryTable}
TEST PYRAMID:
${pyramidTable}
Status: ${status}
`;

  return {
    summary,
    stats: {
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration: (totalDuration / 1000).toFixed(2),
      successRate,
      byType: {
        unit,
        integration,
        e2e
      }
    }
  };
}

/**
 * Main function
 */
function main() {
  const resultsDir = 'test-results';
  
  // Create test-results directory if it doesn't exist
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const unitPath = path.join(resultsDir, 'unit.json');
  const integrationPath = path.join(resultsDir, 'integration.json');
  const e2ePath = path.join(resultsDir, 'e2e.json');

  // Parse reports
  const unitReport = fs.existsSync(unitPath) ? parseVitestReport(unitPath) : { passed: 0, failed: 0, skipped: 0, total: 0, duration: 0 };
  const integrationReport = fs.existsSync(integrationPath) ? parseVitestReport(integrationPath) : { passed: 0, failed: 0, skipped: 0, total: 0, duration: 0 };
  const e2eReport = fs.existsSync(e2ePath) ? parsePlaywrightReport(e2ePath) : { passed: 0, failed: 0, skipped: 0, total: 0, duration: 0 };

  // Generate summary
  const { summary, stats } = generateSummaryReport(unitReport, integrationReport, e2eReport);

  // Print to console
  console.log(summary);

  // Save summary report
  const reportPath = path.join(resultsDir, 'summary.json');
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Save markdown report for GitHub Actions
  const mdReportPath = path.join(resultsDir, 'summary.md');
  const mdReport = `# 🧪 Test Execution Report

## 📊 Overall Results

| Metric | Count | Percentage |
|--------|-------|-----------|
| Total Tests | ${stats.totalTests} | 100% |
| ✅ Passed | ${stats.totalPassed} | ${stats.successRate}% |
| ❌ Failed | ${stats.totalFailed} | ${stats.totalTests > 0 ? Math.round((stats.totalFailed / stats.totalTests) * 100) : 0}% |
| ⏭️ Skipped | ${stats.totalSkipped} | ${stats.totalTests > 0 ? Math.round((stats.totalSkipped / stats.totalTests) * 100) : 0}% |
| ⏱️ Total Duration | ${stats.totalDuration}s | - |

## 📈 Test Results by Type

| Type | Total | ✅ Passed | ❌ Failed | ⏭️ Skipped | ⏱️ Duration |
|------|-------|----------|----------|-----------|-----------|
| 🏗️ Unit | ${stats.byType.unit.total} | ${stats.byType.unit.passed} | ${stats.byType.unit.failed} | ${stats.byType.unit.skipped} | ${(stats.byType.unit.duration / 1000).toFixed(2)}s |
| 📦 Integration | ${stats.byType.integration.total} | ${stats.byType.integration.passed} | ${stats.byType.integration.failed} | ${stats.byType.integration.skipped} | ${(stats.byType.integration.duration / 1000).toFixed(2)}s |
| 🎯 E2E | ${stats.byType.e2e.total} | ${stats.byType.e2e.passed} | ${stats.byType.e2e.failed} | ${stats.byType.e2e.skipped} | ${(stats.byType.e2e.duration / 1000).toFixed(2)}s |

## 📊 Test Pyramid Distribution

| Test Type | Level | Percentage | Visual |
|-----------|-------|-----------|--------|
| Unit | 🏗️ | ${stats.totalTests > 0 ? Math.round((stats.byType.unit.total / stats.totalTests) * 100) : 0}% | ${'█'.repeat(Math.round((stats.byType.unit.total / stats.totalTests) * 30))} |
| Integration | 📦 | ${stats.totalTests > 0 ? Math.round((stats.byType.integration.total / stats.totalTests) * 100) : 0}% | ${'█'.repeat(Math.round((stats.byType.integration.total / stats.totalTests) * 30))} |
| E2E | 🎯 | ${stats.totalTests > 0 ? Math.round((stats.byType.e2e.total / stats.totalTests) * 100) : 0}% | ${'█'.repeat(Math.round((stats.byType.e2e.total / stats.totalTests) * 30))} |

## Final Status

**${stats.totalFailed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}**

- Success Rate: ${stats.successRate}%
- Total Execution Time: ${stats.totalDuration}s
- Tests Run: ${stats.totalTests}
`;
  fs.writeFileSync(mdReportPath, mdReport);
  console.log(`📝 Markdown report saved to: ${mdReportPath}`);

  // Exit with appropriate code
  process.exit(stats.totalFailed === 0 ? 0 : 1);
}

main();
