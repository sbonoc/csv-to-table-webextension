// Status message helper
function showStatus(message, type = 'info', duration = 3000) {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;
    
    if (duration > 0) {
        setTimeout(() => {
            statusEl.classList.remove('show');
        }, duration);
    }
}

// CSV file loading
document.getElementById('csv-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const rows = text.split('\n').filter(line => line.trim());
        
        if (rows.length === 0) {
            showStatus('CSV file is empty', 'error');
            return;
        }

        // Store CSV data in popup state
        window.csvData = {
            headers: rows[0].split(',').map(h => h.trim()),
            rows: rows.slice(1).map(row => row.split(',').map(val => val.trim()))
        };

        renderMappingUi();
        showStatus(`CSV loaded: ${window.csvData.headers.length} columns`, 'success');
    } catch (error) {
        showStatus(`Error reading file: ${error.message}`, 'error');
    }
});

// Render mapping UI based on CSV headers
function renderMappingUi() {
    const container = document.getElementById('mapping-container');
    
    if (!window.csvData || !window.csvData.headers.length) {
        container.innerHTML = '<p class="placeholder">Load a CSV file to configure mapping</p>';
        return;
    }

    const headers = window.csvData.headers;
    let html = '';

    headers.forEach((header, index) => {
        html += `
            <div class="mapping-row">
                <label>${header}:</label>
                <select data-csv-column="${index}">
                    <option value="">-- Select target field --</option>
                </select>
            </div>
        `;
    });

    container.innerHTML = html;
    loadTableFields();
}

// Load available fields from tables on the page
async function loadTableFields() {
    try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const results = await browser.tabs.executeScript(tab.id, {
            code: `
                (function() {
                    const tables = document.querySelectorAll('table, form, [role="table"]');
                    const tables_info = [];
                    
                    tables.forEach((table, idx) => {
                        const fields = [];
                        
                        // Get input fields
                        table.querySelectorAll('input, textarea, select').forEach(field => {
                            const name = field.name || field.id || field.placeholder || 'unnamed';
                            fields.push(name);
                        });
                        
                        tables_info.push({
                            index: idx,
                            name: \`Table \${idx + 1}\`,
                            fields: fields
                        });
                    });
                    
                    return tables_info;
                })();
            `
        });

        if (results && results[0]) {
            window.tableFields = results[0];
            populateTableSelect();
            populateMappingSelects();
        }
    } catch (error) {
        console.error('Error loading table fields:', error);
        showStatus('Could not detect tables on this page', 'warning');
    }
}

// Populate table selection dropdown
function populateTableSelect() {
    const select = document.getElementById('table-select');
    const option = select.querySelector('option[value=""]');
    
    if (window.tableFields && window.tableFields.length > 0) {
        window.tableFields.forEach(table => {
            const opt = document.createElement('option');
            opt.value = table.index;
            opt.textContent = table.name;
            select.appendChild(opt);
        });
        select.value = window.tableFields[0].index;
    }
}

// Populate mapping select dropdowns with available fields
function populateMappingSelects() {
    const selects = document.querySelectorAll('[data-csv-column]');
    
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Select target field --</option>';
        
        if (window.tableFields && window.tableFields.length > 0) {
            const fields = window.tableFields[0].fields || [];
            fields.forEach(field => {
                const opt = document.createElement('option');
                opt.value = field;
                opt.textContent = field;
                select.appendChild(opt);
            });
        }
        
        select.value = currentValue;
    });
}

// Save mapping configuration
document.getElementById('save-mapping').addEventListener('click', async () => {
    const mapping = {};
    const selects = document.querySelectorAll('[data-csv-column]');
    
    selects.forEach(select => {
        const csvCol = select.dataset.csvColumn;
        const target = select.value;
        if (target) {
            mapping[csvCol] = target;
        }
    });

    if (Object.keys(mapping).length === 0) {
        showStatus('Please configure at least one mapping', 'warning');
        return;
    }

    try {
        await browser.storage.local.set({
            csvMapping: mapping,
            lastCSVHeaders: window.csvData.headers,
            mappedTableIndex: document.getElementById('table-select').value
        });
        showStatus('Mapping saved successfully!', 'success');
        document.getElementById('fill-table').disabled = false;
    } catch (error) {
        showStatus(`Error saving mapping: ${error.message}`, 'error');
    }
});

// Fill table with CSV data
document.getElementById('fill-table').addEventListener('click', async () => {
    if (!window.csvData) {
        showStatus('Please load a CSV file first', 'warning');
        return;
    }

    try {
        const stored = await browser.storage.local.get(['csvMapping']);
        if (!stored.csvMapping) {
            showStatus('Please save a mapping first', 'warning');
            return;
        }

        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const tableIndex = document.getElementById('table-select').value;
        
        await browser.tabs.executeScript(tab.id, {
            code: `
                (function() {
                    const mapping = ${JSON.stringify(stored.csvMapping)};
                    const csvData = ${JSON.stringify(window.csvData)};
                    const tableIndex = ${tableIndex};
                    
                    // TODO: Implement table filling logic
                    console.log('Filling table with mapping:', mapping);
                })();
            `
        });

        showStatus('Table filled successfully!', 'success');
    } catch (error) {
        showStatus(`Error filling table: ${error.message}`, 'error');
    }
});

// Clear mapping
document.getElementById('clear-mapping').addEventListener('click', async () => {
    try {
        await browser.storage.local.remove(['csvMapping', 'lastCSVHeaders']);
        document.getElementById('csv-file').value = '';
        document.getElementById('table-select').value = '';
        document.getElementById('mapping-container').innerHTML = 
            '<p class="placeholder">Load a CSV file to configure mapping</p>';
        document.getElementById('status-message').classList.remove('show');
        showStatus('Mapping cleared', 'info', 2000);
    } catch (error) {
        showStatus(`Error clearing mapping: ${error.message}`, 'error');
    }
});

// Initialize on popup open
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load saved mapping if exists
        const stored = await browser.storage.local.get(['csvMapping']);
        if (stored.csvMapping) {
            document.getElementById('fill-table').disabled = false;
            document.getElementById('save-mapping').disabled = false;
        }
        
        // Try to detect tables on current page
        await loadTableFields();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});
