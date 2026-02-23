/**
 * Content Script
 * Runs on web pages and handles communication with the popup
 * Executes table filling operations
 */

import {
    Container,
    Logger
} from '../infrastructure/index.js';

import {
    getTableFields,
    fillFields
} from '../domain/table-handler.js';

// Initialize container
const container = new Container();
container.initializeDefaultServices();

const logger = container.get('logger');

const ALLOWED_ACTIONS = new Set([
    'getTableInfo',
    'fillTable'
]);

logger.info('Content script initializing...');

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidSender(sender) {
    if (!sender || sender.id !== browser.runtime.id) {
        return false;
    }

    if (sender.url && !sender.url.startsWith(`moz-extension://${browser.runtime.id}/`)) {
        return false;
    }

    return true;
}

function validateRequestEnvelope(request) {
    if (!isPlainObject(request)) {
        throw new Error('Request must be a valid object');
    }

    if (typeof request.action !== 'string' || !ALLOWED_ACTIONS.has(request.action)) {
        throw new Error('Invalid or unauthorized action');
    }
}

function validateFillRequestData(data) {
    if (!isPlainObject(data)) {
        throw new Error('Fill payload must be an object');
    }

    if (!Number.isInteger(data.tableIndex) || data.tableIndex < 0) {
        throw new Error('Table index is required and must be a non-negative integer');
    }

    if (!isPlainObject(data.mapping)) {
        throw new Error('Mapping is required and must be an object');
    }

    if (!Array.isArray(data.csvRow)) {
        throw new Error('CSV row data is required and must be an array');
    }

    if (Object.keys(data.mapping).length > 500) {
        throw new Error('Mapping exceeds allowed size');
    }

    if (data.csvRow.length > 500) {
        throw new Error('CSV row exceeds allowed size');
    }
}

/**
 * Handle messages from popup
 */
async function handleMessage(request, sender) {
    logger.debug('Message received from popup', { action: request?.action });

    try {
        if (!isValidSender(sender)) {
            throw new Error('Unauthorized message sender');
        }

        validateRequestEnvelope(request);

        switch (request.action) {
            case 'getTableInfo':
                return handleGetTableInfo();

            case 'fillTable':
                return handleFillTable(request.data);

            default:
                logger.warn('Unknown action', { action: request.action });
                return { success: false, error: 'Unknown action' };
        }
    } catch (error) {
        logger.error('Message handling error', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get information about tables on the current page
 */
function handleGetTableInfo() {
    logger.debug('Scanning page for tables...');

    try {
        const tableSelectors = ['table', 'form', '[role="table"]'];
        const allElements = document.querySelectorAll(tableSelectors.join(','));

        const tablesInfo = Array.from(allElements).map((element, index) => {
            const fields = getTableFields(element);

            return {
                index: index,
                tag: element.tagName.toLowerCase(),
                name: `${element.tagName} ${index + 1}`,
                fieldsCount: fields.length,
                fields: fields
            };
        });

        logger.info('Found tables on page', { count: tablesInfo.length });
        return {
            success: true,
            tables: tablesInfo
        };
    } catch (error) {
        logger.error('Failed to get table info', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Fill table with CSV data
 */
function handleFillTable(data) {
    try {
        validateFillRequestData(data);

        logger.debug('Filling table with data', {
            tableIndex: data.tableIndex,
            mappingKeys: Object.keys(data.mapping || {}).length
        });

        // Get all tables on page
        const tableSelectors = ['table', 'form', '[role="table"]'];
        const allTables = document.querySelectorAll(tableSelectors.join(','));

        if (data.tableIndex >= allTables.length) {
            throw new Error(`Table index ${data.tableIndex} not found`);
        }

        const table = allTables[data.tableIndex];

        // Prepare field data from mapping
        const fieldData = {};
        Object.entries(data.mapping).forEach(([csvColumnStr, fieldName]) => {
            const csvColumn = parseInt(csvColumnStr);
            if (csvColumn >= 0 && csvColumn < data.csvRow.length) {
                fieldData[fieldName] = data.csvRow[csvColumn];
            }
        });

        // Fill fields using table-handler
        const result = fillFields(table, fieldData);

        logger.info('Table fill complete', {
            filled: result.filled,
            failed: result.failed.length
        });

        return {
            success: result.success,
            filled: result.filled,
            failed: result.failed,
            message: result.success
                ? `Filled ${result.filled} fields successfully`
                : `Failed to fill some fields`
        };
    } catch (error) {
        logger.error('Failed to fill table', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Register message listener
 */
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender)
        .then(result => {
            sendResponse(result);
        })
        .catch(error => {
            logger.error('Unhandled message error', error);
            sendResponse({
                success: false,
                error: error.message
            });
        });

    // Return true to keep sendResponse available for async operations
    return true;
});

logger.info('Content script loaded successfully');

