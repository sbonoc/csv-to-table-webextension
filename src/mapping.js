/**
 * Mapping Module
 * Handles column mapping between CSV and table fields
 */

/**
 * Create a mapping from CSV columns to table fields
 * @param {string[]} csvHeaders - CSV column headers
 * @param {Object} mappingConfig - Mapping configuration {csvIndex: fieldName}
 * @returns {Object} Validated mapping
 * @throws {Error} If mapping is invalid
 */
export function createMapping(csvHeaders, mappingConfig) {
  if (!Array.isArray(csvHeaders) || csvHeaders.length === 0) {
    throw new Error('CSV headers must be a non-empty array');
  }

  if (!mappingConfig || typeof mappingConfig !== 'object') {
    throw new Error('Mapping configuration must be an object');
  }

  const mapping = {};

  Object.entries(mappingConfig).forEach(([csvIndex, fieldName]) => {
    const index = parseInt(csvIndex);

    if (isNaN(index) || index < 0 || index >= csvHeaders.length) {
      throw new Error(`Invalid CSV column index: ${csvIndex}`);
    }

    if (typeof fieldName !== 'string' || fieldName.trim() === '') {
      throw new Error(`Field name must be a non-empty string for column index ${csvIndex}`);
    }

    mapping[index] = fieldName.trim();
  });

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
