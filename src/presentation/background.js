/**
 * Background Script
 * Handles persistent operations and communication between content scripts and popup
 * Uses DI Container and centralized services
 */

import {
    Container,
    Logger,
    StorageRepository,
    MessageBus,
    CONFIG
} from '../infrastructure/index.js';

// Initialize container with default services
const container = new Container();
container.initializeDefaultServices();

const logger = container.get('logger');
const storage = container.get('storage');
const messageBus = container.get('messageBus');

const ALLOWED_ACTIONS = new Set([
    'saveMappingConfig',
    'getMappingConfig',
    'deleteMappingConfig'
]);

logger.info('Background script initializing...');

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

function validateMappingPayload(mapping) {
    if (!isPlainObject(mapping)) {
        throw new Error('Mapping must be an object');
    }

    const entries = Object.entries(mapping);
    if (entries.length > CONFIG.LIMITS.MAX_CSV_COLUMNS) {
        throw new Error('Mapping exceeds maximum allowed columns');
    }

    entries.forEach(([key, value]) => {
        const index = Number(key);
        if (!Number.isInteger(index) || index < 0 || index >= CONFIG.LIMITS.MAX_CSV_COLUMNS) {
            throw new Error(`Invalid mapping index: ${key}`);
        }

        if (typeof value !== 'string' || value.trim() === '') {
            throw new Error(`Invalid mapped field for index: ${key}`);
        }
    });
}

/**
 * Initialize extension storage with defaults
 */
async function initializeStorage() {
    try {
        const mappingConfig = await storage.getMappingConfig();

        if (!mappingConfig || Object.keys(mappingConfig).length === 0) {
            logger.debug('First time setup: initializing storage');
            await storage.saveMappingConfig({});
        }

        logger.info('Storage initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize storage', error);
    }
}

/**
 * Handle message from popup or content scripts
 */
async function handleMessage(request, sender) {
    logger.debug('Message received', {
        action: request?.action,
        sender: sender?.url
    });

    try {
        if (!isValidSender(sender)) {
            throw new Error('Unauthorized message sender');
        }

        validateRequestEnvelope(request);

        switch (request.action) {
            case 'saveMappingConfig':
                return await handleSaveMappingConfig(request);

            case 'getMappingConfig':
                return await handleGetMappingConfig();

            case 'deleteMappingConfig':
                return await handleDeleteMappingConfig();

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
 * Save mapping configuration
 */
async function handleSaveMappingConfig(request) {
    logger.debug('Saving mapping configuration');

    if (!request.data || !request.data.mapping) {
        throw new Error('Mapping data is required');
    }

    const mapping = request.data.mapping;

    validateMappingPayload(mapping);

    await storage.saveMappingConfig(mapping);

    // Emit event for other listeners
    await messageBus.emit({
        type: 'MAPPING_SAVED',
        data: { mapping, timestamp: new Date().toISOString() }
    });

    logger.info('Mapping configuration saved');
    return { success: true, message: 'Mapping saved successfully' };
}

/**
 * Get mapping configuration
 */
async function handleGetMappingConfig() {
    logger.debug('Retrieving mapping configuration');

    const mapping = await storage.getMappingConfig();
    return {
        success: true,
        mapping: mapping || {}
    };
}

/**
 * Delete mapping configuration
 */
async function handleDeleteMappingConfig() {
    logger.debug('Deleting mapping configuration');

    await storage.saveMappingConfig({});

    await messageBus.emit({
        type: 'MAPPING_DELETED',
        data: { timestamp: new Date().toISOString() }
    });

    logger.info('Mapping configuration deleted');
    return { success: true, message: 'Mapping deleted successfully' };
}

/**
 * Handle installation and updates
 */
browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        logger.info('Extension installed');
        initializeStorage();
    } else if (details.reason === 'update') {
        logger.info('Extension updated', {
            previousVersion: details.previousVersion
        });
    }
});

/**
 * Register message listener
 */
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender)
        .then(result => {
            sendResponse(result);
        })
        .catch(error => {
            logger.error('Error handling message', error);
            sendResponse({
                success: false,
                error: error.message
            });
        });

    // Return true to keep sendResponse available for async operations
    return true;
});

// Initialize on startup
initializeStorage();

logger.info('Background script loaded successfully');

