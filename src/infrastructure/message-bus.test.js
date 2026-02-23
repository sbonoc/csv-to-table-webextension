import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageBus } from './message-bus.js';
import { Logger } from './logger.js';
import { AppError } from './errors.js';

describe('Infrastructure - MessageBus', () => {
    let messageBus;
    let logger;

    beforeEach(() => {
        logger = new Logger('TestBus');
        messageBus = new MessageBus(logger);
    });

    it('should register handler for message type', () => {
        const handler = vi.fn();
        messageBus.register('TEST_MESSAGE', handler);

        expect(messageBus.handlers.has('TEST_MESSAGE')).toBe(true);
    });

    it('should emit message to registered handlers', async () => {
        const handler = vi.fn(async () => ({ success: true }));
        messageBus.register('TEST_MESSAGE', handler);

        const result = await messageBus.emit({ type: 'TEST_MESSAGE', data: 'test' });

        expect(handler).toHaveBeenCalledWith({ type: 'TEST_MESSAGE', data: 'test' });
        expect(result.success).toBe(true);
    });

    it('should emit to multiple handlers', async () => {
        const handler1 = vi.fn(async () => 'result1');
        const handler2 = vi.fn(async () => 'result2');

        messageBus.register('TEST', handler1);
        messageBus.register('TEST', handler2);

        const results = await messageBus.emit({ type: 'TEST' });

        expect(Array.isArray(results)).toBe(true);
        expect(results).toHaveLength(2);
    });

    it('should support handler priority', async () => {
        const results = [];
        const handler1 = vi.fn(async () => results.push(1));
        const handler2 = vi.fn(async () => results.push(2));

        messageBus.register('TEST', handler2, { priority: 0 });
        messageBus.register('TEST', handler1, { priority: 10 });

        await messageBus.emit({ type: 'TEST' });

        expect(results).toEqual([1, 2]); // Higher priority first
    });

    it('should unregister handlers', async () => {
        const handler = vi.fn();
        messageBus.register('TEST', handler);
        messageBus.unregister('TEST', handler);

        await messageBus.emit({ type: 'TEST' });

        expect(handler).not.toHaveBeenCalled();
    });

    it('should register once handler and auto-unsubscribe', async () => {
        const handler = vi.fn(async () => ({}));
        messageBus.registerOnce('TEST', handler);

        await messageBus.emit({ type: 'TEST' });
        await messageBus.emit({ type: 'TEST' });

        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should store message history', async () => {
        messageBus.register('TEST', vi.fn(async () => ({})));

        await messageBus.emit({ type: 'TEST', data: 'test1' });
        await messageBus.emit({ type: 'TEST', data: 'test2' });

        const history = messageBus.getHistory();
        expect(history).toHaveLength(2);
        expect(history[0].type).toBe('TEST');
        expect(history[0].timestamp).toBeDefined();
    });

    it('should throw error if message has no type', async () => {
        await expect(messageBus.emit({ data: 'no type' })).rejects.toThrow(AppError);
    });

    it('should request and return single result', async () => {
        messageBus.register('TEST', vi.fn(async () => ({ data: 'response' })));

        const result = await messageBus.request({ type: 'TEST' });

        expect(result.data).toBe('response');
    });

    it('should handle middleware', async () => {
        const middleware = vi.fn(async (msg) => ({
            ...msg,
            processed: true
        }));

        messageBus.use(middleware);
        messageBus.register('TEST', vi.fn(async (msg) => msg));

        await messageBus.emit({ type: 'TEST' });

        expect(middleware).toHaveBeenCalled();
    });

    it('should provide statistics', () => {
        messageBus.register('TEST1', vi.fn());
        messageBus.register('TEST2', vi.fn());

        const stats = messageBus.getStats();

        expect(stats.handlerCount).toBe(2);
        expect(stats.messageTypes).toContain('TEST1');
        expect(stats.messageTypes).toContain('TEST2');
    });
});
