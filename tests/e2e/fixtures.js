/**
 * E2E Test Fixtures and Utilities
 * 
 * Utilities for testing the CSS to Table Filler extension with Playwright
 */

import { test as base } from '@playwright/test';

/**
 * Custom fixture that sets up the test page and utilities
 */
export const test = base.extend({
  /**
   * Navigate to the test form and provide utilities
   */
  testContext: async ({ page }, use) => {
    // Navigate to test form
    await page.goto('/test-form.html');
    
    // Wait for the form to be ready
    await page.waitForSelector('form#employeeForm', { timeout: 5000 });
    
    // Create utility functions
    const testContext = {
      page,
      
      /**
       * Fill a form field with a value
       */
      fillField: async (fieldId, value) => {
        const field = await page.locator(`#${fieldId}`);
        await field.clear();
        await field.fill(value);
        await field.blur();  // Trigger change event
      },
      
      /**
       * Select an option from a dropdown
       */
      selectOption: async (fieldId, value) => {
        const select = await page.locator(`#${fieldId}`);
        await select.selectOption(value);
        await select.blur();  // Trigger change event
      },
      
      /**
       * Get current form data
       */
      getFormData: async () => {
        return await page.evaluate(() => window.getFormData());
      },
      
      /**
       * Reset form to initial state
       */
      resetForm: async () => {
        await page.evaluate(() => window.resetForm());
      },
      
      /**
       * Simulate the extension filling multiple rows from CSV
       */
      fillFormWithCSVData: async (csvRow) => {
        // CSS to Table Filler maps: FirstName->firstName, LastName->lastName, Email->email, Department->department
        const fieldMapping = {
          'FirstName': 'firstName',
          'LastName': 'lastName',
          'Email': 'email',
          'Department': 'department'
        };
        
        for (const [csvHeader, value] of Object.entries(csvRow)) {
          const fieldId = fieldMapping[csvHeader];
          if (!fieldId) continue;
          
          if (fieldId === 'department') {
            await testContext.selectOption(fieldId, value);
          } else {
            await testContext.fillField(fieldId, value);
          }
        }
      },
      
      /**
       * Submit the form and verify success
       */
      submitAndVerifySuccess: async () => {
        const submitBtn = await page.locator('#submitBtn');
        await submitBtn.click();
        
        // Wait for success message
        const successMsg = await page.locator('#successMessage');
        await successMsg.waitFor({ state: 'visible', timeout: 5000 });
        
        return true;
      },
      
      /**
       * Verify field has expected value
       */
      assertFieldValue: async (fieldId, expectedValue) => {
        const field = await page.locator(`#${fieldId}`);
        const actualValue = await field.inputValue();
        return actualValue === expectedValue;
      }
    };
    
    await use(testContext);
    
    // Cleanup
    await page.close();
  }
});

export { expect } from '@playwright/test';
