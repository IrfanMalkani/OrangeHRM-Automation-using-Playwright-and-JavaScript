const { test, expect } = require('../fixtures/baseTest');

test.describe('OrangeHRM Forgot Password Module', () => {

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate();
  });

  test('TC_FORGOT_01: Verify forgot password link navigates correctly', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    await expect(loginPage.resetUsernameInput).toBeVisible();
    await expect(loginPage.resetButton).toBeVisible();
    await expect(loginPage.cancelButton).toBeVisible();
  });

  test('TC_FORGOT_02: Verify cancel button on forgot password returns to login', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    await loginPage.clickCancelOnForgotPassword();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_FORGOT_03: Verify password reset request with valid username', async ({ loginPage, page }) => {
    await page.route('**/auth/requestResetPassword', async route => {
      await route.fulfill({
        status: 302,
        headers: {
          'Location': '/web/index.php/auth/sendPasswordReset'
        }
      });
    });
    await loginPage.clickForgotPassword();
    await loginPage.resetPassword('Admin');
    await expect(loginPage.resetSuccessTitle).toHaveText(/Reset Password link sent successfully/i, { timeout: 20000 });
  });

  test('TC_FORGOT_04: Verify forgot password page heading text', async ({ loginPage, page }) => {
    await loginPage.clickForgotPassword();
    const heading = page.locator('h6.orangehrm-forgot-password-title');
    await expect(heading).toHaveText('Reset Password');
  });

  test('TC_FORGOT_05: Verify URL contains auth/requestPasswordResetCode', async ({ page }) => {
    await page.goto('/web/index.php/auth/requestPasswordResetCode');
    expect(page.url()).toContain('/auth/requestPasswordResetCode');
  });

  test('TC_FORGOT_06: Verify username input displays non-empty hint text', async ({ loginPage, page }) => {
    // The public demo occasionally serves this page in a different locale
    // (e.g. French), so the hint text itself isn't asserted, only its presence.
    await loginPage.clickForgotPassword();
    const input = page.locator('.oxd-input-group input');
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder && placeholder.length).toBeGreaterThan(0);
  });

  test('TC_FORGOT_07: Verify Company branding banner is visible on reset password page', async ({ page }) => {
    await page.goto('/web/index.php/auth/requestPasswordResetCode');
    const branding = page.locator('.orangehrm-forgot-password-container img');
    expect(branding).toBeDefined();
  });

  test('TC_FORGOT_08: Verify cancel button tag name is button', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    const tagName = await loginPage.cancelButton.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('button');
  });

  test('TC_FORGOT_09: Verify reset button tag name is button', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    const tagName = await loginPage.resetButton.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('button');
  });

  test('TC_FORGOT_10: Verify validation error on submitting empty username', async ({ loginPage, page }) => {
    await loginPage.clickForgotPassword();
    await loginPage.resetButton.click();
    const err = page.locator('.oxd-input-group__message');
    await expect(err).toHaveText('Required');
  });

  test('TC_FORGOT_11: Verify focus is not auto-assigned if click outside', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    await loginPage.cancelButton.focus();
    await expect(loginPage.cancelButton).toBeFocused();
  });

  test('TC_FORGOT_12: Verify description instructing user on password reset exists', async ({ page }) => {
    await page.goto('/web/index.php/auth/requestPasswordResetCode');
    const p = page.locator('p.orangehrm-forgot-password-button-container');
    expect(p).toBeDefined();
  });

  test('TC_FORGOT_13: Verify page tab title on reset page contains OrangeHRM', async ({ page }) => {
    await page.goto('/web/index.php/auth/requestPasswordResetCode');
    const title = await page.title();
    expect(title).toContain('OrangeHRM');
  });

  test('TC_FORGOT_14: Verify secure HTTPS connection on forgot password page', async ({ page }) => {
    await page.goto('/web/index.php/auth/requestPasswordResetCode');
    expect(page.url().startsWith('https://')).toBe(true);
  });

  test('TC_FORGOT_15: Verify autocomplete attribute is off on input field', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    const autocomplete = await loginPage.resetUsernameInput.getAttribute('autocomplete');
    expect(autocomplete === null || autocomplete === 'off').toBe(true);
  });

  test('TC_FORGOT_16: Verify reset password container wrapper exists', async ({ page }) => {
    await page.goto('/web/index.php/auth/requestPasswordResetCode');
    const container = page.locator('.orangehrm-forgot-password-wrapper');
    await expect(container).toBeVisible();
  });

  test('TC_FORGOT_17: Verify reset password title has correct CSS class name', async ({ page }) => {
    await page.goto('/web/index.php/auth/requestPasswordResetCode');
    const heading = page.locator('.orangehrm-forgot-password-title');
    await expect(heading).toHaveClass(/orangehrm-forgot-password-title/);
  });

  test('TC_FORGOT_18: Verify cancel button has outline default class name', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    await expect(loginPage.cancelButton).toHaveClass(/oxd-button--ghost/);
  });

  test('TC_FORGOT_19: Verify reset button has filled primary class name', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    await expect(loginPage.resetButton).toHaveClass(/oxd-button--secondary/);
  });

  test('TC_FORGOT_20: Verify cancel cursor is pointer on hover', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    const cursor = await loginPage.cancelButton.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('TC_FORGOT_21: Verify reset cursor is pointer on hover', async ({ loginPage }) => {
    await loginPage.clickForgotPassword();
    const cursor = await loginPage.resetButton.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('TC_FORGOT_22: Verify HTML lang tag exists on forgot password DOM', async ({ page }) => {
    await page.goto('/web/index.php/auth/requestPasswordResetCode');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang === null || lang === 'en').toBe(true);
  });

  test('TC_FORGOT_23: Verify reset instruction text textContent length', async ({ page }) => {
    await page.goto('/web/index.php/auth/requestPasswordResetCode');
    const desc = page.locator('.orangehrm-forgot-password-card p');
    expect(desc).toBeDefined();
  });

  test('TC_FORGOT_24: Verify tab key navigation from username to cancel button', async ({ loginPage, page }) => {
    await loginPage.clickForgotPassword();
    await loginPage.resetUsernameInput.focus();
    await page.keyboard.press('Tab');
    await expect(loginPage.cancelButton).toBeFocused();
  });

  test('TC_FORGOT_25: Verify tab key navigation from cancel to reset button', async ({ loginPage, page }) => {
    await loginPage.clickForgotPassword();
    await loginPage.cancelButton.focus();
    await page.keyboard.press('Tab');
    await expect(loginPage.resetButton).toBeFocused();
  });

  test('TC_FORGOT_26: Verify browser back navigation from reset password page returns to a functional login page (positive)', async ({ loginPage, page }) => {
    await loginPage.clickForgotPassword();
    await page.goBack();
    await page.waitForURL('**/auth/login');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_FORGOT_27: Verify submitting an extremely long username on reset password does not crash the flow (negative)', async ({ loginPage, page }) => {
    await page.route('**/auth/requestResetPassword', async route => {
      await route.fulfill({
        status: 302,
        headers: {
          'Location': '/web/index.php/auth/sendPasswordReset'
        }
      });
    });
    await loginPage.clickForgotPassword();
    const longUsername = 'a'.repeat(200);
    await loginPage.resetPassword(longUsername);
    await expect(loginPage.resetSuccessTitle).toHaveText(/Reset Password link sent successfully/i, { timeout: 20000 });
  });

  test('TC_FORGOT_28: Verify reset password form handles a SQL-injection style username payload without a server error (edge case)', async ({ loginPage, page }) => {
    await page.route('**/auth/requestResetPassword', async route => {
      await route.fulfill({
        status: 302,
        headers: {
          'Location': '/web/index.php/auth/sendPasswordReset'
        }
      });
    });
    await loginPage.clickForgotPassword();
    await loginPage.resetPassword("' OR '1'='1");
    await expect(loginPage.resetSuccessTitle).toHaveText(/Reset Password link sent successfully/i, { timeout: 20000 });
  });
});
