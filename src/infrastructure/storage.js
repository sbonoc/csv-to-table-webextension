/**
 * Storage Repository
 * Abstraction layer for browser storage operations
 * Handles all communication with browser.storage API
 */

import { Logger } from './logger.js';
import { StorageError } from './errors.js';
import { CONFIG } from './config.js';

export class StorageRepository {
    constructor(logger = null) {
        this.logger = logger || new Logger('StorageRepository');
    }

    /**
     * Retrieve mapping configuration
     */
    async getMappingConfig() {
        try {
            this.logger.debug('Retrieving mapping config');
            const result = await browser.storage.local.get(CONFIG.STORAGE_KEYS.MAPPING);
            return result[CONFIG.STORAGE_KEYS.MAPPING] || {};
        } catch (error) {
            this.logger.error('Failed to get mapping config', error);
            throw new StorageError('Failed to retrieve mapping configuration', 'STORAGE_READ_FAILED', {
                key: CONFIG.STORAGE_KEYS.MAPPING,
                originalError: error.message
            });
        }
    }

    /**
     * Save mapping configuration
     */
    async saveMappingConfig(mapping) {
        if (!mapping || typeof mapping !== 'object') {
            throw new StorageError('Mapping must be an object');
        }

        try {
            this.logger.debug('Saving mapping config', { keys: Object.keys(mapping) });
            await browser.storage.local.set({
                [CONFIG.STORAGE_KEYS.MAPPING]: mapping,
                'lastMappingUpdate': new Date().toISOString()
            });
            this.logger.info('Mapping config saved successfully');
        } catch (error) {
            this.logger.error('Failed to save mapping config', error);
            throw new StorageError('Failed to save mapping configuration', 'STORAGE_WRITE_FAILED', {
                mappingSize: JSON.stringify(mapping).length,
                originalError: error.message
            });
        }
    }

    /**
     * Retrieve app settings
     */
    async getSettings() {
        try {
            this.logger.debug('Retrieving settings');
            const result = await browser.storage.local.get(CONFIG.STORAGE_KEYS.APP_SETTINGS);
            return result[CONFIG.STORAGE_KEYS.APP_SETTINGS] || {};
        } catch (error) {
            this.logger.error('Failed to get settings', error);
            throw new StorageError('Failed to retrieve settings');
        }
    }

    /**
     * Save app settings
     */
    async saveSettings(settings) {
        try {
            this.logger.debug('Saving settings');
            await browser.storage.local.set({
                [CONFIG.STORAGE_KEYS.APP_SETTINGS]: settings
            });
            this.logger.info('Settings saved successfully');
        } catch (error) {
            this.logger.error('Failed to save settings', error);
            throw new StorageError('Failed to save settings');
        }
    }

    /**
     * Get all stored data
     */
    async getAllData() {
        try {
            this.logger.debug('Retrieving all data');
            return await browser.storage.local.get();
        } catch (error) {
            this.logger.error('Failed to get all data', error);
            throw new StorageError('Failed to retrieve all data');
        }
    }

    /**
     * Clear specific key
     */
    async remove(key) {
        try {
            this.logger.debug('Removing key', { key });
            await browser.storage.local.remove(key);
            this.logger.info('Key removed', { key });
        } catch (error) {
            this.logger.error('Failed to remove key', error);
            throw new StorageError(`Failed to remove key: ${key}`);
        }
    }

    /**
     * Clear all stored data
     */
    async clear() {
        try {
            this.logger.warn('Clearing all storage');
            await browser.storage.local.clear();
            this.logger.info('All storage cleared');
        } catch (error) {
            this.logger.error('Failed to clear storage', error);
            throw new StorageError('Failed to clear storage');
        }
    }

    /**
     * Add to history (JSON array)
     */
    async addToHistory(key, item, maxItems = 20) {
        try {
            const result = await browser.storage.local.get(key);
            let history = result[key] || [];
            
            if (!Array.isArray(history)) {
                this.logger.warn('History is not an array, resetting');
                history = [];
            }

            // Add new item to beginning
            history.unshift({
                ...item,
                timestamp: new Date().toISOString()
            });

            // Keep only recent items
            history = history.slice(0, maxItems);

            await browser.storage.local.set({ [key]: history });
            this.logger.debug('Added to history', { key, historyLength: history.length });
        } catch (error) {
            this.logger.error('Failed to add to history', error);
            throw new StorageError('Failed to add to history');
        }
    }

    /**
     * Get history
     */
    async getHistory(key) {
        try {
            const result = await browser.storage.local.get(key);
            return result[key] || [];
        } catch (error) {
            this.logger.error('Failed to get history', error);
            throw new StorageError('Failed to retrieve history');
        }
    }
}
