/**
 * Application Error Classes
 * Hierarchical error structure for better error handling
 */

import { CONFIG } from './config.js';

/**
 * Base application error
 */
export class AppError extends Error {
    constructor(message, code = 'UNKNOWN', details = {}) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

/**
 * CSV validation errors
 */
export class CSVError extends AppError {
    constructor(message, code = CONFIG.ERROR_CODES.CSV_INVALID, details = {}) {
        super(message, code, details);
        this.name = 'CSVError';
    }
}

/**
 * Mapping validation errors
 */
export class MappingError extends AppError {
    constructor(message, code = CONFIG.ERROR_CODES.MAPPING_INVALID, details = {}) {
        super(message, code, details);
        this.name = 'MappingError';
    }
}

/**
 * Storage operation errors
 */
export class StorageError extends AppError {
    constructor(message, code = CONFIG.ERROR_CODES.STORAGE_ERROR, details = {}) {
        super(message, code, details);
        this.name = 'StorageError';
    }
}

/**
 * Content script communication errors
 */
export class ContentScriptError extends AppError {
    constructor(message, code = CONFIG.ERROR_CODES.CONTENT_SCRIPT_ERROR, details = {}) {
        super(message, code, details);
        this.name = 'ContentScriptError';
    }
}

/**
 * Timeout errors
 */
export class TimeoutError extends AppError {
    constructor(message = 'Operation timed out', details = {}) {
        super(message, CONFIG.ERROR_CODES.TIMEOUT, details);
        this.name = 'TimeoutError';
    }
}

/**
 * Table not found errors
 */
export class TableNotFoundError extends AppError {
    constructor(message = 'Table not found', details = {}) {
        super(message, CONFIG.ERROR_CODES.TABLE_NOT_FOUND, details);
        this.name = 'TableNotFoundError';
    }
}

/**
 * Helper function to create user-friendly error messages
 */
export function getUserErrorMessage(error) {
    if (error instanceof CSVError) {
        return 'There was a problem with your CSV file. Please check the format.';
    }
    if (error instanceof MappingError) {
        return 'Invalid mapping configuration. Please reconfigure your column mappings.';
    }
    if (error instanceof TableNotFoundError) {
        return 'Cannot find the table on this page. Please select a different table.';
    }
    if (error instanceof TimeoutError) {
        return 'Operation took too long. Please try again.';
    }
    if (error instanceof AppError) {
        return 'An error occurred. Please try again later.';
    }
    
    return 'An unexpected error occurred.';
}
