/**
 * Message Bus
 * Central event system for decoupled communication between components
 */

import { Logger } from './logger.js';
import { AppError } from './errors.js';

export class MessageBus {
    constructor(logger = null) {
        this.logger = logger || new Logger('MessageBus');
        this.handlers = new Map();
        this.middlewares = [];
        this.messageHistory = [];
        this.MAX_HISTORY = 100;
    }

    /**
     * Register handler for a message type
     */
    register(messageType, handler, options = {}) {
        if (!messageType || typeof handler !== 'function') {
            throw new AppError('Invalid message type or handler');
        }

        if (!this.handlers.has(messageType)) {
            this.handlers.set(messageType, []);
        }

        const handlerWrapper = {
            fn: handler,
            once: options.once || false,
            priority: options.priority || 0
        };

        this.handlers.get(messageType).push(handlerWrapper);

        // Sort by priority (higher first)
        this.handlers.get(messageType).sort((a, b) => b.priority - a.priority);

        this.logger.debug('Handler registered', { messageType, priority: options.priority });

        // Return unsubscribe function
        return () => this.unregister(messageType, handler);
    }

    /**
     * Register handler for single message (auto-unsubscribe)
     */
    registerOnce(messageType, handler, options = {}) {
        return this.register(messageType, handler, { ...options, once: true });
    }

    /**
     * Unregister handler
     */
    unregister(messageType, handler) {
        if (!this.handlers.has(messageType)) return;

        const handlers = this.handlers.get(messageType);
        const index = handlers.findIndex(h => h.fn === handler);

        if (index !== -1) {
            handlers.splice(index, 1);
            this.logger.debug('Handler unregistered', { messageType });
        }
    }

    /**
     * Add middleware
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new AppError('Middleware must be a function');
        }
        this.middlewares.push(middleware);
    }

    /**
     * Emit message
     */
    async emit(message) {
        const startTime = performance.now();

        if (!message || !message.type) {
            throw new AppError('Message must have a type property');
        }

        // Apply middlewares
        let processedMessage = message;
        for (const middleware of this.middlewares) {
            processedMessage = await middleware(processedMessage);
        }

        // Record in history
        this.addToHistory(processedMessage);

        const handlers = this.handlers.get(processedMessage.type) || [];

        if (handlers.length === 0) {
            this.logger.warn('No handlers for message type', { type: processedMessage.type });
            return null;
        }

        this.logger.debug('Emitting message', { 
            type: processedMessage.type, 
            handlerCount: handlers.length 
        });

        const results = [];

        for (const handlerWrapper of handlers) {
            try {
                const result = await handlerWrapper.fn(processedMessage);
                results.push(result);

                if (handlerWrapper.once) {
                    this.unregister(processedMessage.type, handlerWrapper.fn);
                }
            } catch (error) {
                this.logger.error('Handler error', error);
                results.push({ error: error.message });
            }
        }

        const duration = performance.now() - startTime;
        this.logger.debug('Message processed', { 
            type: processedMessage.type, 
            duration: duration.toFixed(2) 
        });

        return results.length === 1 ? results[0] : results;
    }

    /**
     * Emit and wait for response from single handler
     */
    async request(message) {
        const result = await this.emit(message);
        return Array.isArray(result) ? result[0] : result;
    }

    /**
     * Add message to history
     */
    addToHistory(message) {
        this.messageHistory.push({
            ...message,
            timestamp: new Date().toISOString()
        });

        // Keep only recent messages
        if (this.messageHistory.length > this.MAX_HISTORY) {
            this.messageHistory = this.messageHistory.slice(-this.MAX_HISTORY);
        }
    }

    /**
     * Get message history
     */
    getHistory() {
        return [...this.messageHistory];
    }

    /**
     * Clear all handlers
     */
    clear() {
        this.handlers.clear();
        this.messageHistory = [];
        this.logger.info('MessageBus cleared');
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            handlerCount: this.handlers.size,
            messageTypes: Array.from(this.handlers.keys()),
            historySize: this.messageHistory.length
        };
    }
}
