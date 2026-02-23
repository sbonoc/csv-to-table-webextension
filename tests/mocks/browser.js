/**
 * Mock para browser.storage WebExtensions API
 * Simula el almacenamiento local del navegador
 */
export const createStorageMock = () => {
  const store = {};

  return {
    local: {
      get: vi.fn(async (keys) => {
        if (typeof keys === 'string') {
          return { [keys]: store[keys] };
        }
        if (Array.isArray(keys)) {
          return keys.reduce((acc, key) => {
            acc[key] = store[key];
            return acc;
          }, {});
        }
        return { ...store };
      }),
      set: vi.fn(async (obj) => {
        Object.assign(store, obj);
      }),
      remove: vi.fn(async (keys) => {
        if (Array.isArray(keys)) {
          keys.forEach(key => delete store[key]);
        } else {
          delete store[keys];
        }
      }),
      clear: vi.fn(async () => {
        Object.keys(store).forEach(key => delete store[key]);
      })
    }
  };
};

/**
 * Mock para browser.tabs WebExtensions API
 */
export const createTabsMock = () => {
  return {
    query: vi.fn(async (queryInfo) => {
      return [
        {
          id: 1,
          active: true,
          windowId: 1,
          status: 'complete',
          url: 'http://example.com',
          title: 'Example Page'
        }
      ];
    }),
    executeScript: vi.fn(async (tabId, scriptDetails) => {
      return [null];
    })
  };
};

/**
 * Mock para browser.runtime WebExtensions API
 */
export const createRuntimeMock = () => {
  const listeners = {};

  return {
    onMessage: {
      addListener: vi.fn((callback) => {
        if (!listeners['onMessage']) {
          listeners['onMessage'] = [];
        }
        listeners['onMessage'].push(callback);
      }),
      removeListener: vi.fn((callback) => {
        if (listeners['onMessage']) {
          listeners['onMessage'] = listeners['onMessage'].filter(cb => cb !== callback);
        }
      })
    },
    onInstalled: {
      addListener: vi.fn((callback) => {
        if (!listeners['onInstalled']) {
          listeners['onInstalled'] = [];
        }
        listeners['onInstalled'].push(callback);
      })
    },
    sendMessage: vi.fn(async (message) => {
      return { success: true };
    }),
    getListeners: (event) => listeners[event] || []
  };
};

/**
 * Mock completo para browser API
 */
export const createBrowserMock = () => {
  return {
    storage: createStorageMock(),
    tabs: createTabsMock(),
    runtime: createRuntimeMock()
  };
};
