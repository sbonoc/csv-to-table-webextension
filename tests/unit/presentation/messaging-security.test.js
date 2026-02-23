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
      await import('../../../src/presentation/background.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        { action: 'getMappingConfig' },
        { id: 'malicious@attacker', url: 'moz-extension://malicious/sidebar.html' }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unauthorized');
    });

    it('should reject invalid actions', async () => {
      await import('../../../src/presentation/background.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        { action: 'dropDatabase' },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid or unauthorized action');
    });

    it('should reject malicious mapping payloads', async () => {
      await import('../../../src/presentation/background.bootstrap.js');

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
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid mapping index');
    });
  });

  describe('Content script message hardening', () => {
    it('should expose mapping fields from first editable table row only', async () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr>
              <td><input name="nrua" /></td>
              <td><input name="finalidad" /></td>
            </tr>
            <tr>
              <td><input name="nrua_2" /></td>
              <td><input name="finalidad_2" /></td>
            </tr>
          </tbody>
        </table>
      `;

      await import('../../../src/presentation/content-script.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        { action: 'getTableInfo' },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(true);
      expect(response.tables[0].fields.map(field => field.name)).toEqual(['nrua', 'finalidad']);
      expect(response.tables[0].fieldsCount).toBe(2);
    });

    it('should scroll to target table when highlight request enables scroll', async () => {
      document.body.innerHTML = `
        <table id="target-table">
          <tbody>
            <tr>
              <td><input name="nrua" /></td>
            </tr>
          </tbody>
        </table>
      `;

      const targetTable = document.getElementById('target-table');
      targetTable.scrollIntoView = vi.fn();

      await import('../../../src/presentation/content-script.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        {
          action: 'highlightTargetTable',
          data: {
            tableIndex: 0,
            mapping: { '0': 'nrua' },
            scrollIntoView: true
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(true);
      expect(targetTable.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    });

    it('should highlight selected target table and mapped destination fields', async () => {
      document.body.innerHTML = `
        <table id="target-table">
          <tbody>
            <tr>
              <td><input name="nrua" /></td>
              <td><input name="finalidad" /></td>
            </tr>
          </tbody>
        </table>
      `;

      await import('../../../src/presentation/content-script.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        {
          action: 'highlightTargetTable',
          data: {
            tableIndex: 0,
            mapping: { '0': 'nrua', '1': 'finalidad' }
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(true);
      expect(document.querySelector('#target-table').classList.contains('csv-filler-target-table-highlight')).toBe(true);
      expect(document.querySelector('[name="nrua"]').classList.contains('csv-filler-target-field-highlight')).toBe(true);
      expect(document.querySelector('[name="finalidad"]').classList.contains('csv-filler-target-field-highlight')).toBe(true);
    });

    it('should normalize date values to dd.mm.yyyy when target field expects dot format', async () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr>
              <td><input name="fechaEntrada" pattern="^\\d{2}\\.\\d{2}\\.\\d{4}$" placeholder="dd.mm.aaaa" /></td>
            </tr>
            <tr>
              <td><input name="fechaEntrada_2" pattern="^\\d{2}\\.\\d{2}\\.\\d{4}$" placeholder="dd.mm.aaaa" /></td>
            </tr>
          </tbody>
        </table>
      `;

      await import('../../../src/presentation/content-script.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        {
          action: 'fillTable',
          data: {
            tableIndex: 0,
            mapping: { '0': 'fechaEntrada' },
            csvRows: [
              ['30/12/2025'],
              ['2026-01-05']
            ],
            dateFormatTransform: 'auto'
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(true);
      expect(document.querySelector('[name="fechaEntrada"]').value).toBe('30.12.2025');
      expect(document.querySelector('[name="fechaEntrada_2"]').value).toBe('05.01.2026');
    });

    it('should transform date to yyyy-mm-dd when explicit mode is selected', async () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr>
              <td><input name="fechaEntrada" pattern="^\\d{2}\\.\\d{2}\\.\\d{4}$" placeholder="dd.mm.aaaa" /></td>
            </tr>
          </tbody>
        </table>
      `;

      await import('../../../src/presentation/content-script.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        {
          action: 'fillTable',
          data: {
            tableIndex: 0,
            mapping: { '0': 'fechaEntrada' },
            csvRows: [['30/12/2025']],
            dateFormatTransform: 'yyyy-mm-dd'
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(true);
      expect(document.querySelector('[name="fechaEntrada"]').value).toBe('2025-12-30');
    });

    it('should fill mapped fields row by row when csvRows is provided', async () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr>
              <td><input name="nrua" /></td>
              <td><input name="finalidad" /></td>
            </tr>
            <tr>
              <td><input name="nrua_2" /></td>
              <td><input name="finalidad_2" /></td>
            </tr>
            <tr>
              <td><input name="nrua_3" /></td>
              <td><input name="finalidad_3" /></td>
            </tr>
          </tbody>
        </table>
      `;

      await import('../../../src/presentation/content-script.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        {
          action: 'fillTable',
          data: {
            tableIndex: 0,
            mapping: { '0': 'nrua', '1': 'finalidad' },
            csvRows: [
              ['A-001', 'Turismo'],
              ['A-002', 'Trabajo'],
              ['A-003', 'Otro']
            ]
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(true);
      expect(response.filled).toBe(6);
      expect(document.querySelector('[name="nrua"]').value).toBe('A-001');
      expect(document.querySelector('[name="finalidad"]').value).toBe('Turismo');
      expect(document.querySelector('[name="nrua_2"]').value).toBe('A-002');
      expect(document.querySelector('[name="finalidad_2"]').value).toBe('Trabajo');
      expect(document.querySelector('[name="nrua_3"]').value).toBe('A-003');
      expect(document.querySelector('[name="finalidad_3"]').value).toBe('Otro');
    });

    it('should return success when CSV has fewer rows than target table', async () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr><td><input name="nrua" /></td></tr>
            <tr><td><input name="nrua_2" /></td></tr>
            <tr><td><input name="nrua_3" /></td></tr>
          </tbody>
        </table>
      `;

      await import('../../../src/presentation/content-script.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        {
          action: 'fillTable',
          data: {
            tableIndex: 0,
            mapping: { '0': 'nrua' },
            csvRows: [['A-001'], ['A-002']]
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(true);
      expect(response.severity).toBe('success');
      expect(document.querySelector('[name="nrua"]').value).toBe('A-001');
      expect(document.querySelector('[name="nrua_2"]').value).toBe('A-002');
      expect(document.querySelector('[name="nrua_3"]').value).toBe('');
    });

    it('should return warning when CSV has more rows than target table', async () => {
      document.body.innerHTML = `
        <table>
          <tbody>
            <tr><td><input name="nrua" /></td></tr>
            <tr><td><input name="nrua_2" /></td></tr>
          </tbody>
        </table>
      `;

      await import('../../../src/presentation/content-script.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        {
          action: 'fillTable',
          data: {
            tableIndex: 0,
            mapping: { '0': 'nrua' },
            csvRows: [['A-001'], ['A-002'], ['A-003']]
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(true);
      expect(response.severity).toBe('warning');
      expect(response.message).toContain('CSV rows pending');
      expect(document.querySelector('[name="nrua"]').value).toBe('A-001');
      expect(document.querySelector('[name="nrua_2"]').value).toBe('A-002');
    });

    it('should reject unauthorized sender', async () => {
      await import('../../../src/presentation/content-script.bootstrap.js');

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
      await import('../../../src/presentation/content-script.bootstrap.js');

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
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('CSV row exceeds allowed size');
    });

    it('should reject fillTable with invalid table index type', async () => {
      await import('../../../src/presentation/content-script.bootstrap.js');

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
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Table index is required');
    });

    it('should reject fillTable with invalid date transform option', async () => {
      await import('../../../src/presentation/content-script.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        {
          action: 'fillTable',
          data: {
            tableIndex: 0,
            mapping: { '0': 'fieldA' },
            csvRow: ['30/12/2025'],
            dateFormatTransform: 'invalid-mode'
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid date format transform option');
    });

    it('should reject highlightTargetTable with invalid mapping type', async () => {
      await import('../../../src/presentation/content-script.bootstrap.js');

      const [listener] = global.browser.runtime.getListeners('onMessage');
      const response = await callOnMessageListener(
        listener,
        {
          action: 'highlightTargetTable',
          data: {
            tableIndex: 0,
            mapping: []
          }
        },
        { id: global.browser.runtime.id, url: `moz-extension://${global.browser.runtime.id}/sidebar.html` }
      );

      expect(response.success).toBe(false);
      expect(response.error).toContain('Mapping must be an object');
    });
  });
});
