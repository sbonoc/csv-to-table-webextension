/**
 * Background Script
 * Handles persistent operations and communication between content scripts and popup
 */

// Initialize storage
browser.storage.local.get(['csvMapping'], (result) => {
    if (!result.csvMapping) {
        browser.storage.local.set({
            csvMapping: {},
            CSVHistory: []
        });
    }
});

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveMappingConfig') {
        browser.storage.local.set({
            csvMapping: request.data.mapping,
            lastMapDate: new Date().toISOString()
        }, () => {
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === 'getMappingConfig') {
        browser.storage.local.get(['csvMapping'], (result) => {
            sendResponse({ mapping: result.csvMapping || {} });
        });
        return true;
    }
});

// Log when extension is installed or updated
browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('CSV to Table Filler extension installed');
    } else if (details.reason === 'update') {
        console.log('CSV to Table Filler extension updated');
    }
});

console.log('CSV to Table Filler background script loaded');
