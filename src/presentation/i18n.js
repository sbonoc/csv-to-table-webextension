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
    aiMappingTitle: 'AI Mapping (BYOK)',
    aiMappingHint: 'Experimental. Sends CSV headers plus target field metadata (labels, selectors, types) to OpenAI when AI Auto-map is used.',
    openaiApiKeyLabel: 'OpenAI API Key:',
    openaiApiKeyPlaceholder: 'Paste your OpenAI API key',
    aiApiKeyNotSaved: 'No API key saved',
    aiApiKeySaved: 'API key saved in local extension storage',
    aiAutoMap: 'AI Auto-map',
    saveApiKey: 'Save API Key',
    clearApiKey: 'Clear API Key',
    saveMapping: 'Save Mapping',
    fillTable: 'Fill Table',
    clearMapping: 'Clear Mapping',
    tableSelectLabel: 'Target table',
    mappingSelectLabelPrefix: 'Map CSV column',
    selectTargetField: '-- Select target field --',
    mappedBadge: 'Mapped',
    noDataRows: '(No data rows)',
    csvPreviewCaption: 'CSV preview showing {rows} rows and {columns} columns',
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
    mappingCleared: 'Mapping cleared',
    aiMapNeedTableFields: 'Detect target table fields before running AI auto-map',
    aiKeySaved: '✓ OpenAI API key saved',
    aiKeyCleared: 'OpenAI API key removed',
    aiKeyRequired: 'Configure an OpenAI API key first',
    aiMapInProgress: 'Running AI auto-map...',
    aiMapApplied: '✓ AI auto-mapped {mapped} of {total} CSV columns',
    aiMapNoMatches: 'AI returned no confident matches. Review mapping manually.',
    aiMapError: '✗ AI auto-map error: {message}',
    aiErrorInvalidApiKey: 'Invalid OpenAI API key.',
    aiErrorForbidden: 'OpenAI request forbidden for this key.',
    aiErrorQuotaExceeded: 'OpenAI quota exceeded. Check billing/usage limits.',
    aiErrorRateLimited: 'OpenAI rate limit reached. Retry in a few seconds.',
    aiErrorTimeout: 'OpenAI request timed out. Retry again.',
    aiErrorNetwork: 'Network error while contacting OpenAI.',
    aiErrorModelNotFound: 'Configured OpenAI model is not available for this key.',
    aiErrorInputTooLarge: 'Request payload is too large for the selected model.',
    aiErrorInvalidRequest: 'OpenAI rejected the request as invalid.',
    aiErrorInvalidResponse: 'OpenAI returned an invalid response format.',
    aiErrorServer: 'OpenAI server error. Retry later.',
    aiErrorRequestFailed: 'OpenAI request failed.',
    aiErrorUnknown: 'Unexpected AI mapping error.'
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
    aiMappingTitle: 'Mapeo con IA (BYOK)',
    aiMappingHint: 'Experimental. Envía cabeceras CSV y metadatos de campos destino (etiquetas, selectores y tipos) a OpenAI cuando usas AI Auto-map.',
    openaiApiKeyLabel: 'API Key de OpenAI:',
    openaiApiKeyPlaceholder: 'Pega tu API key de OpenAI',
    aiApiKeyNotSaved: 'No hay API key guardada',
    aiApiKeySaved: 'API key guardada en el almacenamiento local de la extensión',
    aiAutoMap: 'AI Auto-map',
    saveApiKey: 'Guardar API Key',
    clearApiKey: 'Borrar API Key',
    saveMapping: 'Guardar mapeo',
    fillTable: 'Rellenar tabla',
    clearMapping: 'Limpiar mapeo',
    tableSelectLabel: 'Tabla destino',
    mappingSelectLabelPrefix: 'Mapear columna CSV',
    selectTargetField: '-- Selecciona campo destino --',
    mappedBadge: 'Mapeado',
    noDataRows: '(Sin filas de datos)',
    csvPreviewCaption: 'Vista previa CSV mostrando {rows} filas y {columns} columnas',
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
    mappingCleared: 'Mapeo limpiado',
    aiMapNeedTableFields: 'Detecta campos de la tabla destino antes de ejecutar AI Auto-map',
    aiKeySaved: '✓ API key de OpenAI guardada',
    aiKeyCleared: 'API key de OpenAI eliminada',
    aiKeyRequired: 'Configura primero una API key de OpenAI',
    aiMapInProgress: 'Ejecutando auto-mapeo con IA...',
    aiMapApplied: '✓ IA auto-mapeó {mapped} de {total} columnas CSV',
    aiMapNoMatches: 'La IA no devolvió coincidencias con confianza suficiente. Revisa el mapeo manualmente.',
    aiMapError: '✗ Error en auto-mapeo IA: {message}',
    aiErrorInvalidApiKey: 'API key de OpenAI inválida.',
    aiErrorForbidden: 'La petición a OpenAI está prohibida para esta API key.',
    aiErrorQuotaExceeded: 'Cuota de OpenAI agotada. Revisa facturación/límites.',
    aiErrorRateLimited: 'Límite de peticiones de OpenAI alcanzado. Reintenta en unos segundos.',
    aiErrorTimeout: 'Tiempo de espera agotado al contactar con OpenAI.',
    aiErrorNetwork: 'Error de red al contactar con OpenAI.',
    aiErrorModelNotFound: 'El modelo configurado no está disponible para esta API key.',
    aiErrorInputTooLarge: 'La petición es demasiado grande para el modelo seleccionado.',
    aiErrorInvalidRequest: 'OpenAI rechazó la petición por inválida.',
    aiErrorInvalidResponse: 'OpenAI devolvió una respuesta con formato inválido.',
    aiErrorServer: 'Error de servidor en OpenAI. Reintenta más tarde.',
    aiErrorRequestFailed: 'La petición a OpenAI falló.',
    aiErrorUnknown: 'Error inesperado en el mapeo con IA.'
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
