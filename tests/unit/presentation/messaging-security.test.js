import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBrowserMock } from '../../mocks/browser.js';

function callOnMessageListener(listener, request, sender) {
  return new Promise((resolve) => {
    listener(request, sender, (response) => resolve(response));
  });
}

describe('Presentation - Messaging Security', () => {
  beforeEach(async () => {
    vi.resetModules();
    global.browser = createBrowserMock();
  });

  describe('Background message hardening', () => {
    it('should reject unauthorized sender', async () => {
      await import('../../../src/presentation/background.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        { action: 'getMappingConfig' },
        { id: 'malicious@attacker', url: 'moz-extension://malicious/popup.html' }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unauthorized');
    });

    it('should reject invalid actions', async () => {
      await import('../../../src/presentation/background.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        { action: 'dropDatabase' },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/popup.html` }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid or unauthorized action');
    });

    it('should reject malicious mapping payloads', async () => {
      await import('../../../src/presentation/background.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        {
          action: 'saveMappingConfig',
          data: {
            mapping: {
              '-1': 'fieldName'
            }
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/popup.html` }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid mapping index');
    });
  });

  describe('Content script message hardening', () => {
    it('should reject unauthorized sender', async () => {
      await import('../../../src/presentation/content-script.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        { action: 'getTableInfo' },
        { id: 'bad@sender', url: 'moz-extension://bad/sender.html' }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unauthorized');
    });

    it('should reject fillTable with oversized csvRow', async () => {
      await import('../../../src/presentation/content-script.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const oversizedRow = new Array(501).fill('x');

      const response = await callOnMessageListener(
        listener,
        {
          action: 'fillTable',
          data: {
            tableIndex: 0,
            mapping: { '0': 'fieldA' },
            csvRow: oversizedRow
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/popup.html` }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('CSV row exceeds allowed size');
    });

    it('should reject fillTable with invalid table index type', async () => {
      await import('../../../src/presentation/content-script.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        {
          action: 'fillTable',
          data: {
            tableIndex: '0',
            mapping: { '0': 'fieldA' },
            csvRow: ['value']
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/popup.html` }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Table index is required');
    });
  });
});
