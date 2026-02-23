/**
 * CSV Parser Module
 * Handles CSV parsing and validation
 */

/**
 * Parse CSV content into rows and headers
 * @param {string} csvContent - Raw CSV content
 * @returns {{headers: string[], rows: string[][]}} Parsed CSV data
 * @throws {Error} If CSV is empty or malformed
 */
export function parseCSV(csvContent) {
  if (!csvContent || typeof csvContent !== 'string') {
    throw new Error('Invalid CSV content: must be a non-empty string');
  }

  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split(',').map(val => val.trim()));

  if (headers.length === 0) {
    throw new Error('CSV must have at least one column');
  }

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
