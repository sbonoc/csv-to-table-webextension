/**
 * Popup Script
 * Handles user interaction and CSV mapping configuration
 */

import {
    Container,
    Logger
} from '../../infrastructure/index.js';

import {
    parseCSV,
    validateCSVData
} from '../../domain/csv-parser.js';

// Initialize container and services
const container = new Container();
container.initializeDefaultServices();

const logger = container.get('logger');
const storage = container.get('storage');

logger.info('Popup initializing...');

// UI Elements
const csvFileInput = document.getElementById('csv-file');
const mappingContainer = document.getElementById('mapping-container');
const tableSelect = document.getElementById('table-select');
const saveMappingBtn = document.getElementById('save-mapping');
const fillTableBtn = document.getElementById('fill-table');
const clearMappingBtn = document.getElementById('clear-mapping');
const statusMessage = document.getElementById('status-message');

/**
 * Show status message to user
 */
function showStatus(message, type = 'info', duration = 3000) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;
    
    logger.debug(`Status: ${message}`, { type });
    
    if (duration > 0) {
        setTimeout(() => {
            statusMessage.classList.remove('show');
        }, duration);
    }
}

/**
 * Handle CSV file selection
 */
csvFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        logger.debug('CSV file selected', { name: file.name, size: file.size });
        
        const text = await file.text();
        
        // Parse and validate CSV
        const csvData = parseCSV(text);
        validateCSVData(csvData);
        
        // Store in popup memory
        window.csvData = csvData;
        
        logger.info('CSV loaded successfully', {
            headers: csvData.headers.length,
            rows: csvData.rows.length
        });

        renderMappingUI();
        showStatus(`✓ CSV loaded: ${csvData.headers.length} columns, ${csvData.rows.length} rows`, 'success');
    } catch (error) {
        logger.error('CSV file error', error);
        showStatus(`✗ Error: ${error.message}`, 'error');
    }
});

/**
 * Render mapping configuration UI
 */
function renderMappingUI() {
    if (!window.csvData || !window.csvData.headers.length) {
        mappingContainer.innerHTML = '<p class="placeholder">Load a CSV file to configure mapping</p>';
        return;
    }

    const headers = window.csvData.headers;
    let html = '';

    headers.forEach((header, index) => {
        html += `
            <div class="mapping-row">
                <label>${header}:</label>
                <select data-csv-column="${index}">
                    <option value="">-- Select target field --</option>
                </select>
            </div>
        `;
    });

    mappingContainer.innerHTML = html;
    loadTableFields();
}

/**
 * Load available fields from tables on the current page
 */
async function loadTableFields() {
    try {
        logger.debug('Loading table fields from active tab...');
        
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        
        // Execute content script to get table info
        const results = await browser.tabs.sendMessage(tab.id, {
            action: 'getTableInfo'
        });

        if (results.success && results.tables) {
            window.tableFields = results.tables;
            populateTableSelect();
            populateMappingSelects();
            
            logger.info('Table fields loaded', { count: results.tables.length });
        } else {
            throw new Error(results.error || 'Failed to load table info');
        }
    } catch (error) {
        logger.warn('Table loading error', error);
        showStatus('⚠ Could not detect tables on this page', 'warning');
    }
}

/**
 * Populate table selection dropdown
 */
function populateTableSelect() {
    // Clear existing options except first
    while (tableSelect.options.length > 1) {
        tableSelect.remove(1);
    }
    
    if (window.tableFields && window.tableFields.length > 0) {
        window.tableFields.forEach(table => {
            const opt = document.createElement('option');
            opt.value = table.index;
            opt.textContent = `${table.name} (${table.fieldsCount} fields)`;
            tableSelect.appendChild(opt);
        });
        
        tableSelect.value = window.tableFields[0].index;
        logger.debug('Table select populated', { count: window.tableFields.length });
    }
}

/**
 * Populate mapping select dropdowns with available fields
 */
function populateMappingSelects() {
    const selects = document.querySelectorAll('[data-csv-column]');
    
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Select target field --</option>';
        
        if (window.tableFields && window.tableFields.length > 0) {
            const selectedTableIndex = parseInt(tableSelect.value) || 0;
            const table = window.tableFields[selectedTableIndex];
            
            if (table && table.fields) {
                table.fields.forEach(field => {
                    const opt = document.createElement('option');
                    opt.value = field.name;
                    opt.textContent = field.name;
                    select.appendChild(opt);
                });
            }
        }
        
        select.value = currentValue;
    });
}

/**
 * Save mapping configuration
 */
saveMappingBtn.addEventListener('click', async () => {
    try {
        if (!window.csvData || !window.csvData.headers.length) {
            showStatus('Please load a CSV file first', 'warning');
            return;
        }

        const mapping = {};
        const selects = document.querySelectorAll('[data-csv-column]');
        
        selects.forEach(select => {
            const csvCol = select.dataset.csvColumn;
            const target = select.value;
            if (target) {
                mapping[csvCol] = target;
            }
        });

        if (Object.keys(mapping).length === 0) {
            showStatus('Please configure at least one mapping', 'warning');
            return;
        }

        logger.debug('Saving mapping configuration', { mappingKeys: Object.keys(mapping).length });

        // Use StorageRepository to save
        await storage.saveMappingConfig(mapping);
        
        // Store additional metadata
        await browser.storage.local.set({
            lastCSVHeaders: window.csvData.headers,
            mappedTableIndex: tableSelect.value
        });

        logger.info('Mapping saved successfully');
        fillTableBtn.disabled = false;
        showStatus('✓ Mapping saved successfully!', 'success');
    } catch (error) {
        logger.error('Mapping save error', error);
        showStatus(`✗ Error saving mapping: ${error.message}`, 'error');
    }
});

/**
 * Fill table with CSV data
 */
fillTableBtn.addEventListener('click', async () => {
    try {
        if (!window.csvData || !window.csvData.rows.length) {
            showStatus('Please load a CSV file first', 'warning');
            return;
        }

        logger.debug('Filling table with CSV data');

        const mapping = await storage.getMappingConfig();
        
        if (!mapping || Object.keys(mapping).length === 0) {
            showStatus('Please save a mapping first', 'warning');
            return;
        }

        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const tableIndex = parseInt(tableSelect.value) || 0;
        const firstRow = window.csvData.rows[0];

        // Send fill request to content script
        const result = await browser.tabs.sendMessage(tab.id, {
            action: 'fillTable',
            data: {
                tableIndex: tableIndex,
                mapping: mapping,
                csvRow: firstRow
            }
        });

        if (result.success) {
            logger.info('Table filled successfully', { filled: result.filled });
            showStatus(`✓ ${result.message}`, 'success');
        } else {
            logger.warn('Fill operation partially failed', { error: result.error });
            showStatus(`✗ ${result.message}`, 'error');
        }
    } catch (error) {
        logger.error('Table fill error', error);
        showStatus(`✗ Error filling table: ${error.message}`, 'error');
    }
});

/**
 * Clear mapping configuration
 */
clearMappingBtn.addEventListener('click', async () => {
    try {
        logger.debug('Clearing mapping configuration');
        
        await storage.saveMappingConfig({});
        await browser.storage.local.remove(['lastCSVHeaders', 'mappedTableIndex']);
        
        csvFileInput.value = '';
        tableSelect.value = '';
        mappingContainer.innerHTML = '<p class="placeholder">Load a CSV file to configure mapping</p>';
        statusMessage.classList.remove('show');
        fillTableBtn.disabled = true;
        saveMappingBtn.disabled = true;

        logger.info('Mapping cleared');
        showStatus('Mapping cleared', 'info', 2000);
    } catch (error) {
        logger.error('Clear error', error);
        showStatus(`✗ Error clearing mapping: ${error.message}`, 'error');
    }
});

/**
 * Initialize popup on load
 */
async function initializePopup() {
    try {
        logger.debug('Initializing popup...');
        
        // Load saved mapping if exists
        const mapping = await storage.getMappingConfig();
        if (mapping && Object.keys(mapping).length > 0) {
            fillTableBtn.disabled = false;
            saveMappingBtn.disabled = false;
        }
        
        // Try to detect tables on current page
        loadTableFields();
        
        logger.info('Popup initialized');
    } catch (error) {
        logger.error('Popup initialization error', error);
    }
}

document.addEventListener('DOMContentLoaded', initializePopup);

