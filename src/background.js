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
} from './infrastructure/index.js';

// Initialize container with default services
const container = new Container();
container.initializeDefaultServices();

const logger = container.get('logger');
const storage = container.get('storage');
const messageBus = container.get('messageBus');

logger.info('Background script initializing...');

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
        action: request.action, 
        sender: sender.url 
    });

    try {
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
    
    // Validate mapping
    if (typeof mapping !== 'object' || Array.isArray(mapping)) {
        throw new Error('Mapping must be an object');
    }

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

