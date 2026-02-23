import { describe, it, expect } from 'vitest';
import {
  createMapping,
  getMappedValue,
  applyMappingToRow,
  validateMapping,
  getUnmappedColumns
} from './mapping.js';

describe('Mapping Module - Unit Tests', () => {
  const headers = ['Name', 'Email', 'Age', 'Department'];

  describe('createMapping', () => {
    it('should create valid mapping', () => {
      const mapping = createMapping(headers, {
        '0': 'fullName',
        '1': 'emailAddress',
        '2': 'userAge'
      });

      expect(mapping).toEqual({
        0: 'fullName',
        1: 'emailAddress',
        2: 'userAge'
      });
    });

    it('should handle partial mapping', () => {
      const mapping = createMapping(headers, {
        '0': 'fullName',
        '2': 'userAge'
      });

      expect(mapping).toEqual({
        0: 'fullName',
        2: 'userAge'
      });
    });

    it('should trim field names', () => {
      const mapping = createMapping(headers, {
        '0': '  fullName  '
      });

      expect(mapping[0]).toBe('fullName');
    });

    it('should throw error for null headers', () => {
      expect(() => createMapping(null, {})).toThrow('CSV headers must be a non-empty array');
    });

    it('should throw error for empty headers', () => {
      expect(() => createMapping([], {})).toThrow('CSV headers must be a non-empty array');
    });

    it('should throw error for null mapping config', () => {
      expect(() => createMapping(headers, null)).toThrow('Mapping configuration must be an object');
    });

    it('should throw error for invalid CSV index', () => {
      expect(() => createMapping(headers, { '10': 'field' })).toThrow('Invalid CSV column index: 10');
    });

    it('should throw error for negative CSV index', () => {
      expect(() => createMapping(headers, { '-1': 'field' })).toThrow('Invalid CSV column index: -1');
    });

    it('should throw error for empty field name', () => {
      expect(() => createMapping(headers, { '0': '' })).toThrow('Field name must be a non-empty string');
    });

    it('should throw error for non-string field name', () => {
      expect(() => createMapping(headers, { '0': 123 })).toThrow('Field name must be a non-empty string');
    });
  });

  describe('getMappedValue', () => {
    const mapping = { 0: 'fullName', 1: 'emailAddress' };
    const row = ['John Doe', 'john@example.com', '30'];

    it('should return mapped value', () => {
      expect(getMappedValue(row, mapping, 0)).toBe('John Doe');
      expect(getMappedValue(row, mapping, 1)).toBe('john@example.com');
    });

    it('should return null for unmapped column', () => {
      expect(getMappedValue(row, mapping, 2)).toBeNull();
    });

    it('should return null for out of bounds index', () => {
      expect(getMappedValue(row, mapping, 10)).toBeNull();
    });

    it('should return null for negative index', () => {
      expect(getMappedValue(row, mapping, -1)).toBeNull();
    });
  });

  describe('applyMappingToRow', () => {
    const mapping = { 0: 'fullName', 1: 'emailAddress', 3: 'dept' };
    const row = ['John Doe', 'john@example.com', '30', 'Engineering'];

    it('should apply mapping to row', () => {
      const result = applyMappingToRow(row, mapping);

      expect(result).toEqual({
        fullName: 'John Doe',
        emailAddress: 'john@example.com',
        dept: 'Engineering'
      });
    });

    it('should handle empty row', () => {
      const result = applyMappingToRow([], mapping);

      expect(result).toEqual({
        fullName: '',
        emailAddress: '',
        dept: ''
      });
    });

    it('should handle row shorter than mapping', () => {
      const shortRow = ['John', 'john@example.com'];
      const result = applyMappingToRow(shortRow, mapping);

      expect(result.fullName).toBe('John');
      expect(result.emailAddress).toBe('john@example.com');
      expect(result.dept).toBe('');
    });

    it('should handle empty mapping', () => {
      const result = applyMappingToRow(row, {});
      expect(result).toEqual({});
    });
  });

  describe('validateMapping', () => {
    const validMapping = { 0: 'field1', 1: 'field2' };

    it('should validate correct mapping', () => {
      expect(validateMapping(headers, validMapping)).toBe(true);
    });

    it('should throw error for null headers', () => {
      expect(() => validateMapping(null, validMapping)).toThrow('Headers must be a non-empty array');
    });

    it('should throw error for empty headers', () => {
      expect(() => validateMapping([], validMapping)).toThrow('Headers must be a non-empty array');
    });

    it('should throw error for null mapping', () => {
      expect(() => validateMapping(headers, null)).toThrow('Mapping must be an object');
    });

    it('should throw error for index out of bounds', () => {
      const badMapping = { 10: 'field' };
      expect(() => validateMapping(headers, badMapping)).toThrow('Mapping index 10 is out of bounds');
    });

    it('should throw error for negative index', () => {
      const badMapping = { '-1': 'field' };
      expect(() => validateMapping(headers, badMapping)).toThrow('Mapping index -1 is out of bounds');
    });
  });

  describe('getUnmappedColumns', () => {
    it('should return unmapped column indices', () => {
      const mapping = { 0: 'field1', 2: 'field2' };
      const unmapped = getUnmappedColumns(headers, mapping);

      expect(unmapped).toEqual([1, 3]);
    });

    it('should return all indices when no mapping', () => {
      const unmapped = getUnmappedColumns(headers, {});

      expect(unmapped).toEqual([0, 1, 2, 3]);
    });

    it('should return empty array when all mapped', () => {
      const mapping = { 0: 'a', 1: 'b', 2: 'c', 3: 'd' };
      const unmapped = getUnmappedColumns(headers, mapping);

      expect(unmapped).toEqual([]);
    });

    it('should handle single header', () => {
      const mapping = { 0: 'field' };
      const unmapped = getUnmappedColumns(['Name'], mapping);

      expect(unmapped).toEqual([]);
    });
  });
});
