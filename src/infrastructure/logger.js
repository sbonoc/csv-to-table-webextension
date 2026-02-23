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

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|cookie|csvrow|mapping|apikey|api_key|session|email)/i;

function sanitizeForLog(value, depth = 0) {
    if (value === null || value === undefined) {
        return value;
    }

    if (depth > 3) {
        return '[MaxDepth]';
    }

    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message
        };
    }

    if (Array.isArray(value)) {
        if (value.length > 25) {
            return `[Array(${value.length})]`;
        }
        return value.map(item => sanitizeForLog(item, depth + 1));
    }

    if (typeof value === 'object') {
        const sanitized = {};
        Object.entries(value).forEach(([key, nestedValue]) => {
            if (SENSITIVE_KEY_PATTERN.test(key)) {
                sanitized[key] = REDACTED;
                return;
            }
            sanitized[key] = sanitizeForLog(nestedValue, depth + 1);
        });
        return sanitized;
    }

    if (typeof value === 'string' && value.length > 300) {
        return `${value.slice(0, 300)}...[truncated]`;
    }

    return value;
}

export class Logger {
    constructor(context = 'Extension', logLevel = null) {
        this.context = context;
        this.logLevel = logLevel ?? LOG_LEVELS[getLogLevel()];
    }

    /**
     * Log debug message (level 0)
     */
    debug(message, data = null) {
        if (this.logLevel <= LOG_LEVELS.debug) {
            const sanitizedData = sanitizeForLog(data);
            const output = this.formatMessage('DEBUG', message, sanitizedData);
            console.debug(output, sanitizedData);
        }
    }

    /**
     * Log info message (level 1)
     */
    info(message, data = null) {
        if (this.logLevel <= LOG_LEVELS.info) {
            const sanitizedData = sanitizeForLog(data);
            const output = this.formatMessage('INFO', message, sanitizedData);
            console.info(output, sanitizedData);
        }
    }

    /**
     * Log warning message (level 2)
     */
    warn(message, data = null) {
        if (this.logLevel <= LOG_LEVELS.warn) {
            const sanitizedData = sanitizeForLog(data);
            const output = this.formatMessage('WARN', message, sanitizedData);
            console.warn(output, sanitizedData);
        }
    }

    /**
     * Log error message (level 3)
     */
    error(message, error = null) {
        if (this.logLevel <= LOG_LEVELS.error) {
            const sanitizedError = sanitizeForLog(error);
            const output = this.formatMessage('ERROR', message, sanitizedError);
            console.error(output, sanitizedError);
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
