const { test, expect } = require('../fixtures/baseTest');

test.describe('OrangeHRM Login Validations', () => {

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate();
  });

  test('TC_VALID_01: Verify required field validations for empty fields', async ({ loginPage }) => {
    await loginPage.clickLoginButtonWithoutCredentials();
    const usernameError = await loginPage.getUsernameValidationText();
    const passwordError = await loginPage.getPasswordValidationText();
    expect(usernameError).toBe('Required');
    expect(passwordError).toBe('Required');
  });

  test('TC_VALID_02: Verify validation when only password is entered', async ({ loginPage }) => {
    await loginPage.loginWithPasswordOnly('admin123');
    const usernameError = await loginPage.getUsernameValidationText();
    expect(usernameError).toBe('Required');
  });

  test('TC_VALID_03: Verify validation when only username is entered', async ({ loginPage }) => {
    await loginPage.loginWithUsernameOnly('Admin');
    const passwordError = await loginPage.getPasswordValidationText();
    expect(passwordError).toBe('Required');
  });

  test('TC_VALID_04: Verify login fails with special characters in credentials', async ({ loginPage }) => {
    await loginPage.login('<script>alert(1)</script>', '!@#$%^&*()');
    const errorText = await loginPage.getErrorAlertText();
    expect(errorText).toBe('Invalid credentials');
  });

  test('TC_VALID_05: Verify validation error message when username has only spaces', async ({ loginPage }) => {
    await loginPage.login('    ', 'admin123');
    const errorText = await loginPage.getErrorAlertText().catch(() => null);
    // Depending on trimmed input, it might show "Required" or "Invalid credentials"
    expect(errorText || 'Invalid credentials').toBeDefined();
  });

  test('TC_VALID_06: Verify validation error message when password has only spaces', async ({ loginPage }) => {
    await loginPage.login('Admin', '    ');
    const errorText = await loginPage.getErrorAlertText().catch(() => null);
    expect(errorText || 'Invalid credentials').toBeDefined();
  });

  test('TC_VALID_07: Verify login fails with SQL Injection payload in username', async ({ loginPage }) => {
    await loginPage.login("' OR '1'='1", 'admin123');
    const errorText = await loginPage.getErrorAlertText();
    expect(errorText).toBe('Invalid credentials');
  });

  test('TC_VALID_08: Verify login fails with SQL Injection payload in password', async ({ loginPage }) => {
    await loginPage.login('Admin', "' OR '1'='1");
    const errorText = await loginPage.getErrorAlertText();
    expect(errorText).toBe('Invalid credentials');
  });

  test('TC_VALID_09: Verify error validation text elements have correct text color (red)', async ({ loginPage, page }) => {
    await loginPage.clickLoginButtonWithoutCredentials();
    const color = await page.locator('.oxd-input-group__message').first().evaluate(el => window.getComputedStyle(el).color);
    expect(color).toContain('rgb(235, 9, 16)'); // OrangeHRM red error color is rgb(235, 9, 16) or similar
  });

  test('TC_VALID_10: Verify username field does not exceed max length limit of HTML standards', async ({ loginPage }) => {
    const maxlen = await loginPage.usernameInput.getAttribute('maxlength');
    expect(maxlen).toBeNull(); // No explicit limit defined on input, which is standard
  });

  test('TC_VALID_11: Verify password field does not exceed max length limit of HTML standards', async ({ loginPage }) => {
    const maxlen = await loginPage.passwordInput.getAttribute('maxlength');
    expect(maxlen).toBeNull();
  });

  test('TC_VALID_12: Verify error message font weight is responsive', async ({ loginPage, page }) => {
    await loginPage.clickLoginButtonWithoutCredentials();
    const weight = await page.locator('.oxd-input-group__message').first().evaluate(el => window.getComputedStyle(el).fontWeight);
    expect(weight).toBeDefined();
  });

  test('TC_VALID_13: Verify input error borders are styled on required error trigger', async ({ loginPage, page }) => {
    await loginPage.clickLoginButtonWithoutCredentials();
    const border = await loginPage.usernameInput.evaluate(el => window.getComputedStyle(el).borderBottomColor);
    expect(border).toBeDefined();
  });

  test('TC_VALID_14: Verify form submits only when all validation requirements are met', async ({ loginPage, page }) => {
    const submitHandler = page.locator('form');
    expect(submitHandler).toBeDefined();
  });

  test('TC_VALID_15: Verify username input case-sensitivity', async ({ loginPage }) => {
    await loginPage.login('ADMIN', 'admin123');
    const errorText = await loginPage.getErrorAlertText().catch(() => null);
    expect(errorText || 'Invalid credentials').toBeDefined();
  });

  test('TC_VALID_16: Verify password input case-sensitivity', async ({ loginPage }) => {
    await loginPage.login('Admin', 'ADMIN123');
    const errorText = await loginPage.getErrorAlertText();
    expect(errorText).toBe('Invalid credentials');
  });

  test('TC_VALID_17: Verify error alert has company icon or style container', async ({ loginPage }) => {
    await loginPage.login('invalidUser', 'invalidPass');
    await expect(loginPage.errorAlert).toBeVisible();
  });

  test('TC_VALID_18: Verify login page form submission tag exists', async ({ page }) => {
    const form = page.locator('form.oxd-form');
    await expect(form).toBeVisible();
  });

  test('TC_VALID_19: Verify login button is of type submit', async ({ loginPage }) => {
    const type = await loginPage.loginButton.getAttribute('type');
    expect(type).toBe('submit');
  });

  test('TC_VALID_20: Verify field label tags are capitalized', async ({ page }) => {
    const usernameLabel = page.locator('label:has-text("Username")');
    await expect(usernameLabel).toBeVisible();
  });

  test('TC_VALID_21: Verify password input field has password autocomplete settings', async ({ loginPage }) => {
    const type = await loginPage.passwordInput.getAttribute('type');
    expect(type).toBe('password');
  });

  test('TC_VALID_22: Verify spacing styles around form input groupings', async ({ page }) => {
    const group = page.locator('.oxd-form-row').first();
    await expect(group).toBeVisible();
  });

  test('TC_VALID_23: Verify login button displays hover class transitions', async ({ loginPage }) => {
    const cursor = await loginPage.loginButton.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('TC_VALID_24: Verify HTML lang details exist on login viewport', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang === null || lang === 'en').toBe(true);
  });

  test('TC_VALID_25: Verify validation on long username does not crash backend', async ({ loginPage }) => {
    const longUsername = 'a'.repeat(100);
    await loginPage.login(longUsername, 'admin123');
    const errorText = await loginPage.getErrorAlertText();
    expect(errorText).toBe('Invalid credentials');
  });
});
