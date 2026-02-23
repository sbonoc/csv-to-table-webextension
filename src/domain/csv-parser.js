/**
 * CSV Parser Module
 * Handles CSV parsing and validation
 */

import { Logger } from '../infrastructure/logger.js';
import { CONFIG } from '../infrastructure/config.js';
import { CSVError } from '../infrastructure/errors.js';

const logger = new Logger('CSVParser');

function stripBOM(content) {
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
}

function countDelimiterOutsideQuotes(line, delimiter) {
  let inQuotes = false;
  let count = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }

  return count;
}

function detectDelimiter(csvContent) {
  const candidates = [',', ';', '\t'];
  const lines = csvContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (lines.length === 0) {
    return ',';
  }

  let bestDelimiter = ',';
  let bestScore = -1;

  candidates.forEach(candidate => {
    const score = lines.reduce((total, line) => total + countDelimiterOutsideQuotes(line, candidate), 0);
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = candidate;
    }
  });

  return bestDelimiter;
}

function parseRows(csvContent, delimiter) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  const pushField = () => {
    currentRow.push(currentField.trim());
    currentField = '';
  };

  const pushRow = () => {
    pushField();
    const hasData = currentRow.some(value => value.trim() !== '');
    if (hasData) {
      rows.push(currentRow);
    }
    currentRow = [];
  };

  for (let index = 0; index < csvContent.length; index += 1) {
    const char = csvContent[index];
    const next = csvContent[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      pushField();
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      pushRow();
      continue;
    }

    currentField += char;
  }

  if (inQuotes) {
    throw new CSVError('CSV contains an unterminated quoted field', 'CSV_INVALID');
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    pushRow();
  }

  return rows;
}

/**
 * Parse CSV content into rows and headers
 * @param {string} csvContent - Raw CSV content
 * @returns {{headers: string[], rows: string[][]}} Parsed CSV data
 * @throws {CSVError} If CSV is empty, malformed, or exceeds limits
 */
export function parseCSV(csvContent) {
  if (typeof csvContent !== 'string') {
    throw new CSVError('Invalid CSV content: must be a non-empty string', 'CSV_INVALID');
  }

  if (csvContent.trim() === '') {
    throw new CSVError('CSV file is empty', 'CSV_EMPTY');
  }

  // Validate file size
  const sizeInBytes = new Blob([csvContent]).size;
  if (sizeInBytes > CONFIG.LIMITS.MAX_CSV_SIZE) {
    throw new CSVError(
      `CSV file exceeds maximum size of ${CONFIG.LIMITS.MAX_CSV_SIZE / 1024 / 1024}MB`,
      'CSV_TOO_LARGE',
      { actualSize: sizeInBytes, maxSize: CONFIG.LIMITS.MAX_CSV_SIZE }
    );
  }

  const normalizedContent = stripBOM(csvContent);
  const delimiter = detectDelimiter(normalizedContent);
  const parsedRows = parseRows(normalizedContent, delimiter);

  if (parsedRows.length === 0) {
    throw new CSVError('CSV file is empty', 'CSV_EMPTY');
  }

  const headers = parsedRows[0].map(h => h.trim());

  // Validate column count
  if (headers.length > CONFIG.LIMITS.MAX_CSV_COLUMNS) {
    throw new CSVError(
      `CSV has too many columns (${headers.length}). Maximum is ${CONFIG.LIMITS.MAX_CSV_COLUMNS}`,
      'CSV_INVALID',
      { columnCount: headers.length, maxColumns: CONFIG.LIMITS.MAX_CSV_COLUMNS }
    );
  }

  if (headers.length === 0) {
    throw new CSVError('CSV must have at least one column', 'CSV_INVALID');
  }

  const rows = parsedRows.slice(1).map(row => row.map(val => val.trim()));

  // Validate row count
  if (rows.length > CONFIG.LIMITS.MAX_CSV_ROWS) {
    throw new CSVError(
      `CSV has too many rows (${rows.length}). Maximum is ${CONFIG.LIMITS.MAX_CSV_ROWS}`,
      'CSV_INVALID',
      { rowCount: rows.length, maxRows: CONFIG.LIMITS.MAX_CSV_ROWS }
    );
  }

  logger.debug('CSV parsed successfully', {
    headers: headers.length,
    rows: rows.length,
    sizeKB: (sizeInBytes / 1024).toFixed(2),
    delimiter: delimiter === '\t' ? 'tab' : delimiter
  });

  return { headers, rows };
}

/**
 * Validate CSV data structure
 * @param {Object} csvData - Parsed CSV data
 * @param {string[]} csvData.headers - CSV headers
 * @param {string[][]} csvData.rows - CSV rows
 * @returns {boolean} True if valid
 * @throws {Error} If CSV data is invalid
 */
export function validateCSVData(csvData) {
  if (!csvData || typeof csvData !== 'object') {
    throw new Error('Invalid CSV data object');
  }

  if (!Array.isArray(csvData.headers) || csvData.headers.length === 0) {
    throw new Error('Headers must be a non-empty array');
  }

  if (!Array.isArray(csvData.rows)) {
    throw new Error('Rows must be an array');
  }

  // Validate that all rows have same number of columns as headers
  for (let i = 0; i < csvData.rows.length; i++) {
    if (csvData.rows[i].length !== csvData.headers.length) {
      throw new Error(`Row ${i + 1} has ${csvData.rows[i].length} columns but headers have ${csvData.headers.length}`);
    }
  }

  return true;
}

/**
 * Get CSV row as object with headers as keys
 * @param {string[]} headers - CSV headers
 * @param {string[]} row - CSV row values
 * @returns {Object} Row as key-value object
 */
export function rowToObject(headers, row) {
  return headers.reduce((obj, header, idx) => {
    obj[header] = row[idx] || '';
    return obj;
  }, {});
}

/**
 * Get raw row by index
 * @param {Object} csvData - Parsed CSV data
 * @param {number} rowIndex - Zero-based row index
 * @returns {string[]} Row values
 */
export function getRowByIndex(csvData, rowIndex) {
  if (rowIndex < 0 || rowIndex >= csvData.rows.length) {
    throw new Error(`Row index ${rowIndex} out of bounds`);
  }
  return csvData.rows[rowIndex];
}
