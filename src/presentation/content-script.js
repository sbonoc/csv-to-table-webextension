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

logger.info('Content script initializing...');

/**
 * Handle messages from popup
 */
async function handleMessage(request, sender) {
    logger.debug('Message received from popup', { action: request.action });

    try {
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
    logger.debug('Filling table with data', { 
        tableIndex: data.tableIndex,
        mappingKeys: Object.keys(data.mapping || {}).length
    });

    try {
        if (!data.tableIndex && data.tableIndex !== 0) {
            throw new Error('Table index is required');
        }

        if (!data.mapping || typeof data.mapping !== 'object') {
            throw new Error('Mapping is required');
        }

        if (!data.csvRow || !Array.isArray(data.csvRow)) {
            throw new Error('CSV row data is required');
        }

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

