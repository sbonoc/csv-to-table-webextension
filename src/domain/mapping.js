/**
 * Mapping Module
 * Handles column mapping between CSV and table fields
 */

import { Logger } from '../infrastructure/logger.js';
import { MappingError } from '../infrastructure/errors.js';

const logger = new Logger('Mapping');

/**
 * Create a mapping from CSV columns to table fields
 * @param {string[]} csvHeaders - CSV column headers
 * @param {Object} mappingConfig - Mapping configuration {csvIndex: fieldName}
 * @returns {Object} Validated mapping
 * @throws {MappingError} If mapping is invalid
 */
export function createMapping(csvHeaders, mappingConfig) {
  if (!Array.isArray(csvHeaders) || csvHeaders.length === 0) {
    throw new MappingError('CSV headers must be a non-empty array', 'INVALID_HEADERS');
  }

  if (!mappingConfig || typeof mappingConfig !== 'object') {
    throw new MappingError('Mapping configuration must be an object', 'INVALID_CONFIG');
  }

  const mapping = {};

  Object.entries(mappingConfig).forEach(([csvIndex, fieldName]) => {
    const index = parseInt(csvIndex);

    if (isNaN(index) || index < 0 || index >= csvHeaders.length) {
      throw new MappingError(`Invalid CSV column index: ${csvIndex}`, 'INDEX_OUT_OF_BOUNDS', {
        index: csvIndex,
        headerCount: csvHeaders.length
      });
    }

    if (typeof fieldName !== 'string' || fieldName.trim() === '') {
      throw new MappingError(
        `Field name must be a non-empty string for column index ${csvIndex}`,
        'INVALID_FIELD_NAME'
      );
    }

    mapping[index] = fieldName.trim();
  });

  logger.debug('Mapping created', { mappedColumns: Object.keys(mapping).length });

  return mapping;
}

/**
 * Get mapped value from a row
 * @param {string[]} row - CSV row values
 * @param {Object} mapping - Column mapping
 * @param {number} columnIndex - Column index to get
 * @returns {string} Value for the mapped field
 */
export function getMappedValue(row, mapping, columnIndex) {
  if (!mapping[columnIndex]) {
    return null;
  }

  if (columnIndex < 0 || columnIndex >= row.length) {
    return null;
  }

  return row[columnIndex];
}

/**
 * Apply mapping to a CSV row
 * @param {string[]} row - CSV row values
 * @param {Object} mapping - Column mapping
 * @returns {Object} Row data with field names as keys
 */
export function applyMappingToRow(row, mapping) {
  const result = {};

  Object.entries(mapping).forEach(([csvIndex, fieldName]) => {
    const index = parseInt(csvIndex);
    result[fieldName] = row[index] || '';
  });

  return result;
}

/**
 * Validate mapping against CSV headers
 * @param {string[]} headers - CSV headers
 * @param {Object} mapping - Column mapping
 * @returns {boolean} True if mapping is valid
 * @throws {Error} If mapping is invalid
 */
export function validateMapping(headers, mapping) {
  if (!Array.isArray(headers) || headers.length === 0) {
    throw new Error('Headers must be a non-empty array');
  }

  if (!mapping || typeof mapping !== 'object') {
    throw new Error('Mapping must be an object');
  }

  Object.keys(mapping).forEach(key => {
    const index = parseInt(key);
    if (isNaN(index) || index < 0 || index >= headers.length) {
      throw new Error(`Mapping index ${key} is out of bounds for ${headers.length} columns`);
    }
  });

  return true;
}

/**
 * Get unmapped CSV columns
 * @param {string[]} headers - CSV headers
 * @param {Object} mapping - Column mapping
 * @returns {Array} Array of unmapped column indices
 */
export function getUnmappedColumns(headers, mapping) {
  const mappedIndices = Object.keys(mapping).map(idx => parseInt(idx));
  const unmapped = [];

  for (let i = 0; i < headers.length; i++) {
    if (!mappedIndices.includes(i)) {
      unmapped.push(i);
    }
  }

  return unmapped;
}
