import { describe, it, expect, beforeEach } from 'vitest';
import { Logger } from './logger.js';
import { CONFIG, isDevelopment, getLogLevel } from './config.js';

describe('Infrastructure - Logger', () => {
    let logger;

    beforeEach(() => {
        logger = new Logger('TestContext');
    });

    it('should create logger with context', () => {
        expect(logger.context).toBe('TestContext');
    });

    it('should format log messages with timestamp and context', () => {
        const message = logger.formatMessage('INFO', 'Test message');
        expect(message).toContain('[INFO]');
        expect(message).toContain('[TestContext]');
        expect(message).toContain('Test message');
    });

    it('should create child logger with combined context', () => {
        const child = logger.createChild('Child');
        expect(child.context).toBe('TestContext:Child');
    });

    it('should have correct log levels', () => {
        expect(CONFIG.LOG_LEVEL.DEBUG).toBe('debug');
        expect(CONFIG.LOG_LEVEL.INFO).toBe('info');
        expect(CONFIG.LOG_LEVEL.WARN).toBe('warn');
        expect(CONFIG.LOG_LEVEL.ERROR).toBe('error');
    });
});
