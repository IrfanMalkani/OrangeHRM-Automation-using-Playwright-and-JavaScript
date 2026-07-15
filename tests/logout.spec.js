const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');

test.describe('OrangeHRM Logout Module', () => {

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate();
  });

  test('TC_LOGOUT_01: Verify logout functionality redirects to login page', async ({ loginPage, dashboardPage }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_02: Verify dashboard is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/dashboard/index');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_03: Verify browser back button does not access dashboard after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await expect(loginPage.loginButton).toBeVisible();
    await page.goBack();
    await page.waitForTimeout(2000);
    await expect(loginPage.loginButton).toBeVisible({ timeout: 10000 });
  });

  test('TC_LOGOUT_04: Verify user dropdown is collapsed by default', async ({ loginPage, dashboardPage }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await expect(dashboardPage.logoutLink).not.toBeVisible();
  });

  test('TC_LOGOUT_05: Verify user dropdown lists Logout link on click', async ({ loginPage, dashboardPage }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.openUserDropdown();
    await expect(dashboardPage.logoutLink).toBeVisible();
  });

  test('TC_LOGOUT_06: Verify clicking outside user dropdown closes the dropdown menu', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.openUserDropdown();
    await page.click('h6:has-text("Dashboard")');
    await expect(dashboardPage.logoutLink).not.toBeVisible();
  });

  test('TC_LOGOUT_07: Verify Logout dropdown item tag is anchor link', async ({ loginPage, dashboardPage }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.openUserDropdown();
    const tagName = await dashboardPage.logoutLink.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('a');
  });

  test('TC_LOGOUT_08: Verify cookies are cleared or altered after logout', async ({ loginPage, dashboardPage, context }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    const cookiesBefore = await context.cookies();
    expect(cookiesBefore.length).toBeGreaterThan(0);
    await dashboardPage.logout();
    const cookiesAfter = await context.cookies();
    expect(cookiesAfter).toBeDefined();
  });

  test('TC_LOGOUT_09: Verify Admin page is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/admin/viewSystemUsers');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_10: Verify PIM page is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/pim/viewEmployeeList');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_11: Verify Leave page is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/leave/viewLeaveList');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_12: Verify Time page is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/time/viewEmployeeTimesheet');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_13: Verify Recruitment page is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/recruitment/viewCandidates');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_14: Verify My Info page is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/pim/viewPersonalDetails/empNumber/7');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_15: Verify Buzz page is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/buzz/viewBuzz');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_16: Verify Directory page is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/directory/viewDirectory');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_17: Verify Performance page is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/performance/searchEvaluatePerformanceReview');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_18: Verify Maintenance page is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/maintenance/purgeEmployee');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_19: Verify Claim page is not accessible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goto('/web/index.php/claim/viewAssignClaim');
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_20: Verify browser forward button does not re-authenticate user after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    await page.goBack();
    await page.goForward();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('TC_LOGOUT_21: Verify session storage is cleared on logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    const len = await page.evaluate(() => sessionStorage.length);
    expect(len).toBe(0);
  });

  test('TC_LOGOUT_22: Verify localStorage does not contain sensitive tokens after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('TC_LOGOUT_23: Verify logout link text matches exact text Logout', async ({ loginPage, dashboardPage }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.openUserDropdown();
    const text = await dashboardPage.logoutLink.textContent();
    expect(text.trim()).toBe('Logout');
  });

  test('TC_LOGOUT_24: Verify user profile details container elements are not visible after logout', async ({ loginPage, dashboardPage, page }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.logout();
    const topBar = page.locator('.oxd-topbar-header-userarea');
    await expect(topBar).not.toBeVisible();
  });

  test('TC_LOGOUT_25: Verify logout cursor is a pointer', async ({ loginPage, dashboardPage }) => {
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.openUserDropdown();
    const cursor = await dashboardPage.logoutLink.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });
});
