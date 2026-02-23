# Architecture & Code Quality Refactoring Guide

## Current State Analysis

### 🔴 Issues Identified

1. **Architectural Issues**
   - No clear separation of concerns
   - Functions bound to global scope
   - No dependency injection
   - State management scattered across `window` globals
   - Duplicate logic between modules

2. **Code Quality Issues**
   - Callbacks instead of Promises/async-await
   - Direct innerHTML usage (XSS risks)
   - Inline JavaScript code in strings
   - No error boundaries
   - No logging/debugging strategy
   - Security risks with Content Security Policy

3. **Maintainability Issues**
   - Hard to test (global dependencies)
   - No clear API contracts
   - Inconsistent module exports
   - No layer abstraction

4. **Scalability Issues**
   - Cannot easily add new features
   - Message passing is ad-hoc
   - No validator/schema for messages
   - Storage operations scattered

## Proposed Architecture

### 1. **Modular Layer Architecture**

```
┌─────────────────────────────────────────────┐
│           UI Layer (Presentation)           │
│  popup.js (Components) + popup-controller.js│
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│          Application Layer                  │
│  Services (CSV, Mapping, Table Fill)        │
│  Use Cases / Application Logic              │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│          Domain Layer                       │
│  Entities (CSVData, Mapping, TableInfo)     │
│  Validation & Business Logic                │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│        Infrastructure Layer                 │
│  Storage, MessageBus, Logger                │
└────────────────────────────────────────────┘
```

### 2. **File Structure**

```
src/
├── core/                          # Core domain logic
│   ├── csv/
│   │   ├── CsvParser.js          # CSV parsing logic
│   │   ├── CsvData.js            # CSV data entity
│   │   └── csv-parser.test.js
│   ├── mapping/
│   │   ├── Mapping.js            # Mapping entity & logic
│   │   ├── MappingService.js     # Mapping operations
│   │   └── mapping.test.js
│   └── table/
│       ├── Table.js              # Table entity
│       ├── TableFiller.js        # Table filling logic
│       └── table-handler.test.js
│
├── application/                   # Application services
│   ├── FillFormUseCase.js        # Use case: fill form with CSV
│   ├── ConfigureMappingUseCase.js
│   └── application.integration.test.js
│
├── infrastructure/                # Technical services
│   ├── storage/
│   │   ├── StorageRepository.js  # Storage abstraction
│   │   └── storage.test.js
│   ├── messaging/
│   │   ├── MessageBus.js         # Event/message system
│   │   ├── MessageSchema.js      # Validation schemas
│   │   └── messaging.test.js
│   ├── logger/
│   │   └── Logger.js
│   └── config/
│       └── config.js
│
├── background/
│   ├── background.js              # Background script entry
│   └── ContentScriptManager.js    # Manage content scripts
│
├── content/
│   ├── content-script.js          # Content script entry
│   └── PageAnalyzer.js            # Page DOM analysis
│
└── popup/
    ├── popup.js                   # Popup entry
    ├── PopupController.js         # Controller/presenter
    └── components/
        ├── CsvUploader.js         # Component: CSV upload
        ├── MappingConfigurator.js # Component: mapping UI
        └── TableSelector.js       # Component: table selection
```

## Proposed Improvements

### 1. **Convert to Promises/Async-Await**

**Before:**
```javascript
browser.storage.local.get(['csvMapping'], (result) => {
    if (!result.csvMapping) {
        browser.storage.local.set({ csvMapping: {} }, () => {
            sendResponse({ success: true });
        });
    }
});
```

**After:**
```javascript
class StorageRepository {
    async getMappingConfig() {
        return browser.storage.local.get('csvMapping');
    }
    
    async saveMappingConfig(mapping) {
        await browser.storage.local.set({ csvMapping: mapping });
        return { success: true };
    }
}
```

### 2. **Introduce Service Layer**

```javascript
// services/CSVService.js
export class CSVService {
    async loadAndParseCSV(file) {
        const text = await file.text();
        return CsvParser.parse(text);
    }
    
    async validateCSVData(csvData) {
        return CsvValidator.validate(csvData);
    }
}

// Usage in popup-controller.js
class PopupController {
    constructor(csvService, mappingService, storageRepository) {
        this.csvService = csvService;
        this.mappingService = mappingService;
        this.storage = storageRepository;
    }
    
    async handleCSVUpload(file) {
        const csvData = await this.csvService.loadAndParseCSV(file);
        await this.csvService.validateCSVData(csvData);
        // ...
    }
}
```

### 3. **Create Domain Entities**

```javascript
// core/csv/CsvData.js
export class CsvData {
    constructor(headers, rows) {
        this.headers = headers;
        this.rows = rows;
        this.validate();
    }
    
    validate() {
        if (!this.headers || this.headers.length === 0) {
            throw new Error('CSV must have headers');
        }
        // ... more validation
    }
    
    getRow(index) {
        if (index < 0 || index >= this.rows.length) {
            throw new Error(`Row ${index} out of bounds`);
        }
        return this.rows[index];
    }
    
    getRowCount() {
        return this.rows.length;
    }
}

// core/mapping/Mapping.js
export class Mapping {
    constructor(csvHeaders, mappingConfig) {
        this.csvHeaders = csvHeaders;
        this.config = mappingConfig;
        this.validate();
    }
    
    applyToRow(row) {
        const result = {};
        Object.entries(this.config).forEach(([csvIndex, fieldName]) => {
            result[fieldName] = row[parseInt(csvIndex)] || '';
        });
        return result;
    }
    
    validate() {
        // Validation logic
    }
}
```

### 4. **Message Bus for Communication**

```javascript
// infrastructure/messaging/MessageBus.js
export class MessageBus {
    constructor() {
        this.handlers = new Map();
    }
    
    register(messageType, handler) {
        if (!this.handlers.has(messageType)) {
            this.handlers.set(messageType, []);
        }
        this.handlers.get(messageType).push(handler);
    }
    
    async emit(message) {
        const { type, ...data } = message;
        const handlers = this.handlers.get(type) || [];
        
        const results = await Promise.all(
            handlers.map(handler => handler(data))
        );
        
        return results;
    }
}

// Usage
messageBus.register('FILL_TABLE_REQUESTED', async (data) => {
    const { tableIndex, mapping, csvRow } = data;
    return tableFillService.fillTable(tableIndex, mapping, csvRow);
});
```

### 5. **Use Cases (Business Logic)**

```javascript
// application/FillFormUseCase.js
export class FillFormUseCase {
    constructor(tableService, csvRepository, mappingRepository, storagRepository) {
        this.tableService = tableService;
        this.csvRepository = csvRepository;
        this.mappingRepository = mappingRepository;
        this.storage = storageRepository;
    }
    
    async execute(command) {
        const { tableIndex, csvRowIndex } = command;
        
        // Get data
        const csvData = await this.csvRepository.get();
        const mapping = await this.mappingRepository.get();
        
        // Apply business logic
        const row = csvData.getRow(csvRowIndex);
        const mappedData = this.applyMapping(row, mapping);
        
        // Execute
        return this.tableService.filFilledCount > 0) {
            await this.storage.logFill({
                timestamp: new Date(),
                tableIndex,
                rowIndex: csvRowIndex,
                fieldsFilled: result.filledCount
            });
        }
        
        return result;
    }
    
    applyMapping(row, mapping) {
        return mapping.applyToRow(row);
    }
}
```

### 6. **Dependency Injection Container**

```javascript
// infrastructure/Container.js
export class Container {
    constructor() {
        this.services = new Map();
    }
    
    register(name, factory) {
        this.services.set(name, factory);
    }
    
    get(name) {
        const factory = this.services.get(name);
        if (!factory) throw new Error(`Service ${name} not found`);
        return factory(this);
    }
}

// bootstrap.js (called once on extension load)
const container = new Container();

container.register('logger', () => new Logger());
container.register('storage', () => new StorageRepository());
container.register('messageBus', () => new MessageBus());
container.register('csvService', (c) => new CSVService(c.get('logger')));
container.register('fillFormUseCase', (c) => 
    new FillFormUseCase(
        c.get('tableService'),
        c.get('csvRepository'),
        c.get('mappingRepository'),
        c.get('storage')
    )
);

export default container;
```

### 7. **Error Handling & Logging**

```javascript
// infrastructure/logger/Logger.js
export class Logger {
    debug(message, data) {
        console.debug(`[DEBUG] ${message}`, data);
    }
    
    error(message, error) {
        console.error(`[ERROR] ${message}`, error);
    }
    
    info(message, data) {
        console.info(`[INFO] ${message}`, data);
    }
}

// infrastructure/errors/AppError.js
export class AppError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}

// Usage
try {
    await csvService.load(file);
} catch (error) {
    logger.error('Failed to load CSV', error);
    if (error instanceof AppError) {
        showUserError(error.message);
    }
}
```

### 8. **Component-Based UI**

```javascript
// popup/components/CsvUploader.js
export class CsvUploader {
    constructor(container) {
        this.container = container;
        this.element = document.getElementById('csv-file');
    }
    
    async init() {
        this.element.addEventListener('change', (e) => this.handleUpload(e));
    }
    
    async handleUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const csvService = this.container.get('csvService');
            const csvData = await csvService.loadAndParseCSV(file);
            this.emit('csv:loaded', { csvData });
        } catch (error) {
            this.emit('error', { error });
        }
    }
    
    emit(eventType, data) {
        // Emit to parent/controller
        document.dispatchEvent(
            new CustomEvent(eventType, { detail: data })
        );
    }
}

// popup/PopupController.js
export class PopupController {
    constructor(container) {
        this.container = container;
        this.logger = container.get('logger');
    }
    
    async init() {
        const uploader = new CsvUploader(this.container);
        await uploader.init();
        
        document.addEventListener('csv:loaded', (e) => 
            this.handleCSVLoaded(e.detail.csvData)
        );
    }
    
    async handleCSVLoaded(csvData) {
        this.logger.info('CSV loaded', { cols: csvData.headers.length });
        // Update UI
    }
}
```

## Migration Path (Phased Approach)

### Phase 1: Foundation (Current Sprint)
- [ ] Create Container & DI setup
- [ ] Create Logger & Error handling
- [ ] Create StorageRepository wrapper
- [ ] Create MessageBus

### Phase 2: Domain Layer (Next Sprint)
- [ ] Extract CsvData entity
- [ ] Extract Mapping entity
- [ ] Create validators
- [ ] Add domain tests

### Phase 3: Application Layer
- [ ] Create use cases
- [ ] Create application services
- [ ] Add integration tests

### Phase 4: UI Layer Refactor
- [ ] Create components
- [ ] Create PopupController
- [ ] Replace inline JavaScript
- [ ] Add e2e tests

### Phase 5: Cleanup
- [ ] Remove legacy code paths
- [ ] Optimize bundle size
- [ ] Add documentation

## Quick Wins (Implement Immediately)

### 1. Safe DOM Updates (XSS Prevention)
```javascript
// Before
container.innerHTML = html;

// After
function safeSetHTML(element, htmlString) {
    const temp = document.createElement('div');
    temp.textContent = htmlString; // XSS safe
    element.innerHTML = temp.innerHTML;
}
// Or use template + createElement
```

### 2. Message Schema Validation
```javascript
// infrastructure/messaging/MessageSchema.js
export const MESSAGE_SCHEMAS = {
    'FILL_TABLE_REQUESTED': {
        tableIndex: 'number',
        mapping: 'object',
        csvRow: 'object'
    }
};

export function validateMessage(message) {
    const schema = MESSAGE_SCHEMAS[message.type];
    if (!schema) throw new Error(`Unknown message type: ${message.type}`);
    // Validate against schema
}
```

### 3. Configuration Centralization
```javascript
// infrastructure/config/config.js
export const CONFIG = {
    STORAGE_KEYS: {
        MAPPING: 'csvMapping',
        CSV_HISTORY: 'csvHistory',
        SETTINGS: 'settings'
    },
    TIMEOUTS: {
        FILE_LOAD: 5000,
        CONTENT_SCRIPT: 3000
    },
    Limits: {
        MAX_CSV_SIZE: 5 * 1024 * 1024, // 5MB
        MAX_ROWS: 10000
    },
    LOG_LEVEL: 'info' // debug, info, warn, error
};
```

## Benefits of New Architecture

✅ **Testability**: Dependency injection makes testing easy
✅ **Maintainability**: Clear separation of concerns
✅ **Scalability**: Easy to add new features
✅ **Reusability**: Services can be used from multiple contexts
✅ **Security**: Centralized validation & error handling
✅ **Performance**: Can optimize specific layers
✅ **Documentation**: Architecture is self-documenting
✅ **Debugging**: Logger and error handling for visibility

## Best Practices for WebExtensions

1. **CSP Compliance**: No inline scripts
2. **Message Validation**: Always validate incoming messages
3. **Graceful Degradation**: Work without certain APIs
4. **Resource Cleanup**: Clean up listeners on extension unload
5. **Version Management**: Handle upgrades properly
6. **Performance**: Content scripts should be lightweight
