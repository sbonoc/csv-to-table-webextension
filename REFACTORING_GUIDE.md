# Refactoring Guide - Step by Step

This guide shows how to refactor existing code to use the new architecture without breaking functionality.

## Principle: Gradual Refactoring

Each step:
1. ✅ Keeps existing code working
2. ✅ Adds new infrastructure code
3. ✅ Gradually replaces old code
4. ✅ Maintains all tests passing
5. ✅ Can be deployed incrementally

## Step 1: Replace Callbacks with Promises

### Before (callback-based)
```javascript
// src/background.js
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveMappingConfig') {
        browser.storage.local.set({
            csvMapping: request.data.mapping,
            lastMapDate: new Date().toISOString()
        }, () => {
            sendResponse({ success: true });
        });
        return true;
    }
});
```

### After (promise-based with infrastructure)
```javascript
// src/background.js
import { globalContainer } from './infrastructure/index.js';

const storage = globalContainer.get('storage');
const messageBus = globalContainer.get('messageBus');
const logger = globalContainer.get('logger').createChild('Background');

// Register message handlers
messageBus.register('SAVE_MAPPING_CONFIG', async (message) => {
    const { mapping } = message.data;
    
    try {
        await storage.saveMappingConfig(mapping);
        logger.info('Mapping saved', { keys: Object.keys(mapping) });
        return { success: true };
    } catch (error) {
        logger.error('Failed to save mapping', error);
        return { success: false, error: error.message };
    }
});

// Listen for browser messages and forward to MessageBus
browser.runtime.onMessage.addListener(async (request, sender) => {
    try {
        const result = await messageBus.request({
            type: request.action,
            data: request.data,
            sender
        });
        return result;
    } catch (error) {
        logger.error('Message handling failed', error);
        return { success: false, error: error.message };
    }
});
```

## Step 2: Create Service Wrappers

### Before (logic mixed with UI)
```javascript
// popup/popup.js
document.getElementById('csv-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const rows = text.split('\n').filter(line => line.trim());
        
        window.csvData = {
            headers: rows[0].split(',').map(h => h.trim()),
            rows: rows.slice(1).map(row => row.split(',').map(val => val.trim()))
        };

        renderMappingUi();
        showStatus(`CSV loaded: ${window.csvData.headers.length} columns`, 'success');
    } catch (error) {
        showStatus(`Error reading file: ${error.message}`, 'error');
    }
});
```

### After (with service layer)
```javascript
// src/application/CSVService.js
import { parseCSV } from '../csv-parser.js';
import { CSVError } from '../infrastructure/errors.js';
import { Logger } from '../infrastructure/logger.js';

export class CSVService {
    constructor(logger = null) {
        this.logger = logger || new Logger('CSVService');
    }

    async loadAndParseCSV(file) {
        if (!file) {
            throw new CSVError('No file provided');
        }

        try {
            const text = await file.text();
            const { headers, rows } = parseCSV(text);
            
            this.logger.info('CSV loaded', { columns: headers.length, rows: rows.length });
            
            return { headers, rows };
        } catch (error) {
            this.logger.error('Failed to load CSV', error);
            if (error instanceof CSVError) throw error;
            throw new CSVError(`Failed to load CSV: ${error.message}`);
        }
    }
}

// popup/PopupController.js (new)
import { CSVService } from '../application/CSVService.js';
import { getUserErrorMessage } from '../infrastructure/index.js';

export class PopupController {
    constructor(container, ui) {
        this.container = container;
        this.ui = ui;
        this.csvService = container.get('csvService');
        this.logger = container.get('logger').createChild('PopupController');
        this.csvData = null;
    }

    async handleCSVUpload(file) {
        try {
            this.ui.showLoading('Uploading CSV...');
            
            const csvData = await this.csvService.loadAndParseCSV(file);
            this.csvData = csvData;
            
            this.ui.renderMappingUI(csvData.headers);
            this.ui.showStatus(`CSV loaded: ${csvData.headers.length} columns`, 'success');
            
            this.logger.info('CSV uploaded successfully', { columns: csvData.headers.length });
        } catch (error) {
            this.logger.error('CSV upload failed', error);
            this.ui.showStatus(getUserErrorMessage(error), 'error');
        }
    }
}

// popup/popup.js (refactored)
import { globalContainer } from '../infrastructure/index.js';
import { PopupController } from './PopupController.js';

// Initialize container and services
globalContainer.initializeDefaultServices();
globalContainer.register('csvService', (c) => new CSVService(c.get('logger')));

// Create UI adapter
const ui = {
    showLoading: (msg) => { /* ... */ },
    renderMappingUI: (headers) => { /* ... */ },
    showStatus: (msg, type) => { /* ... */ }
};

// Create controller
const controller = new PopupController(globalContainer, ui);

// Wire up event listeners (simplified)
document.getElementById('csv-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) controller.handleCSVUpload(file);
});
```

## Step 3: Replace Global State with Services

### Before (globals)
```javascript
// popup.js
window.csvData = { headers: [], rows: [] };
window.tableFields = [];

function showStatus(message, type = 'info', duration = 3000) {
    // Direct DOM manipulation
}

function renderMappingUi() {
    // Uses window.csvData global
}
```

### After (service-based)
```javascript
// src/application/PopupState.js
export class PopupState {
    constructor() {
        this.csvData = null;
        this.tableFields = [];
        this.mapping = {};
        this.listeners = [];
    }

    setCSVData(data) {
        this.csvData = data;
        this.notify('csvDataChanged', data);
    }

    setTableFields(fields) {
        this.tableFields = fields;
        this.notify('tableFieldsChanged', fields);
    }

    setMapping(mapping) {
        this.mapping = mapping;
        this.notify('mappingChanged', mapping);
    }

    subscribe(event, callback) {
        this.listeners.push({ event, callback });
    }

    notify(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => l.callback(data));
    }
}

// popup/PopupUI.js (new)
export class PopupUI {
    constructor(state) {
        this.state = state;
        this.elements = {
            statusMessage: document.getElementById('status-message'),
            mappingContainer: document.getElementById('mapping-container'),
            // ... other elements
        };
        this.setupSubscriptions();
    }

    setupSubscriptions() {
        this.state.subscribe('csvDataChanged', (data) => {
            this.renderMappingUI(data.headers);
        });

        this.state.subscribe('mappingChanged', (mapping) => {
            this.updateMappingUI(mapping);
        });
    }

    showStatus(message, type = 'info', duration = 3000) {
        const el = this.elements.statusMessage;
        el.textContent = message;
        el.className = `status-message show ${type}`;
        
        if (duration > 0) {
            setTimeout(() => el.classList.remove('show'), duration);
        }
    }

    renderMappingUI(headers) {
        const container = this.elements.mappingContainer;
        const html = headers.map((header, idx) => `
            <div class="mapping-row">
                <label>${header}:</label>
                <select data-csv-column="${idx}">
                    <option value="">-- Select target field --</option>
                </select>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
}

// popup.js (simplified)
import { PopupUI } from './PopupUI.js';
import { PopupController } from './PopupController.js';
import { PopupState } from '../application/PopupState.js';
import { globalContainer } from '../infrastructure/index.js';

globalContainer.initializeDefaultServices();

const state = new PopupState();
const ui = new PopupUI(state);
const controller = new PopupController(globalContainer, state, ui);

document.getElementById('csv-file').addEventListener('change', (e) => {
    controller.handleCSVUpload(e.target.files[0]);
});
```

## Step 4: Extract Domain Entities

### Before (plain objects)
```javascript
// popup.js
window.csvData = {
    headers: rows[0].split(',').map(h => h.trim()),
    rows: rows.slice(1).map(row => row.split(',').map(val => val.trim()))
};
```

### After (with entity)
```javascript
// src/core/csv/CsvData.js
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

        if (!Array.isArray(this.rows)) {
            throw new Error('CSV rows must be an array');
        }

        this.rows.forEach((row, idx) => {
            if (row.length !== this.headers.length) {
                throw new Error(`Row ${idx} has ${row.length} columns but headers have ${this.headers.length}`);
            }
        });
    }

    getRow(index) {
        if (index < 0 || index >= this.rows.length) {
            throw new Error(`Row index ${index} out of bounds`);
        }
        return this.rows[index];
    }

    getRowCount() {
        return this.rows.length;
    }

    getColumnCount() {
        return this.headers.length;
    }
}

// src/application/CSVService.js (updated)
import { CsvData } from '../core/csv/CsvData.js';
import { parseCSV } from '../core/csv/csv-parser.js';

export class CSVService {
    async loadAndParseCSV(file) {
        const text = await file.text();
        const { headers, rows } = parseCSV(text);
        return new CsvData(headers, rows);
    }
}
```

## Step 5: Wire Up Dependency Injection

### Container Initialization
```javascript
// src/bootstrap.js
import { globalContainer } from './infrastructure/index.js';
import { Logger, globalLogger } from './infrastructure/logger.js';
import { StorageRepository } from './infrastructure/storage.js';
import { MessageBus } from './infrastructure/message-bus.js';
import { CSVService } from './application/CSVService.js';
import { MappingService } from './application/MappingService.js';

export function initializeContainer() {
    // Infrastructure services
    globalContainer.register('logger', () => globalLogger);
    globalContainer.register('storage', (c) => 
        new StorageRepository(c.get('logger'))
    );
    globalContainer.register('messageBus', (c) => 
        new MessageBus(c.get('logger'))
    );

    // Application services
    globalContainer.register('csvService', (c) => 
        new CSVService(c.get('logger'))
    );
    globalContainer.register('mappingService', (c) => 
        new MappingService(c.get('storage'), c.get('logger'))
    );

    // State
    globalContainer.register('popupState', () => 
        new PopupState(), 
        { singleton: true }
    );

    return globalContainer;
}

// popup/popup.js (entry point)
import { initializeContainer } from '../bootstrap.js';
import { PopupUI } from './PopupUI.js';
import { PopupController } from './PopupController.js';

const container = initializeContainer();
const state = container.get('popupState');
const ui = new PopupUI(state);
const controller = new PopupController(container, state, ui);

// Wire up event listeners...
```

## Step 6: Replace Inline JavaScript with Content Script Manager

### Before (inline code)
```javascript
// popup/popup.js
async function loadTableFields() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const results = await browser.tabs.executeScript(tab.id, {
        code: `
            (function() {
                const tables = document.querySelectorAll('table, form, [role="table"]');
                // ... logic here
            })();
        `
    });
}
```

### After (service-based)
```javascript
// src/application/ContentScriptManager.js
export class ContentScriptManager {
    constructor(logger = null) {
        this.logger = logger || new Logger('ContentScriptManager');
    }

    async getPageAnalysis(tabId) {
        try {
            const result = await browser.tabs.sendMessage(tabId, {
                type: 'ANALYZE_PAGE'
            });
            return result;
        } catch (error) {
            this.logger.error('Failed to analyze page', error);
            throw error;
        }
    }

    async fillTable(tabId, data) {
        try {
            const result = await browser.tabs.sendMessage(tabId, {
                type: 'FILL_TABLE',
                data
            });
            return result;
        } catch (error) {
            this.logger.error('Failed to fill table', error);
            throw error;
        }
    }
}

// src/content-script.js (updated)
import { Logger } from './infrastructure/logger.js';
import { PageAnalyzer } from './core/PageAnalyzer.js';
import { TableFiller } from './core/TableFiller.js';

const logger = new Logger('ContentScript');
const pageAnalyzer = new PageAnalyzer(logger);
const tableFiller = new TableFiller(logger);

browser.runtime.onMessage.addListener(async (message, sender) => {
    try {
        switch (message.type) {
            case 'ANALYZE_PAGE':
                return await pageAnalyzer.analyze();
            
            case 'FILL_TABLE':
                return await tableFiller.fill(message.data);
            
            default:
                logger.warn('Unknown message type', { type: message.type });
                return { error: 'Unknown message type' };
        }
    } catch (error) {
        logger.error('Message handler error', error);
        return { error: error.message };
    }
});

logger.info('Content script initialized');
```

## Incremental Adoption Checklist

- [ ] Phase 1: Infrastructure (Config, Logger, Errors, Storage, MessageBus, Container)
  - [ ] No changes to existing code
  - [ ] Infrastructure can run in parallel
  
- [ ] Phase 2: Services Layer
  - [ ] Create CSVService
  - [ ] Create MappingService
  - [ ] Create ContentScriptManager
  - [ ] Existing code still works
  
- [ ] Phase 3: Refactor Popup
  - [ ] Create PopupState
  - [ ] Create PopupUI
  - [ ] Create PopupController
  - [ ] Gradually replace old popup.js code
  
- [ ] Phase 4: Refactor Background
  - [ ] Use MessageBus instead of direct handlers
  - [ ] Use StorageRepository instead of direct calls
  - [ ] Add proper logging
  
- [ ] Phase 5: Refactor Content Script
  - [ ] Extract PageAnalyzer
  - [ ] Extract TableFiller
  - [ ] Use message handlers
  
- [ ] Phase 6: Cleanup
  - [ ] Remove old code paths
  - [ ] Update tests
  - [ ] Documentation

## Benefits Achieved

✅ **Testability**: Each service can be tested in isolation
✅ **Maintainability**: Clear code organization and responsibilities
✅ **Reusability**: Services can be used from any context
✅ **Error Handling**: Consistent error handling across application
✅ **Logging**: Full visibility into operations
✅ **Security**: Input validation at service layer
✅ **Performance**: Easier to identify bottlenecks
✅ **Documentation**: Code is self-documenting

## Runtime Zero-Downtime Migration

1. Deploy infrastructure layer (backward compatible)
2. Deploy services alongside old code
3. Gradually route traffic to new services
4. Monitor and fix issues
5. Remove old code paths
6. Final optimization pass
