const TRANSLATIONS = {
  en: {
    title: 'CSV to Table Filler',
    selectCsvFile: 'Select CSV File:',
    csvSample: 'CSV Sample',
    csvHeaderHint: 'The first CSV row is interpreted as headers.',
    firstRowAsData: 'Use first row as data (headerless CSV)',
    csvPreviewPlaceholder: 'Load a CSV file to preview parsed rows',
    columnMapping: 'Column Mapping',
    mappingHint: 'Fields are detected from the first editable row of the target table.',
    mappingPlaceholder: 'Load a CSV file to configure mapping',
    availableTables: 'Available Tables',
    selectTable: 'Select a table...',
    dateTransform: 'Date Transform',
    dateOutputFormat: 'Date output format:',
    dateAuto: 'Auto (based on target field)',
    dateNone: 'No transform',
    dateHint: 'Applied during fill when date-like values are detected.',
    saveMapping: 'Save Mapping',
    fillTable: 'Fill Table',
    clearMapping: 'Clear Mapping',
    selectTargetField: '-- Select target field --',
    noDataRows: '(No data rows)',
    csvLoaded: '✓ CSV loaded: {columns} columns, {rows} rows',
    csvError: '✗ Error: {message}',
    tableDetectError: '⚠ Could not detect tables: {message}',
    loadCsvFirst: 'Please load a CSV file first',
    saveMappingFirst: 'Please save a mapping first',
    noRowsToFill: 'No rows available to fill',
    mappingSaved: '✓ Mapping saved successfully!',
    mappingNeedOne: 'Please configure at least one mapping',
    fillWarning: '⚠ {message}',
    fillSuccess: '✓ {message}',
    fillError: '✗ {message}',
    saveError: '✗ Error saving mapping: {message}',
    fillTableError: '✗ Error filling table: {message}',
    clearError: '✗ Error clearing mapping: {message}',
    mappingCleared: 'Mapping cleared'
  },
  es: {
    title: 'CSV to Table Filler',
    selectCsvFile: 'Seleccionar archivo CSV:',
    csvSample: 'Muestra CSV',
    csvHeaderHint: 'La primera fila del CSV se interpreta como cabecera.',
    firstRowAsData: 'Usar primera fila como datos (CSV sin cabecera)',
    csvPreviewPlaceholder: 'Carga un CSV para previsualizar las filas parseadas',
    columnMapping: 'Mapeo de Columnas',
    mappingHint: 'Los campos se detectan desde la primera fila editable de la tabla destino.',
    mappingPlaceholder: 'Carga un CSV para configurar el mapeo',
    availableTables: 'Tablas Disponibles',
    selectTable: 'Selecciona una tabla...',
    dateTransform: 'Transformación de fecha',
    dateOutputFormat: 'Formato de salida de fecha:',
    dateAuto: 'Automático (según campo destino)',
    dateNone: 'Sin transformar',
    dateHint: 'Se aplica durante el relleno cuando se detectan valores de fecha.',
    saveMapping: 'Guardar mapeo',
    fillTable: 'Rellenar tabla',
    clearMapping: 'Limpiar mapeo',
    selectTargetField: '-- Selecciona campo destino --',
    noDataRows: '(Sin filas de datos)',
    csvLoaded: '✓ CSV cargado: {columns} columnas, {rows} filas',
    csvError: '✗ Error: {message}',
    tableDetectError: '⚠ No se pudieron detectar tablas: {message}',
    loadCsvFirst: 'Primero carga un archivo CSV',
    saveMappingFirst: 'Primero guarda un mapeo',
    noRowsToFill: 'No hay filas disponibles para rellenar',
    mappingSaved: '✓ ¡Mapeo guardado correctamente!',
    mappingNeedOne: 'Configura al menos un mapeo',
    fillWarning: '⚠ {message}',
    fillSuccess: '✓ {message}',
    fillError: '✗ {message}',
    saveError: '✗ Error al guardar mapeo: {message}',
    fillTableError: '✗ Error al rellenar tabla: {message}',
    clearError: '✗ Error al limpiar mapeo: {message}',
    mappingCleared: 'Mapeo limpiado'
  }
};

function normalizeLanguage(locale) {
  if (!locale || typeof locale !== 'string') {
    return 'en';
  }

  const short = locale.toLowerCase().split('-')[0];
  return Object.prototype.hasOwnProperty.call(TRANSLATIONS, short) ? short : 'en';
}

function format(template, params = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`;
  });
}

export function getPreferredLanguage() {
  return normalizeLanguage(globalThis?.navigator?.language || 'en');
}

export function createI18n(locale = 'en') {
  const language = normalizeLanguage(locale);
  const bundle = TRANSLATIONS[language] || TRANSLATIONS.en;

  return {
    language,
    t(key, params = {}) {
      const template = bundle[key] || TRANSLATIONS.en[key] || key;
      return format(template, params);
    }
  };
}

export function applyTranslations(root, t) {
  const elements = root.querySelectorAll('[data-i18n]');
  elements.forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      element.textContent = t(key);
    }
  });

  const placeholderElements = root.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach((element) => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (key) {
      element.setAttribute('placeholder', t(key));
    }
  });
}
