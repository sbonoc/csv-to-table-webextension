# Testing Strategy

This document outlines the testing approach for the CSV to Table Filler Firefox add-on, following the **Test Pyramid** and **Shift Left Test Automation** principles.

## Test Pyramid Architecture

```
         /\
        /  \
       /E2E \       2-3 tests (Critical user journeys only)
      /______\
     /        \
    /Integr.  \     5-10 tests (Module interactions)
   /          \
  /____________\
 /              \
/ Unit Tests    \  50+ tests (Individual functions, no duplicates)
/________________\
```

### Test Distribution

- **Unit Tests (~70%)**: Test individual functions in isolation
- **Integration Tests (~20%)**: Test module interactions
- **E2E Tests (~10%)**: Test complete user workflows in browser

## Shift Left Principle: No Test Duplication

Each test is written at the **lowest appropriate level**:

### ✅ What's tested in Unit Tests Only
- CSV parsing and validation logic
- Column mapping calculations
- DOM field manipulation (setFieldValue, getFieldValue)
- Error handling for invalid inputs

**Example**: `csv-parser.test.js` tests all CSV parsing edge cases. These cases are NOT tested again in integration or E2E tests.

### ✅ What's tested in Integration Tests Only
- CSV parsing + mapping workflow
- Applying mapping to multiple rows
- Mapping + table filling together
- Multi-step workflows that require multiple modules

**Example**: `workflow.integration.test.js` tests "CSV → Parse → Map → Fill" as one workflow, NOT as separate tests for each step.

### ✅ What's tested in E2E Tests
- Complete user journeys (popup open → upload CSV → configure mapping → fill form)
- Real browser environment interactions
- Extension UI behavior
- Critical happy path and error scenarios

## Running Tests

```bash
# Run all unit tests (fast feedback)
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests with Playwright
npm run test:e2e

# Run all tests
npm run test:all

# Run with coverage
npm run test:coverage
```

## Test Files Organization

```
src/
├── csv-parser.js          # Core CSV parsing logic
├── csv-parser.test.js     # ✅ Unit tests (30+ tests)
├── mapping.js             # Column-to-field mapping
├── mapping.test.js        # ✅ Unit tests (20+ tests)
├── table-handler.js       # DOM manipulation
├── table-handler.test.js  # ✅ Unit tests (20+ tests)
├── background.js
├── content-script.js

tests/
├── mocks/
│   └── browser.js         # WebExtensions API mocks
├── setup.js               # Global test setup
├── integration/
│   └── workflow.integration.test.js  # ✅ Integration tests (10+ tests)
└── e2e/
    └── addon.spec.js      # ✅ E2E tests (5-10 tests)

vitest.config.js          # Unit + Integration config
playwright.config.js      # E2E config
```

## Key Testing Patterns

### 1. Unit Test: Pure Functions

```javascript
// ✅ Testable: Pure function with no dependencies
function parseCSV(csvContent) {
  // ... implementation
  return { headers, rows };
}

describe('parseCSV', () => {
  it('should parse valid CSV', () => {
    const result = parseCSV('Name,Email\nJohn,john@example.com');
    expect(result.rows).toHaveLength(1);
  });
});
```

### 2. Integration Test: Module Interactions

```javascript
// ✅ Integration: Testing CSV + Mapping together
it('should parse CSV and apply mapping to first row', () => {
  const parsed = parseCSV(csvContent);
  const mapping = createMapping(parsed.headers, { '0': 'name' });
  const result = applyMappingToRow(parsed.rows[0], mapping);
  
  expect(result.name).toBe('John');
});
```

### 3. E2E Test: Complete User Journey

```javascript
// ✅ E2E: Full workflow in actual browser
test('user can fill form with CSV data', async ({ page }) => {
  // 1. Navigate to page with form
  // 2. Upload CSV via extension popup
  // 3. Configure mapping
  // 4. Verify form is filled
  // NOT testing individual steps (csv parsing, mapping) - those are unit tests
});
```

## Mocking Strategy

### WebExtensions API Mocks

All WebExtensions APIs are mocked at the global level in `tests/setup.js`:

```javascript
global.browser = createBrowserMock();
```

This allows **unit tests to run without Firefox**, making them fast and CI-friendly.

### What's Mocked
- `browser.storage.local.get()` / `.set()` / `.remove()`
- `browser.tabs.query()` / `.executeScript()`
- `browser.runtime.onMessage` listeners
- `browser.runtime.onInstalled` listeners

### What's NOT Mocked (for integration tests)
- DOM APIs (querySelector, addEventListener, etc.)
- Event dispatching
- Local storage simulation

## Coverage Goals

Current targets (**can be adjusted**):
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

Run with: `npm run test:coverage`

## Continuous Improvement

### When to Move a Test

1. **From E2E to Integration**: If an E2E test is ONLY testing module interactions without real browser features
   - Move to integration, keep E2E for critical path only

2. **From Integration to Unit**: If an integration test is ONLY testing one module's logic
   - Move to unit test, remove from integration

3. **From Unit to Nothing**: If a unit test exactly duplicates another unit test scenario
   - Delete and keep other

## Best Practices

1. ✅ **Each test tests ONE thing** (single responsibility)
2. ✅ **No test duplication** across levels
3. ✅ **Fast unit tests first** (Shift Left)
4. ✅ **Descriptive test names** explaining the scenario
5. ✅ **Arrange-Act-Assert** pattern for clarity
6. ✅ **Mock external dependencies** (APIs, storage)
7. ✅ **Test error cases** at the lowest possible level
8. ❌ **No testing implementation details** - test behavior
9. ❌ **No hard sleeps/timeouts** in unit tests
10. ❌ **No duplicate assertions** across test levels

## Adding New Features

When adding a new feature:

1. **Write Unit Tests First** (TDD approach)
   - Test the function in isolation
   - Mock all external dependencies
   - Test happy path + error cases

2. **Then write Integration Tests** (if feature requires multiple modules)
   - Test how modules work together
   - Don't duplicate unit test scenarios

3. **Finally add E2E Tests** (if it's part of critical user journey)
   - Test in real browser
   - Test from user perspective
   - Not duplicating steps tested in unit/integration

This ensures **fast feedback** and **no test duplication**.
