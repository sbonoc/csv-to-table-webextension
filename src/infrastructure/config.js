/**
 * Configuration Module
 * Centralized configuration for the entire extension
 */

export const CONFIG = {
    // Storage keys
    STORAGE_KEYS: {
        MAPPING: 'csvMapping',
        CSV_HISTORY: 'csvHistory',
        APP_SETTINGS: 'appSettings',
        LAST_USED_TABLE: 'lastUsedTableIndex'
    },

    // API timeouts (in milliseconds)
    TIMEOUTS: {
        CONTENT_SCRIPT_RESPONSE: 5000,
        FILE_LOAD: 10000,
        STORAGE_OPERATION: 3000
    },

    // Size limits
    LIMITS: {
        MAX_CSV_SIZE: 10 * 1024 * 1024, // 10MB
        MAX_CSV_ROWS: 50000,
        MAX_CSV_COLUMNS: 500,
        MAX_MAPPING_HISTORY: 20
    },

    // Logging levels
    LOG_LEVEL: {
        DEBUG: 'debug',
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error'
    },

    // Default values
    DEFAULTS: {
        LOG_LEVEL_PROD: 'warn',
        LOG_LEVEL_DEV: 'debug',
        MESSAGE_TIMEOUT_DURATION: 3000,
        AUTO_SAVE_MAPPING: true
    },

    // Message types
    MESSAGE_TYPES: {
        // Popup to Content Script
        GET_TABLE_INFO: 'GET_TABLE_INFO',
        FILL_TABLE: 'FILL_TABLE',

        // Content Script to Popup
        TABLE_INFO_RESPONSE: 'TABLE_INFO_RESPONSE',
        FILL_TABLE_RESPONSE: 'FILL_TABLE_RESPONSE',

        // Any to Background
        SAVE_MAPPING_CONFIG: 'SAVE_MAPPING_CONFIG',
        GET_MAPPING_CONFIG: 'GET_MAPPING_CONFIG',
        DELETE_MAPPING: 'DELETE_MAPPING'
    },

    // Error codes
    ERROR_CODES: {
        CSV_INVALID: 'CSV_INVALID',
        CSV_EMPTY: 'CSV_EMPTY',
        CSV_TOO_LARGE: 'CSV_TOO_LARGE',
        TABLE_NOT_FOUND: 'TABLE_NOT_FOUND',
        MAPPING_INVALID: 'MAPPING_INVALID',
        STORAGE_ERROR: 'STORAGE_ERROR',
        CONTENT_SCRIPT_ERROR: 'CONTENT_SCRIPT_ERROR',
        TIMEOUT: 'TIMEOUT',
        PERMISSION_DENIED: 'PERMISSION_DENIED'
    }
};

/**
 * Determine if running in development mode
 */
export function isDevelopment() {
    // Check NODE_ENV first
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
        return true;
    }
    
    // Check if browser API is available (not in tests)
    if (typeof browser !== 'undefined' && browser.runtime && typeof browser.runtime.getURL === 'function') {
        try {
            return browser.runtime.getURL('manifest.json').includes('.dev');
        } catch (e) {
            return false;
        }
    }
    
    return false;
}

/**
 * Get appropriate log level based on environment
 */
export function getLogLevel() {
    return isDevelopment() 
        ? CONFIG.LOG_LEVEL.DEBUG 
        : CONFIG.DEFAULTS.LOG_LEVEL_PROD;
}
