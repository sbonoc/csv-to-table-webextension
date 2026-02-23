/**
 * Dependency Injection Container
 * Manages service creation and lifecycle
 */

import { Logger, globalLogger } from './logger.js';
import { StorageRepository } from './storage.js';
import { MessageBus } from './message-bus.js';

export class Container {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.globalLogger = globalLogger;
    }

    /**
     * Register a service factory
     */
    register(name, factory, options = {}) {
        if (typeof name !== 'string' || typeof factory !== 'function') {
            throw new Error('Service name must be string and factory must be function');
        }

        this.services.set(name, {
            factory,
            singleton: options.singleton !== false, // default to singleton
            lazy: options.lazy !== false
        });

        this.globalLogger.debug('Service registered', { name, singleton: options.singleton });
    }

    /**
     * Get service instance
     */
    get(name) {
        if (!this.services.has(name)) {
            throw new Error(`Service '${name}' not found in container`);
        }

        const serviceConfig = this.services.get(name);

        // Return cached singleton
        if (serviceConfig.singleton && this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Create new instance
        const instance = serviceConfig.factory(this);

        // Cache singleton
        if (serviceConfig.singleton) {
            this.singletons.set(name, instance);
        }

        return instance;
    }

    /**
     * Check if service exists
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Initialize container with default services
     */
    initializeDefaultServices() {
        // Logger
        this.register('logger', () => globalLogger);

        // Storage
        this.register('storage', (c) => new StorageRepository(c.get('logger')));

        // Message Bus
        this.register('messageBus', (c) => new MessageBus(c.get('logger')));

        this.globalLogger.info('Container initialized with default services');
    }

    /**
     * Create child container with same service definitions
     */
    createChild() {
        const child = new Container();
        
        // Copy service definitions
        for (const [name, config] of this.services.entries()) {
            child.services.set(name, config);
        }

        return child;
    }

    /**
     * Get all registered service names
     */
    getServiceNames() {
        return Array.from(this.services.keys());
    }

    /**
     * Reset all singletons (useful for testing)
     */
    resetSingletons() {
        this.singletons.clear();
    }

    /**
     * Clear entire container
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
    }
}

/**
 * Global container instance
 */
export const globalContainer = new Container();
