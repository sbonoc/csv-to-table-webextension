import { vi } from 'vitest';
import { createBrowserMock } from './mocks/browser.js';

// Setup global mocks before all tests
global.browser = createBrowserMock();

// Mock para console para evitar spam en tests
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

// Mock para File API si es necesario
if (!global.File) {
  global.File = class File extends Blob {
    constructor(bits, filename, options) {
      super(bits, options);
      this.name = filename;
      this.lastModified = options?.lastModified || Date.now();
    }
  };
}
