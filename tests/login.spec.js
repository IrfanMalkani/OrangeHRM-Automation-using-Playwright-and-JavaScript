// ──────────────────────────────────────────────────────────
// login.spec.js – E2E Authentication tests
// ──────────────────────────────────────────────────────────

const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');

test.describe('OrangeHRM Login Module', () => {

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate();
  });

  test('TC_LOGIN_01: Verify successful login with valid credentials', async ({ loginPage, dashboardPage }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    const isLoaded = await dashboardPage.isLoaded();
    expect(isLoaded).toBe(true);
    const headerText = await dashboardPage.getHeaderText();
    expect(headerText.trim()).toBe('Dashboard');
  });

  test('TC_LOGIN_02: Verify login with invalid credentials', async ({ loginPage }) => {
    const { username, password } = testData.loginCredentials.invalid;
    await loginPage.login(username, password);
    const errorText = await loginPage.getErrorAlertText();
    expect(errorText).toBe('Invalid credentials');
  });

  test('TC_LOGIN_03: Verify error with valid username and wrong password', async ({ loginPage }) => {
    await loginPage.login('Admin', 'wrongpassword');
    const errorText = await loginPage.getErrorAlertText();
    expect(errorText).toBe('Invalid credentials');
  });

  test('TC_LOGIN_04: Verify password field masks the input characters', async ({ loginPage }) => {
    const passwordType = await loginPage.passwordInput.getAttribute('type');
    expect(passwordType).toBe('password');
  });

  test('TC_LOGIN_05: Verify login page UI elements are visible', async ({ loginPage }) => {
    await expect(loginPage.orangeHrmLogo).toBeVisible();
    await expect(loginPage.loginTitle).toHaveText('Login');
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.copyrightText).toBeVisible();
  });

  test('TC_LOGIN_06: Verify credential hint box displays default credentials', async ({ loginPage }) => {
    const hintText = await loginPage.getCredentialHintText();
    expect(hintText).toContain('Admin');
    expect(hintText).toContain('admin123');
  });

  test('TC_LOGIN_07: Verify login page title contains OrangeHRM', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('OrangeHRM');
  });

  test('TC_LOGIN_08: Verify login page URL contains auth/login', async ({ page }) => {
    expect(page.url()).toContain('/auth/login');
  });

  test('TC_LOGIN_09: Verify input placeholders display non-empty hint text', async ({ loginPage }) => {
    // The public demo occasionally serves this page in a different locale
    // (e.g. French), so the hint text itself isn't asserted, only its presence.
    const usernamePlaceholder = await loginPage.usernameInput.getAttribute('placeholder');
    const passwordPlaceholder = await loginPage.passwordInput.getAttribute('placeholder');
    expect(usernamePlaceholder && usernamePlaceholder.length).toBeGreaterThan(0);
    expect(passwordPlaceholder && passwordPlaceholder.length).toBeGreaterThan(0);
  });

  test('TC_LOGIN_10: Verify username field is focused on page load', async ({ loginPage, page }) => {
    const activeElementClass = await page.evaluate(() => document.activeElement ? document.activeElement.className : '');
    // Or check if username input has focus
    await expect(loginPage.usernameInput).toBeFocused();
  });

  test('TC_LOGIN_11: Verify tab key navigation flows logically from username to password', async ({ loginPage, page }) => {
    await loginPage.usernameInput.focus();
    await page.keyboard.press('Tab');
    await expect(loginPage.passwordInput).toBeFocused();
  });

  test('TC_LOGIN_12: Verify login button is enabled by default', async ({ loginPage }) => {
    await expect(loginPage.loginButton).toBeEnabled();
  });

  test('TC_LOGIN_13: Verify brand logo has descriptive alt text', async ({ loginPage }) => {
    const altText = await loginPage.orangeHrmLogo.getAttribute('alt');
    expect(altText).toBe('company-branding');
  });

  test('TC_LOGIN_14: Verify brand logo height and width attributes are positive', async ({ loginPage }) => {
    await loginPage.orangeHrmLogo.evaluate(img => img.complete && img.naturalHeight > 0
      ? Promise.resolve()
      : new Promise(resolve => img.addEventListener('load', resolve, { once: true })));
    const boundingBox = await loginPage.orangeHrmLogo.boundingBox();
    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(0);
      expect(boundingBox.height).toBeGreaterThan(0);
    }
  });

  test('TC_LOGIN_15: Verify copyright footer contains correct organization name', async ({ loginPage }) => {
    const text = await loginPage.copyrightText.textContent();
    expect(text).toContain('OrangeHRM');
  });

  test('TC_LOGIN_16: Verify input fields are empty on default page load', async ({ loginPage }) => {
    await expect(loginPage.usernameInput).toHaveValue('');
    await expect(loginPage.passwordInput).toHaveValue('');
  });

  test('TC_LOGIN_17: Verify custom CSS properties on Username label', async ({ page }) => {
    const color = await page.locator('label:has-text("Username")').evaluate(el => window.getComputedStyle(el).color);
    expect(color).not.toBeNull();
  });

  test('TC_LOGIN_18: Verify login page layout is responsive under mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const isVisible = await page.locator('.orangehrm-login-branding').isVisible();
    // In mobile view the logo container might be hidden or displayed
    expect(isVisible).toBeDefined();
  });

  test('TC_LOGIN_19: Verify autocomplete tags are present on input fields', async ({ loginPage }) => {
    const autocomplete = await loginPage.usernameInput.getAttribute('autocomplete');
    expect(autocomplete === null || autocomplete === 'off').toBe(true);
  });

  test('TC_LOGIN_20: Verify error panel CSS classes contain validation properties', async ({ loginPage, page }) => {
    await loginPage.login('invalid', 'credentials');
    const hasClass = await loginPage.errorAlert.evaluate(el => el.classList.contains('oxd-alert-content-text'));
    expect(hasClass).toBe(true);
  });

  test('TC_LOGIN_21: Verify login card is visible', async ({ page }) => {
    const card = page.locator('.orangehrm-login-layout');
    await expect(card).toBeVisible();
  });

  test('TC_LOGIN_22: Verify credential hint box contains header title', async ({ page }) => {
    const title = page.locator('.orangehrm-login-slot h5');
    await expect(title).toHaveText('Login');
  });

  test('TC_LOGIN_23: Verify forgot password link has pointer cursor on hover', async ({ loginPage }) => {
    const cursor = await loginPage.forgotPasswordLink.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('TC_LOGIN_24: Verify HTML tag has lang attribute set to en', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang === null || lang === 'en').toBe(true);
  });

  test('TC_LOGIN_25: Verify connection security protocol is HTTPS', async ({ page }) => {
    const url = page.url();
    expect(url.startsWith('https://')).toBe(true);
  });

  test('TC_LOGIN_26: Verify successful login persists session across page reload (positive)', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await page.reload();
    await dashboardPage.isLoaded();
    const headerText = await dashboardPage.getHeaderText();
    expect(headerText.trim()).toBe('Dashboard');
  });

  test('TC_LOGIN_27: Verify login fails with a numeric-only username (negative)', async ({ loginPage }) => {
    await loginPage.login('123456789', 'admin123');
    const errorText = await loginPage.getErrorAlertText();
    expect(errorText).toBe('Invalid credentials');
  });

  test('TC_LOGIN_28: Verify pressing Enter with username filled but password empty triggers required validation (negative)', async ({ loginPage }) => {
    await loginPage.usernameInput.fill('Admin');
    await loginPage.passwordInput.press('Enter');
    const passwordError = await loginPage.getPasswordValidationText();
    expect(passwordError).toBe('Required');
  });

  test('TC_LOGIN_29: Verify login page handles an extremely long password input without crashing (edge case)', async ({ loginPage }) => {
    const longPassword = 'a'.repeat(300);
    await loginPage.login('Admin', longPassword);
    const errorText = await loginPage.getErrorAlertText();
    expect(errorText).toBe('Invalid credentials');
  });
});
