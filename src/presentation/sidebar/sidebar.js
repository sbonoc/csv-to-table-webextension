/**
 * Sidebar Script
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

import {
    applyTranslations,
    createI18n
} from '../i18n.js';

// Initialize container and services
const container = new Container();
container.initializeDefaultServices();

const logger = container.get('logger');
const storage = container.get('storage');
const i18n = createI18n('en');
const t = i18n.t;

logger.info('Sidebar initializing...');

// UI Elements
const csvFileInput = document.getElementById('csv-file');
const firstRowAsDataCheckbox = document.getElementById('first-row-as-data');
const csvSampleContainer = document.getElementById('csv-sample-container');
const mappingContainer = document.getElementById('mapping-container');
const tableSelect = document.getElementById('table-select');
const dateFormatSelect = document.getElementById('date-format-select');
const saveMappingBtn = document.getElementById('save-mapping');
const fillTableBtn = document.getElementById('fill-table');
const clearMappingBtn = document.getElementById('clear-mapping');
const statusMessage = document.getElementById('status-message');

function setButtonA11yState(button, disabled) {
    button.disabled = disabled;
    button.setAttribute('aria-disabled', String(disabled));
}

function getHighlightHue(columnIndex) {
    return (columnIndex * 47) % 360;
}

function getHighlightColor(columnIndex) {
    return `hsl(${getHighlightHue(columnIndex)}, 75%, 42%)`;
}

function getHighlightBackground(columnIndex) {
    return `hsl(${getHighlightHue(columnIndex)}, 100%, 95%)`;
}

function clearMappingHighlights() {
    const mappingRows = mappingContainer.querySelectorAll('.mapping-row');
    mappingRows.forEach(row => {
        row.classList.remove('is-mapped');
        row.removeAttribute('data-mapping-state');
        row.style.borderLeftColor = 'transparent';
        row.style.backgroundColor = '';
    });

    const sampleCells = csvSampleContainer.querySelectorAll('[data-col-index]');
    sampleCells.forEach(cell => {
        cell.style.backgroundColor = '';
        cell.style.color = '';
        cell.style.fontWeight = '';
    });
}

function applyMappingHighlights() {
    clearMappingHighlights();

    const selects = mappingContainer.querySelectorAll('[data-csv-column]');

    selects.forEach(select => {
        if (!select.value) {
            return;
        }

        const csvColumn = Number.parseInt(select.dataset.csvColumn, 10);
        if (!Number.isInteger(csvColumn)) {
            return;
        }

        const color = getHighlightColor(csvColumn);
        const background = getHighlightBackground(csvColumn);
        const row = select.closest('.mapping-row');

        if (row) {
            row.classList.add('is-mapped');
            row.setAttribute('data-mapping-state', t('mappedBadge'));
            row.style.borderLeftColor = color;
            row.style.backgroundColor = background;
        }

        const columnCells = csvSampleContainer.querySelectorAll(`[data-col-index="${csvColumn}"]`);
        columnCells.forEach(cell => {
            cell.style.backgroundColor = background;
            if (cell.tagName === 'TH') {
                cell.style.color = color;
                cell.style.fontWeight = '700';
            }
        });
    });

    highlightTargetTableInPage(true);
}

function renderMappingPlaceholder() {
    const placeholder = document.createElement('p');
    placeholder.className = 'placeholder';
    placeholder.textContent = t('mappingPlaceholder');
    mappingContainer.replaceChildren(placeholder);
}

function createDefaultFieldOption() {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = t('selectTargetField');
    return option;
}

function getCurrentMappingFromUI() {
    const mapping = {};
    const selects = document.querySelectorAll('[data-csv-column]');

    selects.forEach(select => {
        const csvCol = select.dataset.csvColumn;
        const target = select.value;
        if (target) {
            mapping[csvCol] = target;
        }
    });

    return mapping;
}

async function highlightTargetTableInPage(enabled = true, shouldScrollIntoView = false) {
    try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const tableIndex = Number.parseInt(tableSelect.value, 10);

        await browser.tabs.sendMessage(tab.id, {
            action: 'highlightTargetTable',
            data: enabled
                ? {
                    tableIndex: Number.isInteger(tableIndex) && tableIndex >= 0 ? tableIndex : 0,
                    mapping: getCurrentMappingFromUI(),
                    scrollIntoView: shouldScrollIntoView
                }
                : { enabled: false }
        });
    } catch (error) {
        logger.debug('Could not apply target highlight', { error: error.message });
    }
}

function getRowsForProcessing(csvData) {
    if (!csvData) {
        return [];
    }

    if (firstRowAsDataCheckbox.checked) {
        return [csvData.headers, ...csvData.rows];
    }

    return csvData.rows;
}

function renderCSVSample(csvData) {
    if (!csvData || !csvData.headers || csvData.headers.length === 0) {
        csvSampleContainer.innerHTML = `<p class="placeholder">${t('csvPreviewPlaceholder')}</p>`;
        return;
    }

    const rowsForProcessing = getRowsForProcessing(csvData);
    const previewRows = rowsForProcessing.slice(0, 5);
    const headerCells = csvData.headers
        .map((header, index) => `<th scope="col" data-col-index="${index}">${header}</th>`)
        .join('');

    const bodyRows = previewRows.length > 0
        ? previewRows
            .map(row => {
                const cells = csvData.headers
                    .map((_, index) => `<td data-col-index="${index}">${row[index] ?? ''}</td>`)
                    .join('');
                return `<tr>${cells}</tr>`;
            })
            .join('')
        : `<tr><td colspan="${csvData.headers.length}">${t('noDataRows')}</td></tr>`;

    csvSampleContainer.innerHTML = `
        <table class="sample-table">
            <caption class="sr-only">${t('csvPreviewCaption', { rows: previewRows.length, columns: csvData.headers.length })}</caption>
            <thead>
                <tr>${headerCells}</tr>
            </thead>
            <tbody>
                ${bodyRows}
            </tbody>
        </table>
    `;

    applyMappingHighlights();
}

/**
 * Show status message to user
 */
function showStatus(message, type = 'info', duration = 3000) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;
    statusMessage.setAttribute('aria-hidden', 'false');

    if (type === 'error') {
        statusMessage.setAttribute('role', 'alert');
        statusMessage.setAttribute('aria-live', 'assertive');
    } else {
        statusMessage.setAttribute('role', 'status');
        statusMessage.setAttribute('aria-live', 'polite');
    }

    logger.debug(`Status: ${message}`, { type });

    if (duration > 0) {
        setTimeout(() => {
            statusMessage.classList.remove('show');
            statusMessage.setAttribute('aria-hidden', 'true');
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

        // Store in sidebar memory
        window.csvData = csvData;

        logger.info('CSV loaded successfully', {
            headers: csvData.headers.length,
            rows: csvData.rows.length
        });

        renderCSVSample(csvData);
        renderMappingUI();
        setButtonA11yState(saveMappingBtn, false);
        showStatus(t('csvLoaded', { columns: csvData.headers.length, rows: csvData.rows.length }), 'success');
    } catch (error) {
        logger.error('CSV file error', error);
        showStatus(t('csvError', { message: error.message }), 'error');
    }
});

firstRowAsDataCheckbox.addEventListener('change', () => {
    if (window.csvData) {
        renderCSVSample(window.csvData);
    }
});

/**
 * Render mapping configuration UI
 */
function renderMappingUI() {
    if (!window.csvData || !window.csvData.headers.length) {
        renderMappingPlaceholder();
        return;
    }

    const headers = window.csvData.headers;
    const rows = headers.map((header, index) => {
        const row = document.createElement('div');
        row.className = 'mapping-row';

        const label = document.createElement('label');
        const selectId = `mapping-select-${index}`;
        label.setAttribute('for', selectId);
        label.textContent = `${header}:`;

        const select = document.createElement('select');
        select.id = selectId;
        select.setAttribute('aria-label', `${t('mappingSelectLabelPrefix')} ${header}`);
        select.setAttribute('data-csv-column', String(index));
        select.appendChild(createDefaultFieldOption());
        select.addEventListener('change', applyMappingHighlights);

        row.appendChild(label);
        row.appendChild(select);
        return row;
    });

    mappingContainer.replaceChildren(...rows);
    loadTableFields();
    applyMappingHighlights();
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
        showStatus(t('tableDetectError', { message: error.message }), 'warning', 7000);
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

    highlightTargetTableInPage(true);
}

/**
 * Populate mapping select dropdowns with available fields
 */
function populateMappingSelects() {
    const selects = document.querySelectorAll('[data-csv-column]');

    selects.forEach(select => {
        const currentValue = select.value;
        select.replaceChildren(createDefaultFieldOption());

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

    applyMappingHighlights();
}

/**
 * Save mapping configuration
 */
saveMappingBtn.addEventListener('click', async () => {
    try {
        if (!window.csvData || !window.csvData.headers.length) {
            showStatus(t('loadCsvFirst'), 'warning');
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
            showStatus(t('mappingNeedOne'), 'warning');
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
        setButtonA11yState(fillTableBtn, false);
        showStatus(t('mappingSaved'), 'success');
    } catch (error) {
        logger.error('Mapping save error', error);
        showStatus(t('saveError', { message: error.message }), 'error');
    }
});

/**
 * Fill table with CSV data
 */
fillTableBtn.addEventListener('click', async () => {
    try {
        if (!window.csvData || !window.csvData.rows.length) {
            showStatus(t('loadCsvFirst'), 'warning');
            return;
        }

        logger.debug('Filling table with CSV data');

        const mapping = await storage.getMappingConfig();

        if (!mapping || Object.keys(mapping).length === 0) {
            showStatus(t('saveMappingFirst'), 'warning');
            return;
        }

        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const tableIndex = parseInt(tableSelect.value) || 0;
        const rowsForProcessing = getRowsForProcessing(window.csvData);

        if (!rowsForProcessing.length) {
            showStatus(t('noRowsToFill'), 'warning');
            return;
        }

        // Send fill request to content script
        const result = await browser.tabs.sendMessage(tab.id, {
            action: 'fillTable',
            data: {
                tableIndex: tableIndex,
                mapping: mapping,
                csvRows: rowsForProcessing,
                dateFormatTransform: dateFormatSelect.value || 'auto'
            }
        });

        if (result.success && result.severity === 'warning') {
            logger.warn('Table filled with warning', { filled: result.filled, message: result.message });
            showStatus(t('fillWarning', { message: result.message }), 'warning');
        } else if (result.success) {
            logger.info('Table filled successfully', { filled: result.filled });
            showStatus(t('fillSuccess', { message: result.message }), 'success');
        } else {
            logger.warn('Fill operation partially failed', { error: result.error });
            showStatus(t('fillError', { message: result.message }), 'error');
        }
    } catch (error) {
        logger.error('Table fill error', error);
        showStatus(t('fillTableError', { message: error.message }), 'error');
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
        firstRowAsDataCheckbox.checked = false;
        tableSelect.value = '';
        dateFormatSelect.value = 'auto';
        renderCSVSample(null);
        renderMappingPlaceholder();
        clearMappingHighlights();
        highlightTargetTableInPage(false);
        statusMessage.classList.remove('show');
        statusMessage.setAttribute('aria-hidden', 'true');
        setButtonA11yState(fillTableBtn, true);
        setButtonA11yState(saveMappingBtn, true);

        logger.info('Mapping cleared');
        showStatus(t('mappingCleared'), 'info', 2000);
    } catch (error) {
        logger.error('Clear error', error);
        showStatus(t('clearError', { message: error.message }), 'error');
    }
});

/**
 * Initialize sidebar on load
 */
async function initializeSidebar() {
    try {
        logger.debug('Initializing sidebar...');
        applyTranslations(document, t);

        // Load saved mapping if exists
        const mapping = await storage.getMappingConfig();
        if (mapping && Object.keys(mapping).length > 0) {
            setButtonA11yState(fillTableBtn, false);
            setButtonA11yState(saveMappingBtn, false);
        }

        // Try to detect tables on current page
        loadTableFields();

        logger.info('Sidebar initialized');
    } catch (error) {
        logger.error('Sidebar initialization error', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeSidebar);

setButtonA11yState(saveMappingBtn, saveMappingBtn.disabled);
setButtonA11yState(fillTableBtn, fillTableBtn.disabled);
setButtonA11yState(clearMappingBtn, clearMappingBtn.disabled);

tableSelect.addEventListener('change', () => {
    populateMappingSelects();
    highlightTargetTableInPage(true, true);
});

