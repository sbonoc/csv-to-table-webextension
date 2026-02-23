import fs from 'fs';
import path from 'path';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

function loadSidebarDocument() {
  const sidebarHtmlPath = path.resolve('src/presentation/sidebar/sidebar.html');
  const sidebarCssPath = path.resolve('src/presentation/sidebar/sidebar.css');

  const sidebarHtml = fs.readFileSync(sidebarHtmlPath, 'utf8');
  const sidebarCss = fs.readFileSync(sidebarCssPath, 'utf8');

  const htmlWithoutCssLink = sidebarHtml.replace(/<link[^>]*href=["']sidebar\.css["'][^>]*>/i, '');
  const htmlWithoutScript = htmlWithoutCssLink.replace(/<script[^>]*src=["']sidebar\.js["'][^>]*><\/script>/i, '');

  return htmlWithoutScript.replace('</head>', `<style>${sidebarCss}</style></head>`);
}

test.describe('CSV to Table Filler - Sidebar Accessibility', () => {
  test('should have no critical/serious WCAG 2.1 violations on sidebar UI', async ({ page }) => {
    const sidebarDocument = loadSidebarDocument();
    await page.setContent(sidebarDocument, { waitUntil: 'domcontentloaded' });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const relevantViolations = accessibilityScanResults.violations.filter((violation) => (
      violation.impact === 'critical' || violation.impact === 'serious'
    ));

    expect(relevantViolations, JSON.stringify(relevantViolations, null, 2)).toEqual([]);
  });
});
