(() => {
  const ALLOWED_ACTIONS = new Set(['getTableInfo', 'fillTable', 'highlightTargetTable']);
  const ALLOWED_DATE_TRANSFORMS = new Set(['auto', 'none', 'dd.mm.yyyy', 'dd/mm/yyyy', 'yyyy-mm-dd']);
  const TARGET_TABLE_CLASS = 'csv-filler-target-table-highlight';
  const TARGET_FIELD_CLASS = 'csv-filler-target-field-highlight';

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isValidSender(sender) {
    if (!sender) {
      return false;
    }

    if (sender.id && sender.id !== browser.runtime.id) {
      return false;
    }

    const senderSource = sender.url || sender.origin || '';
    if (senderSource && !senderSource.startsWith('moz-extension://')) {
      return false;
    }

    return true;
  }

  function validateRequestEnvelope(request) {
    if (!isPlainObject(request)) {
      throw new Error('Request must be a valid object');
    }

    if (typeof request.action !== 'string' || !ALLOWED_ACTIONS.has(request.action)) {
      throw new Error('Invalid or unauthorized action');
    }
  }

  function validateFillRequestData(data) {
    if (!isPlainObject(data)) {
      throw new Error('Fill payload must be an object');
    }

    if (!Number.isInteger(data.tableIndex) || data.tableIndex < 0) {
      throw new Error('Table index is required and must be a non-negative integer');
    }

    if (!isPlainObject(data.mapping)) {
      throw new Error('Mapping is required and must be an object');
    }

    const hasCsvRows = Array.isArray(data.csvRows);
    const hasCsvRow = Array.isArray(data.csvRow);

    if (!hasCsvRows && !hasCsvRow) {
      throw new Error('CSV row data is required and must be an array');
    }

    if (Object.keys(data.mapping).length > 500) {
      throw new Error('Mapping exceeds allowed size');
    }

    if (hasCsvRows) {
      if (data.csvRows.length > 10000) {
        throw new Error('CSV rows exceed allowed size');
      }

      data.csvRows.forEach((row, index) => {
        if (!Array.isArray(row)) {
          throw new Error(`CSV row at index ${index} must be an array`);
        }

        if (row.length > 500) {
          throw new Error('CSV row exceeds allowed size');
        }
      });
    }

    if (hasCsvRow && data.csvRow.length > 500) {
      throw new Error('CSV row exceeds allowed size');
    }

    if (data.dateFormatTransform !== undefined && !ALLOWED_DATE_TRANSFORMS.has(data.dateFormatTransform)) {
      throw new Error('Invalid date format transform option');
    }
  }

  function validateHighlightRequestData(data) {
    if (!isPlainObject(data)) {
      throw new Error('Highlight payload must be an object');
    }

    if (data.enabled === false) {
      return;
    }

    if (!Number.isInteger(data.tableIndex) || data.tableIndex < 0) {
      throw new Error('Table index is required and must be a non-negative integer');
    }

    if (data.mapping !== undefined && !isPlainObject(data.mapping)) {
      throw new Error('Mapping must be an object');
    }

    if (data.scrollIntoView !== undefined && typeof data.scrollIntoView !== 'boolean') {
      throw new Error('scrollIntoView must be a boolean');
    }
  }

  function getHighlightHue(columnIndex) {
    return (columnIndex * 47) % 360;
  }

  function getHighlightColor(columnIndex) {
    return `hsl(${getHighlightHue(columnIndex)}, 75%, 42%)`;
  }

  function ensureHighlightStyles() {
    if (document.getElementById('csv-filler-highlight-style')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'csv-filler-highlight-style';
    style.textContent = `
      .${TARGET_TABLE_CLASS} {
        outline: 3px solid #3498db !important;
        outline-offset: 2px !important;
      }

      .${TARGET_FIELD_CLASS} {
        box-shadow: 0 0 0 2px var(--csv-filler-field-color, #3498db) !important;
        background-color: color-mix(in srgb, var(--csv-filler-field-color, #3498db) 12%, white) !important;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function clearTargetHighlights() {
    document.querySelectorAll(`.${TARGET_TABLE_CLASS}`).forEach((element) => {
      element.classList.remove(TARGET_TABLE_CLASS);
    });

    document.querySelectorAll(`.${TARGET_FIELD_CLASS}`).forEach((element) => {
      element.classList.remove(TARGET_FIELD_CLASS);
      element.style.removeProperty('--csv-filler-field-color');
    });
  }

  function handleHighlightTargetTable(data) {
    validateHighlightRequestData(data);
    clearTargetHighlights();

    if (data.enabled === false) {
      return { success: true, highlightedFields: 0, message: 'Highlight cleared' };
    }

    const tableSelectors = ['table', 'form', '[role="table"]'];
    const allTables = document.querySelectorAll(tableSelectors.join(','));

    if (data.tableIndex >= allTables.length) {
      throw new Error(`Table index ${data.tableIndex} not found`);
    }

    ensureHighlightStyles();

    const targetTable = allTables[data.tableIndex];
    targetTable.classList.add(TARGET_TABLE_CLASS);

    if (data.scrollIntoView) {
      targetTable.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }

    let highlightedFields = 0;
    const mapping = isPlainObject(data.mapping) ? data.mapping : {};

    Object.entries(mapping).forEach(([csvColumnStr, fieldName]) => {
      const csvColumn = Number.parseInt(csvColumnStr, 10);
      if (!fieldName || !Number.isInteger(csvColumn) || csvColumn < 0) {
        return;
      }

      const fieldElement = findFieldElement(targetTable, fieldName);
      if (!fieldElement) {
        return;
      }

      fieldElement.classList.add(TARGET_FIELD_CLASS);
      fieldElement.style.setProperty('--csv-filler-field-color', getHighlightColor(csvColumn));
      highlightedFields += 1;
    });

    return {
      success: true,
      highlightedFields,
      message: `Highlighted table and ${highlightedFields} mapped fields`
    };
  }

  function getTableFields(element) {
    const fields = [];
    const tableRows = getTableRows(element);
    const referenceRow = findFirstRowWithInputs(tableRows);
    const scope = referenceRow || element;
    const inputs = scope.querySelectorAll('input, textarea, select');

    inputs.forEach((input) => {
      const name = input.name || input.id || input.placeholder || 'unnamed';
      fields.push({
        name,
        type: input.type || 'text'
      });
    });

    return fields;
  }

  function findFieldElement(container, name = null) {
    if (!name) {
      return null;
    }

    const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(name) : name;
    return container.querySelector(`[name="${escaped}"], #${escaped}`);
  }

  function setFieldValue(element, value, dateTransformMode = 'auto') {
    const inputValue = String(value ?? '').trim();
    const normalized = normalizeDateByMode(element, inputValue, dateTransformMode);

    if (element.type === 'checkbox' || element.type === 'radio') {
      const asLower = normalized.toLowerCase();
      element.checked = asLower === 'true' || asLower === '1' || asLower === 'si' || asLower === 'sí';
    } else {
      element.value = normalized;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function normalizeDateByMode(element, value, mode) {
    if (!value) {
      return value;
    }

    if (mode === 'none') {
      return value;
    }

    const parsed = parseDateParts(value);
    if (!parsed) {
      return value;
    }

    if (mode === 'dd.mm.yyyy') {
      return `${parsed.day}.${parsed.month}.${parsed.year}`;
    }

    if (mode === 'dd/mm/yyyy') {
      return `${parsed.day}/${parsed.month}/${parsed.year}`;
    }

    if (mode === 'yyyy-mm-dd') {
      return `${parsed.year}-${parsed.month}-${parsed.day}`;
    }

    if (shouldNormalizeToDotDate(element)) {
      return `${parsed.day}.${parsed.month}.${parsed.year}`;
    }

    return value;
  }

  function parseDateParts(value) {
    const dayFirstMatch = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dayFirstMatch) {
      const [, day, month, year] = dayFirstMatch;
      return {
        day: day.padStart(2, '0'),
        month: month.padStart(2, '0'),
        year
      };
    }

    const isoLikeMatch = value.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (isoLikeMatch) {
      const [, year, month, day] = isoLikeMatch;
      return {
        day: day.padStart(2, '0'),
        month: month.padStart(2, '0'),
        year
      };
    }

    return null;
  }

  function shouldNormalizeToDotDate(element) {
    if (!element) {
      return false;
    }

    const placeholder = (element.getAttribute('placeholder') || '').toLowerCase();
    if (placeholder.includes('dd.mm.aaaa') || placeholder.includes('dd.mm.yyyy')) {
      return true;
    }

    const pattern = element.getAttribute('pattern') || '';
    if (/\\d\{2\}.*\\\.\\d\{2\}.*\\\.\\d\{4\}/.test(pattern)) {
      return true;
    }

    return false;
  }

  function fillFields(container, fieldData) {
    const failed = [];
    let filled = 0;

    Object.entries(fieldData).forEach(([fieldName, value]) => {
      const element = findFieldElement(container, fieldName);
      if (!element) {
        failed.push({ field: fieldName, reason: 'Element not found' });
        return;
      }

      try {
        setFieldValue(element, value);
        filled += 1;
      } catch (_error) {
        failed.push({ field: fieldName, reason: 'Failed to set value' });
      }
    });

    return {
      success: failed.length === 0,
      filled,
      failed
    };
  }

  function getTableRows(container) {
    const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
    if (bodyRows.length > 0) {
      return bodyRows;
    }

    return Array.from(container.querySelectorAll('tr'));
  }

  function getCellIndexForField(row, fieldName) {
    const fieldElement = findFieldElement(row, fieldName);
    if (!fieldElement) {
      return -1;
    }

    const cell = fieldElement.closest('td, th');
    if (!cell) {
      return -1;
    }

    const rowCells = Array.from(row.children).filter((child) => child.tagName === 'TD' || child.tagName === 'TH');
    return rowCells.indexOf(cell);
  }

  function findFirstRowWithInputs(rows) {
    return rows.find((row) => row.querySelector('input, textarea, select')) || null;
  }

  function getFieldElementAtColumn(row, columnIndex) {
    if (columnIndex < 0) {
      return null;
    }

    const cells = Array.from(row.children).filter((child) => child.tagName === 'TD' || child.tagName === 'TH');
    const cell = cells[columnIndex];
    if (!cell) {
      return null;
    }

    return cell.querySelector('input, textarea, select');
  }

  function fillRowsByMapping(container, mapping, csvRows, dateTransformMode = 'auto') {
    const tableRows = getTableRows(container);
    if (tableRows.length === 0) {
      return {
        success: false,
        filled: 0,
        failed: [{ field: 'table', reason: 'No rows found in target table' }],
        matchedRows: 0,
        totalCsvRows: csvRows.length,
        totalTableRows: 0
      };
    }

    const referenceRow = findFirstRowWithInputs(tableRows);
    if (!referenceRow) {
      return {
        success: false,
        filled: 0,
        failed: [{ field: 'table', reason: 'No editable fields found in table rows' }],
        matchedRows: 0,
        totalCsvRows: csvRows.length,
        totalTableRows: tableRows.length
      };
    }

    const mappingEntries = Object.entries(mapping)
      .map(([csvColumnStr, fieldName]) => {
        const csvColumn = Number.parseInt(csvColumnStr, 10);
        const columnIndex = getCellIndexForField(referenceRow, fieldName);
        return {
          csvColumn,
          fieldName,
          columnIndex
        };
      })
      .filter((entry) => Number.isInteger(entry.csvColumn) && entry.csvColumn >= 0 && entry.columnIndex >= 0);

    if (mappingEntries.length === 0) {
      return {
        success: false,
        filled: 0,
        failed: [{ field: 'mapping', reason: 'Mapped fields not found in table columns' }],
        matchedRows: 0,
        totalCsvRows: csvRows.length,
        totalTableRows: tableRows.length
      };
    }

    const rowsToProcess = Math.min(csvRows.length, tableRows.length);
    const failed = [];
    let filled = 0;

    for (let rowIndex = 0; rowIndex < rowsToProcess; rowIndex += 1) {
      const csvRow = csvRows[rowIndex];
      const tableRow = tableRows[rowIndex];

      mappingEntries.forEach(({ csvColumn, fieldName, columnIndex }) => {
        if (csvColumn >= csvRow.length) {
          failed.push({ field: `${fieldName}@row${rowIndex + 1}`, reason: 'CSV column out of range' });
          return;
        }

        const element = getFieldElementAtColumn(tableRow, columnIndex);
        if (!element) {
          failed.push({ field: `${fieldName}@row${rowIndex + 1}`, reason: 'Element not found at column' });
          return;
        }

        try {
          setFieldValue(element, csvRow[csvColumn], dateTransformMode);
          filled += 1;
        } catch (_error) {
          failed.push({ field: `${fieldName}@row${rowIndex + 1}`, reason: 'Failed to set value' });
        }
      });
    }

    return {
      success: failed.length === 0,
      filled,
      failed,
      matchedRows: rowsToProcess,
      totalCsvRows: csvRows.length,
      totalTableRows: tableRows.length
    };
  }

  function handleGetTableInfo() {
    const tableSelectors = ['table', 'form', '[role="table"]'];
    const allElements = document.querySelectorAll(tableSelectors.join(','));

    const tables = Array.from(allElements).map((element, index) => {
      const fields = getTableFields(element);
      return {
        index,
        tag: element.tagName.toLowerCase(),
        name: `${element.tagName} ${index + 1}`,
        fieldsCount: fields.length,
        fields
      };
    });

    return {
      success: true,
      tables
    };
  }

  function handleFillTable(data) {
    validateFillRequestData(data);

    const tableSelectors = ['table', 'form', '[role="table"]'];
    const allTables = document.querySelectorAll(tableSelectors.join(','));

    if (data.tableIndex >= allTables.length) {
      throw new Error(`Table index ${data.tableIndex} not found`);
    }

    const targetTable = allTables[data.tableIndex];
    const csvRows = Array.isArray(data.csvRows) ? data.csvRows : [data.csvRow];

    if (csvRows.length === 0) {
      throw new Error('No CSV rows available to fill');
    }

    const dateTransformMode = data.dateFormatTransform || 'auto';
    const result = fillRowsByMapping(targetTable, data.mapping, csvRows, dateTransformMode);

    const hasFillFailures = result.failed.length > 0;
    const hasPendingCsvRows = result.totalCsvRows > result.matchedRows;
    const hasRemainingTableRows = result.totalTableRows > result.matchedRows;

    let success = !hasFillFailures;
    let severity = hasFillFailures ? 'error' : 'success';
    let message = `Filled ${result.filled} fields across ${result.matchedRows} rows`;

    if (hasFillFailures) {
      message = `Filled ${result.filled} fields across ${result.matchedRows} rows with some issues`;
    } else if (hasPendingCsvRows) {
      severity = 'warning';
      message = `Filled as many rows as possible: ${result.matchedRows} processed and ${result.totalCsvRows - result.matchedRows} CSV rows pending`;
    } else if (hasRemainingTableRows) {
      message = `Filled ${result.filled} fields across ${result.matchedRows} rows. Remaining table rows were left unchanged`;
    }

    return {
      success,
      severity,
      filled: result.filled,
      failed: result.failed,
      message
    };
  }

  async function handleMessage(request, sender) {
    if (!isValidSender(sender)) {
      throw new Error('Unauthorized message sender');
    }

    validateRequestEnvelope(request);

    if (request.action === 'getTableInfo') {
      return handleGetTableInfo();
    }

    if (request.action === 'fillTable') {
      return handleFillTable(request.data);
    }

    if (request.action === 'highlightTargetTable') {
      return handleHighlightTargetTable(request.data || {});
    }

    return { success: false, error: 'Unknown action' };
  }

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  });
})();
