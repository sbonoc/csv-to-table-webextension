(() => {
  const STORAGE_KEY_MAPPING = 'fieldMapping';
  const MAX_CSV_COLUMNS = 500;
  const ALLOWED_ACTIONS = new Set([
    'saveMappingConfig',
    'getMappingConfig',
    'deleteMappingConfig'
  ]);

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

  function validateMappingPayload(mapping) {
    if (!isPlainObject(mapping)) {
      throw new Error('Mapping must be an object');
    }

    const entries = Object.entries(mapping);
    if (entries.length > MAX_CSV_COLUMNS) {
      throw new Error('Mapping exceeds maximum allowed columns');
    }

    entries.forEach(([key, value]) => {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= MAX_CSV_COLUMNS) {
        throw new Error(`Invalid mapping index: ${key}`);
      }

      if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`Invalid mapped field for index: ${key}`);
      }
    });
  }

  async function getMappingConfig() {
    const result = await browser.storage.local.get(STORAGE_KEY_MAPPING);
    return result[STORAGE_KEY_MAPPING] || {};
  }

  async function saveMappingConfig(mapping) {
    await browser.storage.local.set({
      [STORAGE_KEY_MAPPING]: mapping,
      lastMappingUpdate: new Date().toISOString()
    });
  }

  async function initializeStorage() {
    const mapping = await getMappingConfig();
    if (!mapping || Object.keys(mapping).length === 0) {
      await saveMappingConfig({});
    }
  }

  async function handleMessage(request, sender) {
    if (!isValidSender(sender)) {
      throw new Error('Unauthorized message sender');
    }

    validateRequestEnvelope(request);

    if (request.action === 'saveMappingConfig') {
      const mapping = request?.data?.mapping;
      if (!mapping) {
        throw new Error('Mapping data is required');
      }
      validateMappingPayload(mapping);
      await saveMappingConfig(mapping);
      return { success: true, message: 'Mapping saved successfully' };
    }

    if (request.action === 'getMappingConfig') {
      const mapping = await getMappingConfig();
      return { success: true, mapping };
    }

    if (request.action === 'deleteMappingConfig') {
      await saveMappingConfig({});
      return { success: true, message: 'Mapping deleted successfully' };
    }

    return { success: false, error: 'Unknown action' };
  }

  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      initializeStorage().catch((error) => console.error('Failed to initialize storage', error));
    }
  });

  if (browser.action?.onClicked && browser.sidebarAction?.open) {
    browser.action.onClicked.addListener(async () => {
      try {
        await browser.sidebarAction.open();
      } catch (error) {
        console.warn('Unable to open sidebar action', error);
      }
    });
  }

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  });

  initializeStorage().catch((error) => console.error('Failed to initialize storage', error));
})();
