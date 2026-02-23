# CSV to Table Filler - Firefox Add-on

A Firefox extension that automates filling HTML tables and forms using CSV files, with intelligent column mapping and persistent configuration.

## 📋 Features

- **CSV Import**: Load CSV files directly from the browser
- **Smart Column Mapping**: Map CSV columns to HTML form fields with an intuitive UI
- **Auto-Fill**: Automatically populate tables and forms with CSV data
- **Persistent Configs**: Save and reuse mapping configurations
- **Batch Processing**: Fill multiple rows sequentially
- **Error Handling**: Clear error messages and validation

## 📦 Installation

### For Development
```bash
# Clone the repository
git clone https://github.com/sbonoc/firefox-addon-csv-to-table-filler.git
cd firefox-addon-csv-to-table-filler

# Install dependencies
npm install

# Run the extension in Firefox
npm start

# Or build for distribution
npm run build
```

### For Users
1. Download the `.xpi` file from releases
2. Open Firefox and go to `about:addons`
3. Click "Install Add-on from File" and select the `.xpi`

## 🚀 Usage

### Basic Workflow

1. **Open a webpage** with tables or forms you want to fill
2. **Click the extension icon** in Firefox toolbar
3. **Upload a CSV file** from your computer
4. **Configure mapping**: Drag CSV columns to form fields
5. **Click "Fill"**: The extension matches CSV data to form fields
6. **Save mapping** for future use on the same website

### Example CSV Format
```csv
FirstName,LastName,Email,Department
John,Doe,john@example.com,Engineering
Jane,Smith,jane@example.com,Sales
Bob,Johnson,bob@example.com,Marketing
```

## 🏗️ Architecture

The project follows **Clean Architecture** with 3 implemented layers:

```
┌───────────────────────────────────────────┐
│  PRESENTATION LAYER (User Interface)      │
│  • Popup UI (src/presentation/popup/)    │
│  • Background script (messaging hub)     │
│  • Content script (page integration)     │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   DOMAIN LAYER (Business Logic)          │
│  • csv-parser.js (CSV parsing)           │
│  • mapping.js (column mapping config)   │
│  • table-handler.js (field operations)  │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│ INFRASTRUCTURE LAYER (Technical Services)│
│  • Config (centralized constants)       │
│  • Logger (structured logging)          │
│  • Errors (typed error hierarchy)       │
│  • Storage (browser.storage abstraction)│
│  • MessageBus (event system)            │
│  • Container (dependency injection)     │
└──────────────────────────────────────────┘
```

### Key Design Patterns

- **Dependency Injection**: Auto-injected services via IoC Container
- **Event-Driven**: MessageBus for decoupled communication
- **Error Handling**: Typed errors (CSVError, MappingError, etc)
- **Logging**: Structured context-aware logging
- **Repository Pattern**: StorageRepository abstracts browser.storage
- **Test Pyramid (latest run)**: 81% unit, 8% integration, 10% E2E

## 📂 Project Structure

```
src/
├── infrastructure/          # Technical services (DI, logging, storage, etc)
│   ├── config.js           # Configuration & constants
│   ├── logger.js           # Structured logging system
│   ├── errors.js           # Error class hierarchy
│   ├── storage.js          # browser.storage abstraction
│   ├── message-bus.js      # Event system with middleware & priority
│   ├── container.js        # Dependency Injection / IoC Container
│   └── index.js            # Barrel exports
│
├── domain/                  # Business logic & entities
│   ├── csv-parser.js       # CSV parsing and validation
│   ├── mapping.js          # Column mapping configuration
│   └── table-handler.js    # HTML form field extraction & filling
│
└── presentation/            # User interface & messaging layer
    ├── popup/              # Popup UI component
    │   ├── popup.html      # Popup UI markup
    │   ├── popup.css       # Popup styling
    │   └── popup.js        # Popup logic with service integration
    ├── background.js       # Background script (persistence & messaging)
    └── content-script.js   # Content script (webpage integration)

tests/
├── unit/                   # Unit tests segregated by module
│   ├── csv-parser.test.js
│   ├── mapping.test.js
│   ├── table-handler.test.js
│   └── infrastructure/
│      ├── container.test.js
│      ├── infrastructure.test.js
│      ├── message-bus.test.js
│      └── storage.test.js
│
├── integration/            # Integration tests for workflows
│   └── workflow.integration.test.js
│
├── e2e/                    # End-to-end tests with Playwright
│   └── addon.spec.js
│
├── mocks/                  # Mock objects for testing
│   └── browser.js          # WebExtensions API mocks
│
└── setup.js                # Global test setup

.github/
└── workflows/
    └── build-and-release.yml  # GitHub Actions CI/CD

vitest.config.js           # Unit & integration test configuration
playwright.config.js       # E2E test configuration
manifest.json              # Firefox extension manifest
package.json               # Dependencies and scripts
```

## 🧪 Testing

The project uses a **Test Pyramid** approach with clear separation:

- **Unit Tests** (81%): Tests in `tests/unit/` covering individual functions with fast feedback
- **Integration Tests** (8%): Tests in `tests/integration/` covering module interactions and workflows  
- **E2E Tests** (10%): Tests in `tests/e2e/` covering complete user journeys with Playwright + Firefox

**Current Test Inventory:** 143 automated tests (116 unit, 12 integration, 15 E2E)

### Run Tests

```bash
# Fast unit tests (recommended during development)
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests with Playwright and Firefox
npm run test:e2e

# All tests with consolidated report
npm run test:all

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Coverage

Current targets:
- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

## 🔧 Development

### Project Scripts

```bash
npm start           # Run extension in Firefox
npm run build       # Build for distribution
npm run lint        # Lint with web-ext
npm run test        # Run all tests
npm run test:watch  # Watch mode
```

### Code Quality

The codebase follows:
- **Clean Architecture**: Clear separation of concerns
- **SOLID Principles**: Single Responsibility, Open/Closed, etc.
- **Dependency Injection**: Services injected, not created
- **Error Handling**: Structured error hierarchy
- **Logging**: Centralized, context-aware logging
- **Testing**: Test-driven development approach

### Technologies Used

- **Vitest**: Unit testing framework
- **Happy-DOM**: DOM simulation for unit tests
- **Playwright**: E2E testing with Firefox
- **WebExtensions API**: Firefox add-on development
- **ES6+ Modules**: Modern JavaScript

## 🛠️ How It Works

### CSV to Table Filling Flow

```
User uploads CSV file
    ↓
parseCSV() → parse & validate CSV content
    ↓
validateCSVData() → check row counts, columns
    ↓
User maps CSV columns to form fields
    ↓
createMapping() → create mapping config
    ↓
StorageRepository.saveMappingConfig() → save mapping
    ↓
User clicks "Fill Table" button
    ↓
MessageBus.emit('fillTable') → send to content script
    ↓
getTableFields() → extract form fields from DOM
    ↓
fillFields() → write CSV values to form fields
    ↓
browser.tabs.sendMessage() → report success to popup
    ↓
Form updated, user sees success message
```

### Function Architecture

The extension uses domain functions instead of service classes:

| Function | Module | Purpose |
|----------|--------|---------|
| `parseCSV(content)` | csv-parser.js | Parse raw CSV text into headers & rows |
| `validateCSVData(data)` | csv-parser.js | Validate CSV against size/row/column limits |
| `createMapping(headers, config)` | mapping.js | Create validated mapping config |
| `getTableFields(element)` | table-handler.js | Extract form fields from HTML |
| `fillFields(fields, rowData)` | table-handler.js | Fill form fields with data |

### Message Flow Architecture

The extension communicates via an event-driven architecture:

1. **Popup Layer**: User uploads CSV and configures mapping
2. **Background Layer**: Receives fill request via `MessageBus.emit()`
3. **Content Layer**: Receives message via `browser.tabs.sendMessage()`
4. **DOM Update**: `fillFields()` updates form elements
5. **Response**: Content script sends back success/error to popup

All messages are validated through typed error handling and logged for debugging.

## 🔐 Security & Privacy

- ✅ No data sent to external servers
- ✅ All processing happens locally in your browser
- ✅ CSV data never persisted (mappings only)
- ✅ Respects browser storage limits
- ✅ No tracking or analytics
- ✅ Open source for transparency

## 🐛 Error Handling

The extension provides typed, actionable error messages:

| Error Type | When Thrown | Resolution |
|-----------|-----------|-----------|
| `CSVError` | Invalid CSV format, exceeds size/row/column limits | Check CSV file format and size |
| `MappingError` | Invalid column mapping configuration | Verify column indices and field names match |
| `TableNotFoundError` | Target table/form not found on page | Check page structure, ensure form exists |
| `StorageError` | Failed to save/load configuration | Check browser storage permissions |
| `TimeoutError` | Operation exceeded time limit | Reduce CSV size, check browser performance |

All errors include context logging for debugging and user-friendly messages in the UI.

## 📝 Configuration

Configuration is centralized in `src/infrastructure/config.js`:

```javascript
CONFIG.STORAGE_KEYS = {
    MAPPING: 'csvMapping',
    CSV_HISTORY: 'csvHistory',
    APP_SETTINGS: 'appSettings'
}

CONFIG.LIMITS = {
    MAX_CSV_SIZE: 10 * 1024 * 1024,      // 10MB
    MAX_CSV_ROWS: 50000,
    MAX_CSV_COLUMNS: 500
}

CONFIG.TIMEOUTS = {
    CONTENT_SCRIPT_RESPONSE: 5000,
    FILE_LOAD: 10000
}
```

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Commit with clear messages (`git commit -m 'feat: add amazing feature'`)
5. Push to your fork (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines

- Write tests for all new features
- Follow the existing code style
- Keep commits focused and atomic
- Update documentation as needed
- Run `npm run test` before submitting PR

## 📋 Browser Compatibility

- ✅ Firefox 90+
- ❌ Chrome/Edge (not tested, uses Firefox-specific APIs)
- ❌ Safari (not supported)

## 📄 License

MIT License - see LICENSE file for details

## 🚀 Continuous Integration & Deployment

The project includes **automated GitHub Actions** that:

### Automatic Testing & Building
- Runs on every push to `main` and `develop` branches
- Tests on multiple Node.js versions (18.x, 20.x)
- **Unit tests** (81%): 116 tests for individual functions
- **Integration tests** (8%): 12 tests for module interactions  
- **E2E tests** (10%): 15 tests for complete user workflows in real Firefox browser

### Test Report with Test Pyramid

After each workflow run, the job summary displays a detailed table:

| Type | Total | ✅ Passed | ❌ Failed | ⏭️ Skipped | ⏱️ Duration |
|------|-------|----------|----------|-----------|-----------|
| 🏗️ Unit | 116 | 116 | 0 | 0 | ~0.07s |
| 📦 Integration | 12 | 12 | 0 | 0 | ~0.01s |
| 🎯 E2E | 15 | 15 | 0 | 0 | ~10.00s |
- Pass/fail/skip statistics  
- Execution time per test type
- Success rate and total duration

### Artifacts & Downloads

After each workflow run:
- **Built `.xpi` file**: Ready to install in Firefox
- **Test reports**: JSON and Markdown formats
- **Artifacts retained** for 90 days on GitHub Actions

### Creating Releases

To release a new version:

```bash
# Tag the release (semantic versioning: v1.0.0)
git tag v1.0.0

# Push the tag
git push origin v1.0.0
```

This automatically:
1. Runs full test suite
2. Builds the Firefox extension
3. Creates a GitHub Release page
4. Uploads `.xpi` file for download
5. Generates installation instructions

### Local Testing

Before pushing, run tests locally:

```bash
# Unit tests only (fast feedback)
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires Playwright & Firefox)
npm run test:e2e

# All tests with detailed report
npm run test:all

# Watch mode (re-run on file changes)
npm run test:watch
```

### Branch Protection (Optional)

To enforce quality gates, enable branch protection in GitHub Settings:
- Require status checks to pass
- Require branches to be up to date before merge
- Prevents any code merge without passing tests

## 🚀 Roadmap

Current version: **1.0.0**

### Planned Features
- [ ] Support for multiple CSV rows per form
- [ ] Regular expression column matching
- [ ] Import mapping configurations from file
- [ ] Batch processing with progress bar
- [ ] Support for more field types (date, checkbox, radio)
- [ ] Localization (i18n support)

## 🐛 Known Issues

None currently. Please report bugs via GitHub Issues.

## 💬 Support

### Documentation
- Check the issue tracker for common questions
- Review test files for usage examples
- Check error messages for troubleshooting

### Reporting Issues
Please include:
1. What you were trying to do
2. What happened instead
3. The CSV file (sanitized if sensitive)
4. Browser console errors (F12 → Console tab)
5. Extension logs (visible in devtools)

## 📊 Project Stats

- **Lines of Code**: ~2,000 (core logic)
- **Test Coverage**: 80%+ 
- **Testing**: 143 automated tests (116 unit + 12 integration + 15 E2E)
- **Documentation**: Comprehensive inline comments
- **Performance**: < 500ms for typical operations

## 🎓 Learning Resources

This project is a good example of:
- Clean Architecture in JavaScript
- Dependency Injection patterns
- Event-driven programming
- WebExtensions API usage
- Professional testing practices
- Error handling best practices

## 📞 Contact

For questions or suggestions:
- Open a GitHub Issue
- Check existing discussions
- Review the inline code comments

---

**Made with ❤️ for automating tedious tasks**

Last updated: February 2026
