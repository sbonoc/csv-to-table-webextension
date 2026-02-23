/**
 * Logger Module
 * Provides consistent logging across the extension
 */

import { CONFIG, getLogLevel, isDevelopment } from './config.js';

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

export class Logger {
    constructor(context = 'Extension', logLevel = null) {
        this.context = context;
        this.logLevel = logLevel || LOG_LEVELS[getLogLevel()];
    }

    /**
     * Log debug message (level 0)
     */
    debug(message, data = null) {
        if (this.logLevel <= LOG_LEVELS.debug) {
            const output = this.formatMessage('DEBUG', message, data);
            console.debug(output, data);
        }
    }

    /**
     * Log info message (level 1)
     */
    info(message, data = null) {
        if (this.logLevel <= LOG_LEVELS.info) {
            const output = this.formatMessage('INFO', message, data);
            console.info(output, data);
        }
    }

    /**
     * Log warning message (level 2)
     */
    warn(message, data = null) {
        if (this.logLevel <= LOG_LEVELS.warn) {
            const output = this.formatMessage('WARN', message, data);
            console.warn(output, data);
        }
    }

    /**
     * Log error message (level 3)
     */
    error(message, error = null) {
        if (this.logLevel <= LOG_LEVELS.error) {
            const output = this.formatMessage('ERROR', message, error);
            console.error(output, error);
        }
    }

    /**
     * Format log message with timestamp and context
     */
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const context = `[${timestamp}] [${level}] [${this.context}]`;
        
        if (data) {
            return `${context} ${message}`;
        }
        
        return `${context} ${message}`;
    }

    /**
     * Create child logger with specified context
     */
    createChild(childContext) {
        return new Logger(`${this.context}:${childContext}`, this.logLevel);
    }

    /**
     * Performance measurement helper
     */
    measureAsync(label, asyncFn) {
        return async (...args) => {
            const startTime = performance.now();
            try {
                const result = await asyncFn(...args);
                const duration = performance.now() - startTime;
                this.debug(`${label} completed in ${duration.toFixed(2)}ms`);
                return result;
            } catch (error) {
                const duration = performance.now() - startTime;
                this.error(`${label} failed after ${duration.toFixed(2)}ms`, error);
                throw error;
            }
        };
    }
}

/**
 * Singleton instance
 */
export const globalLogger = new Logger('CSV-to-Table-Filler');
