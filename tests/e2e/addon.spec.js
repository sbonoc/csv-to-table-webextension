import { test, expect } from './fixtures.js';

/**
 * E2E Tests for CSV to Table Filler Extension
 *
 * Fixture columns:
 * - NRUA (alfanumérico)
 * - Finalidad (alfanumérico)
 * - Nº huéspedes (numérico)
 * - Fecha de entrada (dd.mm.aaaa)
 * - Fecha de salida (dd.mm.aaaa)
 * - Sin actividad (checkbox)
 */

test.describe('CSV to Table Filler - Form Accessibility', () => {
  test('should load table form with all required fields', async ({ testContext }) => {
    const { page } = testContext;

    await expect(page).toHaveTitle(/CSV to Table Filler/);
    await page.waitForSelector('#guestTable', { timeout: 5000 });

    await page.waitForSelector('#nrua', { timeout: 5000 });
    await page.waitForSelector('#finalidad', { timeout: 5000 });
    await page.waitForSelector('#numHuespedes', { timeout: 5000 });
    await page.waitForSelector('#fechaEntrada', { timeout: 5000 });
    await page.waitForSelector('#fechaSalida', { timeout: 5000 });
    await page.waitForSelector('#sinActividad', { timeout: 5000 });

    const submitBtn = page.locator('#submitBtn');
    await expect(submitBtn).toBeVisible();
  });

  test('should have correctly labeled table columns', async ({ testContext }) => {
    const { page } = testContext;

    await expect(page.locator('label[for="nrua"]')).toContainText('NRUA');
    await expect(page.locator('label[for="finalidad"]')).toContainText('Purpose');
    await expect(page.locator('label[for="numHuespedes"]')).toContainText('Guests count');
    await expect(page.locator('label[for="fechaEntrada"]')).toContainText('Check-in date (dd.mm.yyyy)');
    await expect(page.locator('label[for="fechaSalida"]')).toContainText('Check-out date (dd.mm.yyyy)');
    await expect(page.locator('label[for="sinActividad"]')).toContainText('No activity');
  });

  test('should have required input types and date format pattern', async ({ testContext }) => {
    const { page } = testContext;

    await expect(page.locator('#nrua')).toHaveAttribute('type', 'text');
    await expect(page.locator('#finalidad')).toHaveAttribute('type', 'text');
    await expect(page.locator('#numHuespedes')).toHaveAttribute('type', 'number');
    await expect(page.locator('#fechaEntrada')).toHaveAttribute('pattern', '^\\d{2}\\.\\d{2}\\.\\d{4}$');
    await expect(page.locator('#fechaSalida')).toHaveAttribute('pattern', '^\\d{2}\\.\\d{2}\\.\\d{4}$');
    await expect(page.locator('#sinActividad')).toHaveAttribute('type', 'checkbox');
  });
});

test.describe('CSV to Table Filler - Data Injection & Filling', () => {
  test('should fill table row with single CSV row (Happy Path)', async ({ testContext }) => {
    const { fillFormWithCSVData, assertFieldValue, getFormData } = testContext;

    const csvRow = {
      'NRUA': 'ABC123X',
      'Finalidad': 'Turismo',
      'Nº huéspedes': '3',
      'Fecha de entrada (dd.mm.aaaa)': '21.02.2026',
      'Fecha de salida (dd.mm.aaaa)': '24.02.2026',
      'Sin actividad': true
    };

    await fillFormWithCSVData(csvRow);

    expect(await assertFieldValue('nrua', 'ABC123X')).toBe(true);
    expect(await assertFieldValue('finalidad', 'Turismo')).toBe(true);
    expect(await assertFieldValue('numHuespedes', '3')).toBe(true);
    expect(await assertFieldValue('fechaEntrada', '21.02.2026')).toBe(true);
    expect(await assertFieldValue('fechaSalida', '24.02.2026')).toBe(true);
    expect(await assertFieldValue('sinActividad', true)).toBe(true);

    const formData = await getFormData();
    expect(formData.sinActividad).toBe(true);
  });

  test('should fill table row with different CSV data', async ({ testContext }) => {
    const { fillFormWithCSVData, getFormData, resetForm } = testContext;

    const csvRow = {
      'NRUA': 'ZX9K2',
      'Finalidad': 'Trabajo',
      'Nº huéspedes': '1',
      'Fecha de entrada (dd.mm.aaaa)': '01.03.2026',
      'Fecha de salida (dd.mm.aaaa)': '05.03.2026',
      'Sin actividad': false
    };

    await fillFormWithCSVData(csvRow);

    const formData = await getFormData();
    expect(formData.nrua).toBe('ZX9K2');
    expect(formData.finalidad).toBe('Trabajo');
    expect(formData.numHuespedes).toBe('1');
    expect(formData.fechaEntrada).toBe('01.03.2026');
    expect(formData.fechaSalida).toBe('05.03.2026');
    expect(formData.sinActividad).toBe(false);

    await resetForm();
  });

  test('should handle alphanumeric and unicode values', async ({ testContext }) => {
    const { fillFormWithCSVData, assertFieldValue } = testContext;

    const csvRow = {
      'NRUA': 'ÑX-99A7',
      'Finalidad': 'Vacación familiar',
      'Nº huéspedes': '5',
      'Fecha de entrada (dd.mm.aaaa)': '10.04.2026',
      'Fecha de salida (dd.mm.aaaa)': '20.04.2026',
      'Sin actividad': 'sí'
    };

    await fillFormWithCSVData(csvRow);

    expect(await assertFieldValue('nrua', 'ÑX-99A7')).toBe(true);
    expect(await assertFieldValue('finalidad', 'Vacación familiar')).toBe(true);
    expect(await assertFieldValue('numHuespedes', '5')).toBe(true);
    expect(await assertFieldValue('sinActividad', true)).toBe(true);
  });
});

test.describe('CSV to Table Filler - Form Submission', () => {
  test('should submit form with filled data', async ({ testContext }) => {
    const { fillFormWithCSVData, submitAndVerifySuccess } = testContext;

    const csvRow = {
      'NRUA': 'SUBM123',
      'Finalidad': 'Evento',
      'Nº huéspedes': '2',
      'Fecha de entrada (dd.mm.aaaa)': '11.05.2026',
      'Fecha de salida (dd.mm.aaaa)': '13.05.2026',
      'Sin actividad': false
    };

    await fillFormWithCSVData(csvRow);
    const submitted = await submitAndVerifySuccess();

    expect(submitted).toBe(true);
  });

  test('should show success message after submission', async ({ testContext }) => {
    const { fillFormWithCSVData, page } = testContext;

    const csvRow = {
      'NRUA': 'OK2026',
      'Finalidad': 'Turismo',
      'Nº huéspedes': '4',
      'Fecha de entrada (dd.mm.aaaa)': '15.06.2026',
      'Fecha de salida (dd.mm.aaaa)': '19.06.2026',
      'Sin actividad': true
    };

    await fillFormWithCSVData(csvRow);

    const submitBtn = page.locator('#submitBtn');
    await submitBtn.click();

    const successMessage = page.locator('#successMessage');
    await expect(successMessage).toHaveClass(/show/);
    await expect(successMessage).toContainText('submitted successfully');
  });

  test('should reset form after submission', async ({ testContext }) => {
    const { fillFormWithCSVData, getFormData, resetForm } = testContext;

    const csvRow = {
      'NRUA': 'RST999',
      'Finalidad': 'Negocios',
      'Nº huéspedes': '6',
      'Fecha de entrada (dd.mm.aaaa)': '01.07.2026',
      'Fecha de salida (dd.mm.aaaa)': '07.07.2026',
      'Sin actividad': true
    };

    await fillFormWithCSVData(csvRow);
    await resetForm();

    const formData = await getFormData();
    expect(formData.nrua).toBe('');
    expect(formData.finalidad).toBe('');
    expect(formData.numHuespedes).toBe('');
    expect(formData.fechaEntrada).toBe('');
    expect(formData.fechaSalida).toBe('');
    expect(formData.sinActividad).toBe(false);
  });
});

test.describe('CSV to Table Filler - Batch Processing', () => {
  test('should process multiple CSV rows sequentially', async ({ testContext }) => {
    const { fillFormWithCSVData, submitAndVerifySuccess, resetForm, getFormData } = testContext;

    const csvRows = [
      {
        'NRUA': 'SEQ001',
        'Finalidad': 'Turismo',
        'Nº huéspedes': '2',
        'Fecha de entrada (dd.mm.aaaa)': '01.08.2026',
        'Fecha de salida (dd.mm.aaaa)': '03.08.2026',
        'Sin actividad': false
      },
      {
        'NRUA': 'SEQ002',
        'Finalidad': 'Negocios',
        'Nº huéspedes': '1',
        'Fecha de entrada (dd.mm.aaaa)': '05.08.2026',
        'Fecha de salida (dd.mm.aaaa)': '06.08.2026',
        'Sin actividad': true
      },
      {
        'NRUA': 'SEQ003',
        'Finalidad': 'Evento',
        'Nº huéspedes': '5',
        'Fecha de entrada (dd.mm.aaaa)': '10.08.2026',
        'Fecha de salida (dd.mm.aaaa)': '12.08.2026',
        'Sin actividad': false
      }
    ];

    for (const row of csvRows) {
      await fillFormWithCSVData(row);

      const formData = await getFormData();
      expect(formData.nrua).toBe(row.NRUA);
      expect(formData.finalidad).toBe(row.Finalidad);
      expect(formData.numHuespedes).toBe(row['Nº huéspedes']);
      expect(formData.fechaEntrada).toBe(row['Fecha de entrada (dd.mm.aaaa)']);
      expect(formData.fechaSalida).toBe(row['Fecha de salida (dd.mm.aaaa)']);

      await submitAndVerifySuccess();
      await resetForm();
    }
  });

  test('should handle mixed checkbox states in batch processing', async ({ testContext }) => {
    const { fillFormWithCSVData, submitAndVerifySuccess, resetForm, getFormData } = testContext;

    const csvRows = [
      {
        'NRUA': 'CHK001',
        'Finalidad': 'Turismo',
        'Nº huéspedes': '2',
        'Fecha de entrada (dd.mm.aaaa)': '14.09.2026',
        'Fecha de salida (dd.mm.aaaa)': '15.09.2026',
        'Sin actividad': true
      },
      {
        'NRUA': 'CHK002',
        'Finalidad': 'Trabajo',
        'Nº huéspedes': '3',
        'Fecha de entrada (dd.mm.aaaa)': '20.09.2026',
        'Fecha de salida (dd.mm.aaaa)': '22.09.2026',
        'Sin actividad': false
      },
      {
        'NRUA': 'CHK003',
        'Finalidad': 'Evento',
        'Nº huéspedes': '1',
        'Fecha de entrada (dd.mm.aaaa)': '25.09.2026',
        'Fecha de salida (dd.mm.aaaa)': '26.09.2026',
        'Sin actividad': true
      }
    ];

    let processedCount = 0;
    for (const row of csvRows) {
      await fillFormWithCSVData(row);

      const formData = await getFormData();
      expect(formData.nrua).toBeTruthy();
      expect(formData.finalidad).toBeTruthy();
      expect(formData.numHuespedes).toBeTruthy();
      expect(formData.fechaEntrada).toBeTruthy();
      expect(formData.fechaSalida).toBeTruthy();
      expect(formData.sinActividad).toBe(Boolean(row['Sin actividad']));

      processedCount++;

      if (processedCount === csvRows.length) {
        await submitAndVerifySuccess();
      } else {
        await resetForm();
      }
    }

    expect(processedCount).toBe(3);
  });
});

test.describe('CSV to Table Filler - Error Handling', () => {
  test('should not accept empty form submission (validation)', async ({ testContext }) => {
    const { page } = testContext;

    const form = page.locator('form#guestForm');
    const isValid = await form.evaluate((f) => f.checkValidity());
    expect(isValid).toBe(false);
  });

  test('should clear previous data when resetting form', async ({ testContext }) => {
    const { fillFormWithCSVData, resetForm, getFormData } = testContext;

    await fillFormWithCSVData({
      'NRUA': 'CLR777',
      'Finalidad': 'Prueba',
      'Nº huéspedes': '7',
      'Fecha de entrada (dd.mm.aaaa)': '01.10.2026',
      'Fecha de salida (dd.mm.aaaa)': '10.10.2026',
      'Sin actividad': true
    });

    await resetForm();

    const formData = await getFormData();
    expect(formData.nrua).toBe('');
    expect(formData.finalidad).toBe('');
    expect(formData.numHuespedes).toBe('');
    expect(formData.fechaEntrada).toBe('');
    expect(formData.fechaSalida).toBe('');
    expect(formData.sinActividad).toBe(false);
  });

  test('should handle partial CSV rows gracefully', async ({ testContext }) => {
    const { fillFormWithCSVData, getFormData } = testContext;

    const partialRow = {
      'NRUA': 'PART01',
      'Finalidad': 'Parcial',
      'Nº huéspedes': '2'
    };

    await fillFormWithCSVData(partialRow);

    const formData = await getFormData();
    expect(formData.nrua).toBe('PART01');
    expect(formData.finalidad).toBe('Parcial');
    expect(formData.numHuespedes).toBe('2');
    expect(formData.fechaEntrada).toBe('');
    expect(formData.fechaSalida).toBe('');
    expect(formData.sinActividad).toBe(false);
  });
});

test.describe('CSV to Table Filler - Performance & Limits', () => {
  test('should handle 100 rows in reasonable time', async ({ testContext }) => {
    const { fillFormWithCSVData, resetForm } = testContext;

    const startTime = Date.now();
    const rowCount = 100;

    for (let i = 0; i < rowCount; i++) {
      const dayIn = String((i % 28) + 1).padStart(2, '0');
      const dayOut = String(((i + 1) % 28) + 1).padStart(2, '0');

      const row = {
        'NRUA': `NRUA${i}`,
        'Finalidad': ['Turismo', 'Trabajo', 'Evento'][i % 3],
        'Nº huéspedes': String((i % 8) + 1),
        'Fecha de entrada (dd.mm.aaaa)': `${dayIn}.11.2026`,
        'Fecha de salida (dd.mm.aaaa)': `${dayOut}.11.2026`,
        'Sin actividad': i % 2 === 0
      };

      await fillFormWithCSVData(row);
      await resetForm();
    }

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(120000);
  });
});
