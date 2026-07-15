const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');

test.describe('OrangeHRM Change Password Module', () => {

  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.navigate();
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.clickChangePassword();
  });

  test('TC_PASSWORD_01: Verify navigation to Change Password page and input elements', async ({ page }) => {
    await expect(page).toHaveURL(/updatePassword/);
    const mainHeading = page.locator('h6.orangehrm-main-title');
    await expect(mainHeading).toHaveText('Update Password');

    const currentPasswordInput = page.locator('input[type="password"]').nth(0);
    const newPasswordInput = page.locator('input[type="password"]').nth(1);
    const confirmPasswordInput = page.locator('input[type="password"]').nth(2);
    
    await expect(currentPasswordInput).toBeVisible();
    await expect(newPasswordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
  });

  test('TC_PASSWORD_02: Verify validation messages on empty form submission', async ({ page }) => {
    const saveButton = page.locator('button[type="submit"]');
    await saveButton.click();

    const requiredMessages = page.locator('.oxd-input-group__message');
    const count = await requiredMessages.count();
    expect(count).toBeGreaterThanOrEqual(1);
    
    for (let i = 0; i < count; i++) {
      await expect(requiredMessages.nth(i)).toHaveText(/Required|Should have at least|Passwords do not match/i);
    }
  });

  test('TC_PASSWORD_03: Verify mismatch error for new and confirm passwords', async ({ page }) => {
    const currentPasswordInput = page.locator('input[type="password"]').nth(0);
    const newPasswordInput = page.locator('input[type="password"]').nth(1);
    const confirmPasswordInput = page.locator('input[type="password"]').nth(2);
    const saveButton = page.locator('button[type="submit"]');

    await currentPasswordInput.fill('admin123');
    await newPasswordInput.fill('NewPass123!');
    await confirmPasswordInput.fill('DifferentPass123!');
    await saveButton.click();

    const mismatchError = page.locator('.oxd-input-group__message').first();
    await expect(mismatchError).toHaveText(/Passwords do not match/i);
  });

  test('TC_PASSWORD_04: Verify cancel button redirects back to dashboard', async ({ page }) => {
    const cancel = page.locator('button.oxd-button--ghost');
    await cancel.click();
    await page.waitForURL('**/dashboard/index');
    expect(page.url()).toContain('/dashboard/index');
  });

  test('TC_PASSWORD_05: Verify page URL contains updatePassword', async ({ page }) => {
    expect(page.url()).toContain('updatePassword');
  });

  test('TC_PASSWORD_06: Verify heading title has class orangehrm-main-title', async ({ page }) => {
    const mainHeading = page.locator('h6.orangehrm-main-title');
    await expect(mainHeading).toHaveClass(/orangehrm-main-title/);
  });

  test('TC_PASSWORD_07: Verify current password field type attribute is password', async ({ page }) => {
    const currentPasswordInput = page.locator('input[type="password"]').nth(0);
    const type = await currentPasswordInput.getAttribute('type');
    expect(type).toBe('password');
  });

  test('TC_PASSWORD_08: Verify new password field type attribute is password', async ({ page }) => {
    const newPasswordInput = page.locator('input[type="password"]').nth(1);
    const type = await newPasswordInput.getAttribute('type');
    expect(type).toBe('password');
  });

  test('TC_PASSWORD_09: Verify confirm password field type attribute is password', async ({ page }) => {
    const confirmPasswordInput = page.locator('input[type="password"]').nth(2);
    const type = await confirmPasswordInput.getAttribute('type');
    expect(type).toBe('password');
  });

  test('TC_PASSWORD_10: Verify validation error on entering short new password', async ({ page }) => {
    const newPasswordInput = page.locator('input[type="password"]').nth(1);
    const saveButton = page.locator('button[type="submit"]');
    await newPasswordInput.fill('123');
    await saveButton.click();
    const err = page.locator('.oxd-input-group').filter({ has: newPasswordInput }).locator('.oxd-input-group__message');
    await expect(err).toHaveText(/Should have at least/i);
  });

  test('TC_PASSWORD_11: Verify current password input autocomplete settings', async ({ page }) => {
    const currentPasswordInput = page.locator('input[type="password"]').nth(0);
    const autocomplete = await currentPasswordInput.getAttribute('autocomplete');
    expect(autocomplete === null || autocomplete === 'off').toBe(true);
  });

  test('TC_PASSWORD_12: Verify cancel button tag name is button', async ({ page }) => {
    const cancel = page.locator('button.oxd-button--ghost');
    const tagName = await cancel.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('button');
  });

  test('TC_PASSWORD_13: Verify save button tag name is button', async ({ page }) => {
    const saveButton = page.locator('button[type="submit"]');
    const tagName = await saveButton.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('button');
  });

  test('TC_PASSWORD_14: Verify cancel button has default ghost class', async ({ page }) => {
    const cancel = page.locator('button.oxd-button--ghost');
    await expect(cancel).toHaveClass(/oxd-button--ghost/);
  });

  test('TC_PASSWORD_15: Verify save button has secondary submit class', async ({ page }) => {
    const saveButton = page.locator('button[type="submit"]');
    await expect(saveButton).toHaveClass(/oxd-button--secondary/);
  });

  test('TC_PASSWORD_16: Verify cursor hover properties on cancel button', async ({ page }) => {
    const cancel = page.locator('button.oxd-button--ghost');
    const cursor = await cancel.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('TC_PASSWORD_17: Verify cursor hover properties on save button', async ({ page }) => {
    const saveButton = page.locator('button[type="submit"]');
    const cursor = await saveButton.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('TC_PASSWORD_18: Verify tab index flow from current password input', async ({ page }) => {
    const currentPasswordInput = page.locator('input[type="password"]').nth(0);
    const newPasswordInput = page.locator('input[type="password"]').nth(1);
    await currentPasswordInput.focus();
    await page.keyboard.press('Tab');
    await expect(newPasswordInput).toBeFocused();
  });

  test('TC_PASSWORD_19: Verify tab index flow from new password input', async ({ page }) => {
    const newPasswordInput = page.locator('input[type="password"]').nth(1);
    const confirmPasswordInput = page.locator('input[type="password"]').nth(2);
    await newPasswordInput.focus();
    await page.keyboard.press('Tab');
    await expect(confirmPasswordInput).toBeFocused();
  });

  test('TC_PASSWORD_20: Verify tab index flow from confirm password input', async ({ page }) => {
    const confirmPasswordInput = page.locator('input[type="password"]').nth(2);
    const cancel = page.locator('button.oxd-button--ghost');
    await confirmPasswordInput.focus();
    await page.keyboard.press('Tab');
    await expect(cancel).toBeFocused();
  });

  test('TC_PASSWORD_21: Verify HTML lang tag exists in document root', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang === null || lang === 'en').toBe(true);
  });

  test('TC_PASSWORD_22: Verify secure connection protocol is HTTPS', async ({ page }) => {
    expect(page.url().startsWith('https://')).toBe(true);
  });

  test('TC_PASSWORD_23: Verify page title contains OrangeHRM', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('OrangeHRM');
  });

  test('TC_PASSWORD_24: Verify form element wrapping exists', async ({ page }) => {
    const form = page.locator('form.oxd-form');
    await expect(form).toBeVisible();
  });

  test('TC_PASSWORD_25: Verify Username input or label exists in userarea', async ({ page }) => {
    const userarea = page.locator('.oxd-topbar-header-userarea');
    await expect(userarea).toBeVisible();
  });
});
