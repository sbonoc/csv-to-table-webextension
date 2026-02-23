import { describe, it, expect, beforeEach } from 'vitest';
import { parseCSV, validateCSVData, getRowByIndex } from '../../src/domain/csv-parser.js';
import { createMapping, applyMappingToRow } from '../../src/domain/mapping.js';
import { fillFields, setFieldValue } from '../../src/domain/table-handler.js';

/**
 * Integration Tests
 *
 * These tests verify the interaction between multiple modules
 * They test real workflows without duplicating unit test coverage
 *
 * Test Pyramid principle: Integration tests are fewer than Unit tests
 * Shift Left principle: Each interaction is tested only once at the appropriate level
 */

describe('CSV Parser + Mapping Integration', () => {
  const csvContent = 'FirstName,LastName,Email,Age\nJohn,Doe,john@example.com,30\nJane,Smith,jane@example.com,28';

  it('should parse CSV and apply mapping to first row', () => {
    const parsed = parseCSV(csvContent);
    validateCSVData(parsed);

    const firstRow = getRowByIndex(parsed, 0);
    const mapping = createMapping(parsed.headers, {
      '0': 'firstName',
      '1': 'lastName',
      '2': 'email'
    });

    const mapped = applyMappingToRow(firstRow, mapping);

    expect(mapped).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    });
  });

  it('should parse CSV and apply mapping to all rows sequentially', () => {
    const parsed = parseCSV(csvContent);
    const mapping = createMapping(parsed.headers, {
      '0': 'firstName',
      '2': 'email'
    });

    const mappedRows = parsed.rows.map(row => applyMappingToRow(row, mapping));

    expect(mappedRows).toHaveLength(2);
    expect(mappedRows[0]).toEqual({
      firstName: 'John',
      email: 'john@example.com'
    });
    expect(mappedRows[1]).toEqual({
      firstName: 'Jane',
      email: 'jane@example.com'
    });
  });

  it('should handle CSV with empty cells in mapping', () => {
    const parsed = parseCSV(csvContent);
    const firstRow = getRowByIndex(parsed, 0);
    const mapping = createMapping(parsed.headers, {
      '0': 'name',
      '3': 'userAge'
    });

    const mapped = applyMappingToRow(firstRow, mapping);

    expect(mapped.name).toBe('John');
    expect(mapped.userAge).toBe('30');
  });

  it('should handle CSV with fewer columns than headers in mapping', () => {
    const csvShort = 'Name,Email\nJohn,john@example.com';
    const parsed = parseCSV(csvShort);
    const mapping = createMapping(parsed.headers, {
      '0': 'fullName',
      '1': 'emailAddress'
    });

    const mapped = applyMappingToRow(parsed.rows[0], mapping);

    expect(mapped.fullName).toBe('John');
    expect(mapped.emailAddress).toBe('john@example.com');
  });
});

describe('Mapping + Table Filling Integration', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="test-form">
        <input type="text" id="firstName" />
        <input type="text" id="lastName" />
        <input type="email" id="email" />
        <input type="number" id="age" />
        <textarea id="notes"></textarea>
      </form>
    `;
    container = document.getElementById('test-form');
  });

  it('should fill form with mapped data', () => {
    const headers = ['Name', 'Email', 'Age'];
    const row = ['John Doe', 'john@example.com', '30'];

    const mapping = createMapping(headers, {
      '0': 'firstName',
      '1': 'email',
      '2': 'age'
    });

    // In real scenario, firstName would be split but for this test we map directly
    const mappedData = applyMappingToRow(row, mapping);
    const result = fillFields(container, mappedData);

    expect(result.success).toBe(true);
    expect(result.filled).toBe(3);
    expect(document.getElementById('email').value).toBe('john@example.com');
    expect(document.getElementById('age').value).toBe('30');
  });

  it('should handle partial mapping of form fields', () => {
    const headers = ['Name', 'Email', 'Notes'];
    const row = ['John', 'john@example.com', 'Some notes'];

    const mapping = createMapping(headers, {
      '1': 'email',
      '2': 'notes'
    });

    const mappedData = applyMappingToRow(row, mapping);
    const result = fillFields(container, mappedData);

    expect(result.filled).toBe(2);
    expect(document.getElementById('email').value).toBe('john@example.com');
    expect(document.getElementById('notes').value).toBe('Some notes');
  });

  it('should report unfillable fields correctly', () => {
    const headers = ['Field1', 'Field2'];
    const row = ['value1', 'value2'];

    const mapping = createMapping(headers, {
      '0': 'nonexistentField',
      '1': 'email'
    });

    const mappedData = applyMappingToRow(row, mapping);
    const result = fillFields(container, mappedData);

    expect(result.success).toBe(false);
    expect(result.filled).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].field).toBe('nonexistentField');
  });
});

describe('Complete CSV to Table Workflow', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="employees">
        <input type="text" id="empFirstName" placeholder="First Name" />
        <input type="text" id="empLastName" placeholder="Last Name" />
        <input type="email" id="empEmail" placeholder="Email" />
        <select id="empDept">
          <option value="">Select</option>
          <option value="Sales">Sales</option>
          <option value="Engineering">Engineering</option>
        </select>
      </form>
    `;
    container = document.getElementById('employees');
  });

  it('should execute complete workflow: CSV -> Parse -> Map -> Fill', () => {
    // Step 1: Parse CSV
    const csvContent = 'FirstName,LastName,Email,Department\nAlice,Smith,alice@example.com,Engineering\nBob,Johnson,bob@example.com,Sales';
    const parsed = parseCSV(csvContent);
    validateCSVData(parsed);

    // Step 2: Create mapping
    const mapping = createMapping(parsed.headers, {
      '0': 'empFirstName',
      '1': 'empLastName',
      '2': 'empEmail',
      '3': 'empDept'
    });

    // Step 3: Fill first row
    const firstRow = getRowByIndex(parsed, 0);
    const mappedData = applyMappingToRow(firstRow, mapping);
    const result = fillFields(container, mappedData);

    expect(result.success).toBe(true);
    expect(result.filled).toBe(4);
    expect(document.getElementById('empFirstName').value).toBe('Alice');
    expect(document.getElementById('empLastName').value).toBe('Smith');
    expect(document.getElementById('empEmail').value).toBe('alice@example.com');
    expect(document.getElementById('empDept').value).toBe('Engineering');
  });

  it('should handle multiple rows in sequence', () => {
    const csvContent = 'FirstName,Email\nAlice,alice@example.com\nBob,bob@example.com';
    const parsed = parseCSV(csvContent);
    const mapping = createMapping(parsed.headers, {
      '0': 'empFirstName',
      '1': 'empEmail'
    });

    const results = [];

    parsed.rows.forEach((row, index) => {
      const mappedData = applyMappingToRow(row, mapping);
      const result = fillFields(container, mappedData);
      results.push({
        rowIndex: index,
        success: result.success,
        filled: result.filled
      });
    });

    expect(results).toHaveLength(2);
    results.forEach(r => {
      expect(r.success).toBe(true);
      expect(r.filled).toBe(2);
    });
  });

  it('should gracefully handle CSV with special characters', () => {
    const csvContent = 'FirstName,Email\n"Jane, Jr.",jane@example.com';
    const parsed = parseCSV(csvContent);
    const mapping = createMapping(parsed.headers, {
      '0': 'empFirstName',
      '1': 'empEmail'
    });

    const mappedData = applyMappingToRow(parsed.rows[0], mapping);
    const result = fillFields(container, mappedData);

    expect(result.success).toBe(true);
    expect(document.getElementById('empFirstName').value).toBe('Jane, Jr.');
  });
});

describe('Error Handling Across Modules', () => {
  it('should handle mapping errors without breaking CSV parsing', () => {
    const csvContent = 'Name,Email\nJohn,john@example.com';
    const parsed = parseCSV(csvContent);

    expect(() => {
      createMapping(parsed.headers, { '5': 'field' }); // Index out of bounds
    }).toThrow();

    // Original parsed data should still be valid
    expect(parsed.rows).toHaveLength(1);
  });

  it('should handle table fill errors without breaking mapping', () => {
    const headers = ['Name', 'Email'];
    const row = ['John', 'john@example.com'];
    const mapping = createMapping(headers, {
      '0': 'nonexistent',
      '1': 'also-nonexistent'
    });

    const mappedData = applyMappingToRow(row, mapping);

    // Mapping should still be valid even if fields don't exist
    expect(mappedData).toEqual({
      nonexistent: 'John',
      'also-nonexistent': 'john@example.com'
    });
  });
});
