import { describe, it, expect } from 'vitest';
import {
  parseCSV,
  validateCSVData,
  rowToObject,
  getRowByIndex
} from '../../src/domain/csv-parser.js';

describe('CSV Parser - Unit Tests', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV with headers and rows', () => {
      const csv = 'Name,Email,Age\nJohn,john@example.com,30\nJane,jane@example.com,28';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['Name', 'Email', 'Age']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['John', 'john@example.com', '30']);
      expect(result.rows[1]).toEqual(['Jane', 'jane@example.com', '28']);
    });

    it('should handle headers with extra spaces', () => {
      const csv = ' Name , Email , Age \nJohn,john@example.com,30';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['Name', 'Email', 'Age']);
    });

    it('should handle values with extra spaces', () => {
      const csv = 'Name,Email\n John , john@example.com ';
      const result = parseCSV(csv);

      expect(result.rows[0]).toEqual(['John', 'john@example.com']);
    });

    it('should ignore empty lines', () => {
      const csv = 'Name,Email\nJohn,john@example.com\n\n\nJane,jane@example.com';
      const result = parseCSV(csv);

      expect(result.rows).toHaveLength(2);
    });

    it('should throw error for null input', () => {
      expect(() => parseCSV(null)).toThrow('Invalid CSV content: must be a non-empty string');
    });

    it('should throw error for empty string', () => {
      expect(() => parseCSV('')).toThrow('CSV file is empty');
    });

    it('should throw error for only whitespace', () => {
      expect(() => parseCSV('   \n\n   ')).toThrow('CSV file is empty');
    });

    it('should throw error for non-string input', () => {
      expect(() => parseCSV(123)).toThrow('Invalid CSV content: must be a non-empty string');
    });

    it('should handle single row CSV', () => {
      const csv = 'Name,Email,Age';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['Name', 'Email', 'Age']);
      expect(result.rows).toHaveLength(0);
    });

    it('should validate max columns limit', () => {
      const csvWithTooManyCols = 'Col1,' + Array(600).fill('Col2').join(',');
      expect(() => parseCSV(csvWithTooManyCols)).toThrow('too many columns');
    });

    it('should validate max rows limit', () => {
      const headers = 'A,B,C';
      const rows = Array(60000).fill('1,2,3').join('\n');
      const csv = headers + '\n' + rows;
      expect(() => parseCSV(csv)).toThrow('too many rows');
    });

    it('should parse quoted values containing commas', () => {
      const csv = 'Name,Notes\n"John, Jr.","Likes, commas"';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['Name', 'Notes']);
      expect(result.rows[0]).toEqual(['John, Jr.', 'Likes, commas']);
    });

    it('should parse escaped quotes inside quoted fields', () => {
      const csv = 'Name,Notes\n"John","He said ""hello"""';
      const result = parseCSV(csv);

      expect(result.rows[0]).toEqual(['John', 'He said "hello"']);
    });

    it('should detect semicolon delimiter', () => {
      const csv = 'Nombre;Email;Edad\nJuan;juan@example.com;30';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['Nombre', 'Email', 'Edad']);
      expect(result.rows[0]).toEqual(['Juan', 'juan@example.com', '30']);
    });

    it('should handle BOM and CRLF line endings', () => {
      const csv = '\uFEFFName,Email\r\nJohn,john@example.com\r\nJane,jane@example.com\r\n';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['Name', 'Email']);
      expect(result.rows).toHaveLength(2);
    });

    it('should parse multiline quoted fields', () => {
      const csv = 'Name,Notes\nJohn,"Line 1\nLine 2"';
      const result = parseCSV(csv);

      expect(result.headers).toEqual(['Name', 'Notes']);
      expect(result.rows[0]).toEqual(['John', 'Line 1\nLine 2']);
    });

    it('should throw error for unterminated quoted field', () => {
      const csv = 'Name,Notes\nJohn,"Unclosed field';
      expect(() => parseCSV(csv)).toThrow('unterminated quoted field');
    });
  });

  describe('validateCSVData', () => {
    const validData = {
      headers: ['Name', 'Email'],
      rows: [['John', 'john@example.com'], ['Jane', 'jane@example.com']]
    };

    it('should validate correct CSV data', () => {
      expect(validateCSVData(validData)).toBe(true);
    });

    it('should validate CSV with no rows', () => {
      const data = { headers: ['Name', 'Email'], rows: [] };
      expect(validateCSVData(data)).toBe(true);
    });

    it('should throw error for null input', () => {
      expect(() => validateCSVData(null)).toThrow('Invalid CSV data object');
    });

    it('should throw error for missing headers', () => {
      const data = { rows: [['John', 'john@example.com']] };
      expect(() => validateCSVData(data)).toThrow('Headers must be a non-empty array');
    });

    it('should throw error for empty headers', () => {
      const data = { headers: [], rows: [] };
      expect(() => validateCSVData(data)).toThrow('Headers must be a non-empty array');
    });

    it('should throw error for non-array rows', () => {
      const data = { headers: ['Name'], rows: 'not an array' };
      expect(() => validateCSVData(data)).toThrow('Rows must be an array');
    });

    it('should throw error for mismatched column count', () => {
      const data = {
        headers: ['Name', 'Email'],
        rows: [['John', 'john@example.com'], ['Jane']] // Second row missing column
      };
      expect(() => validateCSVData(data)).toThrow('Row 2 has 1 columns but headers have 2');
    });
  });

  describe('rowToObject', () => {
    it('should convert row to object with headers as keys', () => {
      const headers = ['Name', 'Email', 'Age'];
      const row = ['John', 'john@example.com', '30'];
      const result = rowToObject(headers, row);

      expect(result).toEqual({
        Name: 'John',
        Email: 'john@example.com',
        Age: '30'
      });
    });

    it('should handle missing values as empty strings', () => {
      const headers = ['Name', 'Email', 'Age'];
      const row = ['John', 'john@example.com']; // Missing Age
      const result = rowToObject(headers, row);

      expect(result.Age).toBe('');
    });

    it('should handle empty headers and rows', () => {
      const result = rowToObject([], []);
      expect(result).toEqual({});
    });
  });

  describe('getRowByIndex', () => {
    const csvData = {
      headers: ['Name', 'Email'],
      rows: [
        ['John', 'john@example.com'],
        ['Jane', 'jane@example.com'],
        ['Bob', 'bob@example.com']
      ]
    };

    it('should return row at valid index', () => {
      expect(getRowByIndex(csvData, 0)).toEqual(['John', 'john@example.com']);
      expect(getRowByIndex(csvData, 1)).toEqual(['Jane', 'jane@example.com']);
      expect(getRowByIndex(csvData, 2)).toEqual(['Bob', 'bob@example.com']);
    });

    it('should throw error for negative index', () => {
      expect(() => getRowByIndex(csvData, -1)).toThrow('Row index -1 out of bounds');
    });

    it('should throw error for index >= rows length', () => {
      expect(() => getRowByIndex(csvData, 3)).toThrow('Row index 3 out of bounds');
    });

    it('should throw error for index >= rows length', () => {
      expect(() => getRowByIndex(csvData, 100)).toThrow('Row index 100 out of bounds');
    });
  });
});
