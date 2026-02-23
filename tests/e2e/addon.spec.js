import { test, expect } from './fixtures.js';

/**
 * E2E Tests for CSV to Table Filler Extension
 * 
 * These tests verify the complete user workflows:
 * 1. Form accessibility and structure
 * 2. CSV data injection (what the extension does)
 * 3. Form filling and submission
 * 4. Batch processing of multiple CSV rows
 * 
 * Note: These tests simulate extension behavior without requiring the 
 * extension to be installed. In production, install via:
 * npm run build && web-ext run
 */

test.describe('CSV to Table Filler - Form Accessibility', () => {
  test('should load test form with all required fields', async ({ testContext }) => {
    const { page } = testContext;
    
    // Verify page title
    await expect(page).toHaveTitle(/CSV to Table Filler/);
    
    // Verify all form fields exist
    await page.waitForSelector('#firstName', { timeout: 5000 });
    await page.waitForSelector('#lastName', { timeout: 5000 });
    await page.waitForSelector('#email', { timeout: 5000 });
    await page.waitForSelector('#department', { timeout: 5000 });
    
    // Verify submit button
    const submitBtn = await page.locator('#submitBtn');
    await expect(submitBtn).toBeVisible();
  });

  test('should have correctly labeled form fields', async ({ testContext }) => {
    const { page } = testContext;
    
    // Labels should match field names
    const firstNameLabel = page.locator('label[for="firstName"]');
    await expect(firstNameLabel).toContainText('First Name');
    
    const lastNameLabel = page.locator('label[for="lastName"]');
    await expect(lastNameLabel).toContainText('Last Name');
    
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toContainText('Email');
    
    const departmentLabel = page.locator('label[for="department"]');
    await expect(departmentLabel).toContainText('Department');
  });

  test('department dropdown should have all options', async ({ testContext }) => {
    const { page } = testContext;
    
    const deptSelect = page.locator('#department');
    await deptSelect.click();
    
    // Verify all department options exist
    const options = await page.locator('#department option');
    const count = await options.count();
    
    // Default + 5 departments = 6 options
    expect(count).toBe(6);
  });
});

test.describe('CSV to Table Filler - Data Injection & Filling', () => {
  test('should fill form with single CSV row (Happy Path)', async ({ testContext }) => {
    const { fillFormWithCSVData, assertFieldValue, getFormData } = testContext;
    
    // Simulate CSV row from: FirstName,LastName,Email,Department
    const csvRow = {
      'FirstName': 'John',
      'LastName': 'Doe',
      'Email': 'john@example.com',
      'Department': 'Engineering'
    };
    
    await fillFormWithCSVData(csvRow);
    
    // Verify all fields were filled
    expect(await assertFieldValue('firstName', 'John')).toBe(true);
    expect(await assertFieldValue('lastName', 'Doe')).toBe(true);
    expect(await assertFieldValue('email', 'john@example.com')).toBe(true);
    
    // Verify dropdown
    const formData = await getFormData();
    expect(formData.department).toBe('Engineering');
  });

  test('should fill form with different CSV data', async ({ testContext }) => {
    const { fillFormWithCSVData, getFormData, resetForm } = testContext;
    
    const csvRow = {
      'FirstName': 'Jane',
      'LastName': 'Smith',
      'Email': 'jane@example.com',
      'Department': 'Sales'
    };
    
    await fillFormWithCSVData(csvRow);
    
    const formData = await getFormData();
    expect(formData.firstName).toBe('Jane');
    expect(formData.lastName).toBe('Smith');
    expect(formData.email).toBe('jane@example.com');
    expect(formData.department).toBe('Sales');
    
    // Cleanup
    await resetForm();
  });

  test('should handle special characters in CSV data', async ({ testContext }) => {
    const { fillFormWithCSVData, assertFieldValue } = testContext;
    
    const csvRow = {
      'FirstName': "O'Brien",
      'LastName': 'Müller',
      'Email': 'test+alias@example.com',
      'Department': 'Engineering'
    };
    
    await fillFormWithCSVData(csvRow);
    
    expect(await assertFieldValue('firstName', "O'Brien")).toBe(true);
    expect(await assertFieldValue('lastName', 'Müller')).toBe(true);
    expect(await assertFieldValue('email', 'test+alias@example.com')).toBe(true);
  });
});

test.describe('CSV to Table Filler - Form Submission', () => {
  test('should submit form with filled data', async ({ testContext }) => {
    const { fillFormWithCSVData, submitAndVerifySuccess } = testContext;
    
    const csvRow = {
      'FirstName': 'John',
      'LastName': 'Doe',
      'Email': 'john@example.com',
      'Department': 'Engineering'
    };
    
    await fillFormWithCSVData(csvRow);
    const submitted = await submitAndVerifySuccess();
    
    expect(submitted).toBe(true);
  });

  test('should show success message after submission', async ({ testContext }) => {
    const { fillFormWithCSVData, page } = testContext;
    
    const csvRow = {
      'FirstName': 'Bob',
      'LastName': 'Johnson',
      'Email': 'bob@example.com',
      'Department': 'Marketing'
    };
    
    await fillFormWithCSVData(csvRow);
    
    const submitBtn = await page.locator('#submitBtn');
    await submitBtn.click();
    
    const successMessage = await page.locator('#successMessage');
    await expect(successMessage).toHaveClass(/show/);
    await expect(successMessage).toContainText('successfully');
  });

  test('should reset form after submission', async ({ testContext }) => {
    const { fillFormWithCSVData, getFormData, resetForm } = testContext;
    
    const csvRow = {
      'FirstName': 'Test',
      'LastName': 'User',
      'Email': 'test@example.com',
      'Department': 'Finance'
    };
    
    await fillFormWithCSVData(csvRow);
    await resetForm();
    
    const formData = await getFormData();
    expect(formData.firstName).toBe('');
    expect(formData.lastName).toBe('');
    expect(formData.email).toBe('');
    expect(formData.department).toBe('');
  });
});

test.describe('CSV to Table Filler - Batch Processing', () => {
  test('should process multiple CSV rows sequentially', async ({ testContext }) => {
    const { fillFormWithCSVData, submitAndVerifySuccess, resetForm, getFormData } = testContext;
    
    // Sample CSV data (3 rows)
    const csvRows = [
      {
        'FirstName': 'John',
        'LastName': 'Doe',
        'Email': 'john@example.com',
        'Department': 'Engineering'
      },
      {
        'FirstName': 'Jane',
        'LastName': 'Smith',
        'Email': 'jane@example.com',
        'Department': 'Sales'
      },
      {
        'FirstName': 'Bob',
        'LastName': 'Johnson',
        'Email': 'bob@example.com',
        'Department': 'Marketing'
      }
    ];
    
    // Process each row
    for (const row of csvRows) {
      await fillFormWithCSVData(row);
      
      // Verify data is filled
      const formData = await getFormData();
      expect(formData.firstName).toBe(row.FirstName);
      expect(formData.lastName).toBe(row.LastName);
      expect(formData.email).toBe(row.Email);
      expect(formData.department).toBe(row.Department);
      
      // Submit
      await submitAndVerifySuccess();
      
      // Reset for next row
      await resetForm();
    }
  });

  test('should handle mixed data in batch processing', async ({ testContext }) => {
    const { fillFormWithCSVData, submitAndVerifySuccess, resetForm, getFormData } = testContext;
    
    // Different departments in one batch
    const csvRows = [
      {
        'FirstName': 'Alice',
        'LastName': 'Williams',
        'Email': 'alice@example.com',
        'Department': 'Engineering'
      },
      {
        'FirstName': 'Charlie',
        'LastName': 'Brown',
        'Email': 'charlie@example.com',
        'Department': 'HR'
      },
      {
        'FirstName': 'Diana',
        'LastName': 'Prince',
        'Email': 'diana@example.com',
        'Department': 'Finance'
      }
    ];
    
    let processedCount = 0;
    for (const row of csvRows) {
      await fillFormWithCSVData(row);
      
      const formData = await getFormData();
      expect(Object.values(formData).every(v => v)).toBe(true); // All fields filled
      
      processedCount++;
      
      // For last row, submit
      if (processedCount === csvRows.length) {
        await submitAndVerifySuccess();
      } else {
        await resetForm();
      }
    }
    
    expect(processedCount).toBe(3);
  });
});

test.describe('CSV to Table Filler - Error Handling', () => {
  test('should not accept empty form submission (validation)', async ({ testContext }) => {
    const { page } = testContext;
    
    // Try to submit without filling
    const form = await page.locator('form#employeeForm');
    
    // HTML5 validation should prevent submission
    const isValid = await form.evaluate((f) => f.checkValidity());
    expect(isValid).toBe(false);
  });

  test('should clear previous data when resetting form', async ({ testContext }) => {
    const { fillFormWithCSVData, resetForm, getFormData } = testContext;
    
    // Fill form
    await fillFormWithCSVData({
      'FirstName': 'Test',
      'LastName': 'Data',
      'Email': 'test@example.com',
      'Department': 'Sales'
    });
    
    // Reset
    await resetForm();
    
    // Verify all cleared
    const formData = await getFormData();
    Object.values(formData).forEach(value => {
      expect(value).toBe('');
    });
  });

  test('should handle partial CSV rows gracefully', async ({ testContext }) => {
    const { fillFormWithCSVData, getFormData } = testContext;
    
    // Partial data (missing Department)
    const partialRow = {
      'FirstName': 'Partial',
      'LastName': 'User',
      'Email': 'partial@example.com'
      // Department intentionally omitted
    };
    
    await fillFormWithCSVData(partialRow);
    
    const formData = await getFormData();
    expect(formData.firstName).toBe('Partial');
    expect(formData.lastName).toBe('User');
    expect(formData.email).toBe('partial@example.com');
    // Department remains empty (as expected)
    expect(formData.department).toBe('');
  });
});

test.describe('CSV to Table Filler - Performance & Limits', () => {
  test('should handle 100 rows in reasonable time', async ({ testContext }) => {
    const { fillFormWithCSVData, resetForm, getFormData } = testContext;
    
    const startTime = Date.now();
    const rowCount = 100;
    
    for (let i = 0; i < rowCount; i++) {
      const row = {
        'FirstName': `User${i}`,
        'LastName': `Test${i}`,
        'Email': `user${i}@example.com`,
        'Department': ['Engineering', 'Sales', 'Marketing'][i % 3]
      };
      
      await fillFormWithCSVData(row);
      await resetForm();
    }
    
    const duration = Date.now() - startTime;
    
    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(120000); // 2 minutes for 100 rows
  });
});

