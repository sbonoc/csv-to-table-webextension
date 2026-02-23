import { describe, it, expect, beforeEach } from 'vitest';
import { Logger } from '../../../src/infrastructure/logger.js';
import { CONFIG, isDevelopment, getLogLevel } from '../../../src/infrastructure/config.js';

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

    it('should sanitize sensitive log payload keys', () => {
        logger.logLevel = 0;

        logger.info('Sensitive payload', {
            token: 'super-secret-token',
            mapping: { 0: 'email' },
            csvRow: ['john@example.com'],
            safeValue: 'ok'
        });

        expect(console.info.mock.calls.length).toBeGreaterThan(0);
        const [, payload] = console.info.mock.calls[0];
        expect(payload.token).toBe('[REDACTED]');
        expect(payload.mapping).toBe('[REDACTED]');
        expect(payload.csvRow).toBe('[REDACTED]');
        expect(payload.safeValue).toBe('ok');
    });

    it('should sanitize error objects in logs', () => {
        const error = new Error('Boom');
        logger.error('Operation failed', error);

        const [, payload] = console.error.mock.calls[0];
        expect(payload.name).toBe('Error');
        expect(payload.message).toBe('Boom');
    });
});
