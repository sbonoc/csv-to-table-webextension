import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '../infrastructure/container.js';
import { Logger } from '../infrastructure/logger.js';
import { StorageRepository } from '../infrastructure/storage.js';

describe('Infrastructure - Container (Dependency Injection)', () => {
    let container;

    beforeEach(() => {
        container = new Container();
    });

    it('should register service factory', () => {
        container.register('testService', () => ({ value: 'test' }));
        expect(container.has('testService')).toBe(true);
    });

    it('should return service instance', () => {
        container.register('testService', () => ({ value: 'test' }));
        const instance = container.get('testService');

        expect(instance.value).toBe('test');
    });

    it('should return same singleton instance', () => {
        container.register('testService', () => ({ value: Math.random() }), { singleton: true });

        const instance1 = container.get('testService');
        const instance2 = container.get('testService');

        expect(instance1).toBe(instance2);
        expect(instance1.value).toBe(instance2.value);
    });

    it('should create new instance if not singleton', () => {
        container.register('testService', () => ({ value: Math.random() }), { singleton: false });

        const instance1 = container.get('testService');
        const instance2 = container.get('testService');

        expect(instance1).not.toBe(instance2);
        expect(instance1.value).not.toBe(instance2.value);
    });

    it('should support dependency injection', () => {
        container.register('dependency', () => ({ name: 'dep' }));
        container.register('service', (c) => {
            const dep = c.get('dependency');
            return { dep };
        });

        const service = container.get('service');
        expect(service.dep.name).toBe('dep');
    });

    it('should throw error for unknown service', () => {
        expect(() => container.get('nonexistent')).toThrow('not found');
    });

    it('should initialize default services', () => {
        container.initializeDefaultServices();

        expect(container.has('logger')).toBe(true);
        expect(container.has('storage')).toBe(true);
        expect(container.has('messageBus')).toBe(true);
    });

    it('should create child container with same services', () => {
        container.register('service1', () => 'value1');
        container.register('service2', () => 'value2');

        const child = container.createChild();

        expect(child.has('service1')).toBe(true);
        expect(child.has('service2')).toBe(true);
    });

    it('should reset singletons', () => {
        let callCount = 0;
        container.register('service', () => {
            callCount++;
            return { id: callCount };
        });

        const instance1 = container.get('service');
        expect(callCount).toBe(1);

        container.resetSingletons();

        const instance2 = container.get('service');
        expect(callCount).toBe(2);
        expect(instance1.id).not.toBe(instance2.id);
    });

    it('should get all service names', () => {
        container.register('service1', () => ({}));
        container.register('service2', () => ({}));

        const names = container.getServiceNames();
        expect(names).toContain('service1');
        expect(names).toContain('service2');
    });
});
