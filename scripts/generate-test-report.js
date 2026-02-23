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
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let duration = 0;

    if (data.testResults && Array.isArray(data.testResults)) {
      data.testResults.forEach(result => {
        passed += result.numPassingTests || 0;
        failed += result.numFailingTests || 0;
        skipped += result.numPendingTests || 0;
        duration += result.perfStats?.duration || 0;
      });
    }

    return {
      type: 'vitest',
      passed,
      failed,
      skipped,
      total: passed + failed + skipped,
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
 * Generate test pyramid ASCII art
 */
function generateTestPyramid(unit, integration, e2e) {
  const unitPercent = Math.round((unit.total / (unit.total + integration.total + e2e.total)) * 100);
  const integrationPercent = Math.round((integration.total / (unit.total + integration.total + e2e.total)) * 100);
  const e2ePercent = Math.round((e2e.total / (unit.total + integration.total + e2e.total)) * 100);

  return `
╔══════════════════════════════════════════╗
║         TEST PYRAMID REPORT              ║
╚══════════════════════════════════════════╝

              ▌ 🎯 E2E (${e2ePercent}%)
              ▌ ${e2e.total} tests | ✅ ${e2e.passed} | ❌ ${e2e.failed} | ⏭️ ${e2e.skipped} | ⏱️ ${e2e.duration}ms
             ▐─────────────────▌
            ▌   📦 Integration (${integrationPercent}%)
            ▌   ${integration.total} tests | ✅ ${integration.passed} | ❌ ${integration.failed} | ⏭️ ${integration.skipped} | ⏱️ ${integration.duration}ms
           ▐─────────────────────────────▌
          ▌     🏗️ Unit (${unitPercent}%)
          ▌     ${unit.total} tests | ✅ ${unit.passed} | ❌ ${unit.failed} | ⏭️ ${unit.skipped} | ⏱️ ${unit.duration}ms
         ▐───────────────────────────────────────▌

`;
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

  let summary = `
╔══════════════════════════════════════════════════════╗
║            TEST EXECUTION SUMMARY                   ║
╚══════════════════════════════════════════════════════╝

📊 Overall Results:
  Total Tests: ${totalTests}
  ✅ Passed: ${totalPassed} (${successRate}%)
  ❌ Failed: ${totalFailed}
  ⏭️  Skipped: ${totalSkipped}
  ⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s

📈 By Type:
  🏗️  Unit Tests:
      Total: ${unit.total} | ✅ ${unit.passed} | ❌ ${unit.failed} | ⏭️ ${unit.skipped} | ⏱️ ${(unit.duration / 1000).toFixed(2)}s
      
  📦 Integration Tests:
      Total: ${integration.total} | ✅ ${integration.passed} | ❌ ${integration.failed} | ⏭️ ${integration.skipped} | ⏱️ ${(integration.duration / 1000).toFixed(2)}s
      
  🎯 E2E Tests:
      Total: ${e2e.total} | ✅ ${e2e.passed} | ❌ ${e2e.failed} | ⏭️ ${e2e.skipped} | ⏱️ ${(e2e.duration / 1000).toFixed(2)}s

${generateTestPyramid(unit, integration, e2e)}
Status: ${totalFailed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}
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
- **Total Tests**: ${stats.totalTests}
- **✅ Passed**: ${stats.totalPassed} (${stats.successRate}%)
- **❌ Failed**: ${stats.totalFailed}
- **⏭️ Skipped**: ${stats.totalSkipped}
- **⏱️ Total Duration**: ${stats.totalDuration}s

## 📈 By Type

### 🏗️ Unit Tests
- Total: ${stats.byType.unit.total}
- ✅ Passed: ${stats.byType.unit.passed}
- ❌ Failed: ${stats.byType.unit.failed}
- ⏭️ Skipped: ${stats.byType.unit.skipped}
- ⏱️ Duration: ${(stats.byType.unit.duration / 1000).toFixed(2)}s

### 📦 Integration Tests
- Total: ${stats.byType.integration.total}
- ✅ Passed: ${stats.byType.integration.passed}
- ❌ Failed: ${stats.byType.integration.failed}
- ⏭️ Skipped: ${stats.byType.integration.skipped}
- ⏱️ Duration: ${(stats.byType.integration.duration / 1000).toFixed(2)}s

### 🎯 E2E Tests
- Total: ${stats.byType.e2e.total}
- ✅ Passed: ${stats.byType.e2e.passed}
- ❌ Failed: ${stats.byType.e2e.failed}
- ⏭️ Skipped: ${stats.byType.e2e.skipped}
- ⏱️ Duration: ${(stats.byType.e2e.duration / 1000).toFixed(2)}s

## Test Pyramid

\`\`\`
              ▌ 🎯 E2E (${Math.round((stats.byType.e2e.total / stats.totalTests) * 100)}%)
             ▐─────────────────▌
            ▌   📦 Integration (${Math.round((stats.byType.integration.total / stats.totalTests) * 100)}%)
           ▐─────────────────────────────▌
          ▌     🏗️ Unit (${Math.round((stats.byType.unit.total / stats.totalTests) * 100)}%)
         ▐───────────────────────────────────────▌
\`\`\`

**Status**: ${stats.totalFailed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}
`;
  fs.writeFileSync(mdReportPath, mdReport);
  console.log(`📝 Markdown report saved to: ${mdReportPath}`);

  // Exit with appropriate code
  process.exit(stats.totalFailed === 0 ? 0 : 1);
}

main();
