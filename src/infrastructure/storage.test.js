import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageRepository } from './storage.js';
import { Logger } from './logger.js';
import { StorageError } from './errors.js';
import { CONFIG } from './config.js';

describe('Infrastructure - StorageRepository', () => {
    let storage;
    let logger;

    beforeEach(() => {
        logger = new Logger('TestStorage');
        storage = new StorageRepository(logger);
    });

    it('should retrieve mapping config', async () => {
        const mockMapping = { '0': 'name', '1': 'email' };
        global.browser.storage.local.get = vi.fn(async () => ({
            [CONFIG.STORAGE_KEYS.MAPPING]: mockMapping
        }));

        const result = await storage.getMappingConfig();
        expect(result).toEqual(mockMapping);
    });

    it('should return empty object if no mapping exists', async () => {
        global.browser.storage.local.get = vi.fn(async () => ({}));

        const result = await storage.getMappingConfig();
        expect(result).toEqual({});
    });

    it('should save mapping config', async () => {
        const mockMapping = { '0': 'name' };
        global.browser.storage.local.set = vi.fn(async () => {});

        await storage.saveMappingConfig(mockMapping);

        expect(global.browser.storage.local.set).toHaveBeenCalled();
        const args = global.browser.storage.local.set.mock.calls[0][0];
        expect(args[CONFIG.STORAGE_KEYS.MAPPING]).toEqual(mockMapping);
        expect(args.lastMappingUpdate).toBeDefined();
    });

    it('should throw StorageError on get failure', async () => {
        global.browser.storage.local.get = vi.fn(async () => {
            throw new Error('Storage access denied');
        });

        await expect(storage.getMappingConfig()).rejects.toThrow(StorageError);
    });

    it('should throw error if mapping is not an object', async () => {
        await expect(storage.saveMappingConfig('invalid')).rejects.toThrow();
        await expect(storage.saveMappingConfig(null)).rejects.toThrow();
    });

    it('should add to history', async () => {
        global.browser.storage.local.get = vi.fn(async () => ({}));
        global.browser.storage.local.set = vi.fn(async () => {});

        const item = { mapping: { '0': 'name' } };
        await storage.addToHistory('csvHistory', item);

        expect(global.browser.storage.local.set).toHaveBeenCalled();
        const args = global.browser.storage.local.set.mock.calls[0][0];
        expect(Array.isArray(args.csvHistory)).toBe(true);
        expect(args.csvHistory[0].timestamp).toBeDefined();
    });

    it('should clear all storage', async () => {
        global.browser.storage.local.clear = vi.fn(async () => {});

        await storage.clear();
        expect(global.browser.storage.local.clear).toHaveBeenCalled();
    });
});
