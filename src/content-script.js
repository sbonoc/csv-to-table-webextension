/**
 * Content Script
 * Runs on web pages and handles communication with the popup
 * and executes table filling operations
 */

// Listen for messages from the popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTableInfo') {
        const tables = document.querySelectorAll('table, form, [role="table"]');
        const tablesInfo = Array.from(tables).map((table, idx) => ({
            index: idx,
            name: `Table ${idx + 1}`,
            fields: getTableFields(table)
        }));
        sendResponse({ tables: tablesInfo });
    }

    if (request.action === 'fillTable') {
        const result = fillTableWithData(request.data);
        sendResponse(result);
    }
});

/**
 * Get all input fields from a table or form
 */
function getTableFields(element) {
    const fields = [];
    const inputs = element.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        const name = input.name || input.id || input.placeholder || 'unnamed';
        fields.push({
            name: name,
            type: input.type,
            selector: getElementSelector(input)
        });
    });
    
    return fields;
}

/**
 * Get CSS selector for an element
 */
function getElementSelector(element) {
    if (element.id) {
        return `#${element.id}`;
    }
    
    if (element.name) {
        return `[name="${element.name}"]`;
    }
    
    let path = [];
    let el = element;
    
    while (el && el.parentElement) {
        let selector = el.tagName.toLowerCase();
        if (el.id) {
            selector += `#${el.id}`;
        } else {
            let sibling = el;
            let index = 1;
            while ((sibling = sibling.previousElementSibling)) {
                if (sibling.tagName.toLowerCase() === selector) {
                    index++;
                }
            }
            if (index > 1) {
                selector += `:nth-of-type(${index})`;
            }
        }
        path.unshift(selector);
        el = el.parentElement;
    }
    
    return path.join(' > ');
}

/**
 * Fill table with CSV data based on mapping
 */
function fillTableWithData(data) {
    const { mapping, csvRow, tableIndex } = data;
    
    try {
        const tables = document.querySelectorAll('table, form, [role="table"]');
        const table = tables[tableIndex];
        
        if (!table) {
            return { success: false, message: 'Table not found' };
        }
        
        let filledCount = 0;
        
        Object.entries(mapping).forEach(([csvCol, targetField]) => {
            const value = csvRow[csvCol];
            const input = table.querySelector(`[name="${targetField}"], #${targetField}`);
            
            if (input && value) {
                input.value = value;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                filledCount++;
            }
        });
        
        return { 
            success: true, 
            message: `Filled ${filledCount} fields successfully` 
        };
    } catch (error) {
        return { 
            success: false, 
            message: `Error: ${error.message}` 
        };
    }
}

console.log('CSV to Table Filler content script loaded');
