/**
 * Table Module
 * Handles HTML table detection and field extraction
 */

import { Logger } from './infrastructure/logger.js';

const logger = new Logger('TableHandler');

/**
 * Get all input fields from an HTML element
 * @param {Element} element - HTML element to search
 * @returns {Array} Array of field objects
 */
export function getTableFields(element) {
  if (!element) {
    throw new Error('Element must be provided');
  }

  const fields = [];
  const inputs = element.querySelectorAll('input, textarea, select');

  inputs.forEach(input => {
    const name = input.name || input.id || input.placeholder || 'unnamed';
    fields.push({
      name: name,
      type: input.type || 'text',
      element: input
    });
  });

  logger.debug('Table fields extracted', { fieldCount: fields.length });

  return fields;
}

/**
 * Get CSS selector for an element
 * @param {Element} element - HTML element
 * @returns {string} CSS selector
 */
export function getElementSelector(element) {
  if (!element) {
    throw new Error('Element must be provided');
  }

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
 * Find element by various criteria
 * @param {Element} container - Container element to search in
 * @param {string} name - Field name
 * @param {string} selector - CSS selector
 * @returns {Element|null} Found element or null
 */
export function findFieldElement(container, name = null, selector = null) {
  if (!container) {
    throw new Error('Container must be provided');
  }

  if (selector) {
    return container.querySelector(selector);
  }

  if (name) {
    return container.querySelector(`[name="${name}"], #${name}`);
  }

  return null;
}

/**
 * Set value in an input field and trigger change event
 * @param {Element} element - Input element
 * @param {string} value - Value to set
 * @returns {boolean} True if successful
 */
export function setFieldValue(element, value) {
  if (!element) {
    throw new Error('Element must be provided');
  }

  if (typeof value !== 'string') {
    throw new Error('Value must be a string');
  }

  try {
    if (element.type === 'checkbox' || element.type === 'radio') {
      element.checked = value.toLowerCase() === 'true';
    } else if (element.tagName.toLowerCase() === 'select') {
      element.value = value;
    } else {
      element.value = value;
    }

    // Trigger change event
    const event = new Event('change', { bubbles: true });
    element.dispatchEvent(event);

    // Trigger input event for completeness
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get value from an input field
 * @param {Element} element - Input element
 * @returns {string} Field value
 */
export function getFieldValue(element) {
  if (!element) {
    throw new Error('Element must be provided');
  }

  if (element.type === 'checkbox' || element.type === 'radio') {
    return element.checked ? 'true' : 'false';
  }

  return element.value || '';
}

/**
 * Fill multiple fields in a container
 * @param {Element} container - Container element
 * @param {Object} fieldData - Field data {fieldName: value}
 * @returns {Object} Results {success: boolean, filled: number, failed: Array}
 */
export function fillFields(container, fieldData) {
  if (!container) {
    throw new Error('Container must be provided');
  }

  if (!fieldData || typeof fieldData !== 'object') {
    throw new Error('Field data must be an object');
  }

  const results = {
    success: true,
    filled: 0,
    failed: []
  };

  Object.entries(fieldData).forEach(([fieldName, value]) => {
    const element = findFieldElement(container, fieldName);

    if (!element) {
      results.failed.push({
        field: fieldName,
        reason: 'Element not found'
      });
      logger.debug('Field not found', { fieldName });
    } else {
      const success = setFieldValue(element, value);
      if (success) {
        results.filled++;
        logger.debug('Field filled', { fieldName });
      } else {
        results.failed.push({
          field: fieldName,
          reason: 'Failed to set value'
        });
        logger.warn('Failed to fill field', { fieldName });
      }
    }
  });

  results.success = results.failed.length === 0;

  logger.info('Fill fields complete', {
    filled: results.filled,
    failed: results.failed.length,
    success: results.success
  });

  return results;
}
