import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTableFields,
  getElementSelector,
  findFieldElement,
  setFieldValue,
  getFieldValue,
  fillFields
} from './table-handler.js';

describe('Table Handler - Unit Tests', () => {
  let container;

  beforeEach(() => {
    // Create a test DOM structure
    document.body.innerHTML = `
      <div id="test-container">
        <input type="text" id="name-field" value="" />
        <input type="email" name="email" value="" />
        <input type="number" id="age-field" value="" />
        <input type="checkbox" name="agree" value="" />
        <select name="department">
          <option value="">Select...</option>
          <option value="Sales">Sales</option>
          <option value="Engineering">Engineering</option>
        </select>
        <textarea name="notes"></textarea>
      </div>
    `;
    container = document.getElementById('test-container');
  });

  describe('getTableFields', () => {
    it('should get all fields from container', () => {
      const fields = getTableFields(container);

      expect(fields.length).toBe(6);
      expect(fields[0].name).toBe('name-field');
      expect(fields[1].name).toBe('email');
    });

    it('should include field types', () => {
      const fields = getTableFields(container);
      const emailField = fields.find(f => f.name === 'email');

      expect(emailField.type).toBe('email');
    });

    it('should handle unnamed fields', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'placeholder text';
      container.appendChild(input);

      const fields = getTableFields(container);
      const lastField = fields[fields.length - 1];

      expect(lastField.name).toBe('placeholder text');
    });

    it('should throw error for null element', () => {
      expect(() => getTableFields(null)).toThrow('Element must be provided');
    });

    it('should return empty array for container with no fields', () => {
      const emptyDiv = document.createElement('div');
      const fields = getTableFields(emptyDiv);

      expect(fields).toEqual([]);
    });
  });

  describe('getElementSelector', () => {
    it('should use id if available', () => {
      const element = document.getElementById('name-field');
      const selector = getElementSelector(element);

      expect(selector).toBe('#name-field');
    });

    it('should use name attribute', () => {
      const element = document.querySelector('[name="email"]');
      const selector = getElementSelector(element);

      expect(selector).toBe('[name="email"]');
    });

    it('should generate selector for elements without id or name', () => {
      const input = document.createElement('input');
      container.appendChild(input);

      const selector = getElementSelector(input);

      expect(selector).toContain('input');
    });

    it('should throw error for null element', () => {
      expect(() => getElementSelector(null)).toThrow('Element must be provided');
    });
  });

  describe('findFieldElement', () => {
    it('should find element by name', () => {
      const element = findFieldElement(container, 'email');

      expect(element).not.toBeNull();
      expect(element.name).toBe('email');
    });

    it('should find element by id', () => {
      const element = findFieldElement(container, 'name-field');

      expect(element).not.toBeNull();
      expect(element.id).toBe('name-field');
    });

    it('should find element by selector', () => {
      const element = findFieldElement(container, null, '[name="email"]');

      expect(element).not.toBeNull();
      expect(element.name).toBe('email');
    });

    it('should return null for non-existent field', () => {
      const element = findFieldElement(container, 'nonexistent');

      expect(element).toBeNull();
    });

    it('should throw error for null container', () => {
      expect(() => findFieldElement(null, 'email')).toThrow('Container must be provided');
    });
  });

  describe('setFieldValue', () => {
    it('should set text input value', () => {
      const input = document.getElementById('name-field');
      setFieldValue(input, 'John Doe');

      expect(input.value).toBe('John Doe');
    });

    it('should set select value', () => {
      const select = container.querySelector('[name="department"]');
      setFieldValue(select, 'Engineering');

      expect(select.value).toBe('Engineering');
    });

    it('should set checkbox value', () => {
      const checkbox = container.querySelector('[name="agree"]');
      setFieldValue(checkbox, 'true');

      expect(checkbox.checked).toBe(true);
    });

    it('should set checkbox to unchecked', () => {
      const checkbox = container.querySelector('[name="agree"]');
      checkbox.checked = true;
      setFieldValue(checkbox, 'false');

      expect(checkbox.checked).toBe(false);
    });

    it('should set textarea value', () => {
      const textarea = container.querySelector('[name="notes"]');
      setFieldValue(textarea, 'Some notes');

      expect(textarea.value).toBe('Some notes');
    });

    it('should throw error for null element', () => {
      expect(() => setFieldValue(null, 'value')).toThrow('Element must be provided');
    });

    it('should throw error for non-string value', () => {
      const input = document.getElementById('name-field');
      expect(() => setFieldValue(input, 123)).toThrow('Value must be a string');
    });
  });

  describe('getFieldValue', () => {
    it('should get text input value', () => {
      const input = document.getElementById('name-field');
      input.value = 'John Doe';

      expect(getFieldValue(input)).toBe('John Doe');
    });

    it('should get checkbox value', () => {
      const checkbox = container.querySelector('[name="agree"]');
      checkbox.checked = true;

      expect(getFieldValue(checkbox)).toBe('true');
    });

    it('should get unchecked checkbox as false', () => {
      const checkbox = container.querySelector('[name="agree"]');
      checkbox.checked = false;

      expect(getFieldValue(checkbox)).toBe('false');
    });

    it('should return empty string for empty input', () => {
      const input = document.getElementById('name-field');
      expect(getFieldValue(input)).toBe('');
    });

    it('should throw error for null element', () => {
      expect(() => getFieldValue(null)).toThrow('Element must be provided');
    });
  });

  describe('fillFields', () => {
    it('should fill multiple fields', () => {
      const data = {
        'name-field': 'John Doe',
        'email': 'john@example.com',
        'department': 'Engineering'
      };

      const result = fillFields(container, data);

      expect(result.success).toBe(true);
      expect(result.filled).toBe(3);
      expect(result.failed.length).toBe(0);

      expect(document.getElementById('name-field').value).toBe('John Doe');
      expect(document.querySelector('[name="email"]').value).toBe('john@example.com');
      expect(document.querySelector('[name="department"]').value).toBe('Engineering');
    });

    it('should handle missing fields', () => {
      const data = {
        'name-field': 'John',
        'nonexistent': 'value'
      };

      const result = fillFields(container, data);

      expect(result.success).toBe(false);
      expect(result.filled).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].field).toBe('nonexistent');
    });

    it('should return empty result for empty data', () => {
      const result = fillFields(container, {});

      expect(result.success).toBe(true);
      expect(result.filled).toBe(0);
    });

    it('should throw error for null container', () => {
      expect(() => fillFields(null, {})).toThrow('Container must be provided');
    });

    it('should throw error for null fieldData', () => {
      expect(() => fillFields(container, null)).toThrow('Field data must be an object');
    });
  });
});
