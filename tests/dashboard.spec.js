// ──────────────────────────────────────────────────────────
// dashboard.spec.js – Dashboard Verification E2E tests
// ──────────────────────────────────────────────────────────

const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');

test.describe('OrangeHRM Dashboard Module', () => {

  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.navigate();
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
  });

  test('TC_DASH_01: Verify dashboard page loads after login', async ({ dashboardPage }) => {
    const headerText = await dashboardPage.getHeaderText();
    expect(headerText.trim()).toBe('Dashboard');
  });

  test('TC_DASH_02: Verify dashboard widgets are visible', async ({ dashboardPage }) => {
    const widgetCount = await dashboardPage.getWidgetsCount();
    expect(widgetCount).toBeGreaterThan(0);
    const visible = await dashboardPage.areWidgetsVisible();
    expect(visible).toBe(true);
  });

  test('TC_DASH_03: Verify Time at Work widget is displayed', async ({ dashboardPage }) => {
    await expect(dashboardPage.timeAtWorkWidget).toBeVisible();
  });

  test('TC_DASH_04: Verify My Actions widget is displayed', async ({ dashboardPage }) => {
    await expect(dashboardPage.myActionsWidget).toBeVisible();
  });

  test('TC_DASH_05: Verify Quick Launch widget is displayed', async ({ dashboardPage }) => {
    await expect(dashboardPage.quickLaunchWidget).toBeVisible();
  });

  test('TC_DASH_06: Verify sidebar contains all main navigation items', async ({ dashboardPage }) => {
    const modules = ['Admin', 'PIM', 'Leave', 'Time', 'Recruitment', 'My Info', 'Performance', 'Dashboard', 'Directory', 'Maintenance', 'Claim', 'Buzz'];
    for (const moduleName of modules) {
      await expect(dashboardPage.sidebarLink(moduleName)).toBeVisible();
    }
  });

  test('TC_DASH_07: Verify logged-in user name is displayed in header', async ({ dashboardPage }) => {
    const userName = await dashboardPage.getLoggedInUserName();
    expect(userName.trim().length).toBeGreaterThan(0);
  });

  test('TC_DASH_08: Verify user dropdown shows About, Support, Change Password, Logout', async ({ dashboardPage }) => {
    await dashboardPage.openUserDropdown();
    await expect(dashboardPage.aboutLink).toBeVisible();
    await expect(dashboardPage.supportLink).toBeVisible();
    await expect(dashboardPage.changePasswordLink).toBeVisible();
    await expect(dashboardPage.logoutLink).toBeVisible();
  });

  test('TC_DASH_09: Verify sidebar collapse and expand functionality', async ({ dashboardPage }) => {
    await expect(dashboardPage.sidebar).toBeVisible();
    await dashboardPage.sidebarToggle.click({ force: true });
    await dashboardPage.page.waitForTimeout(500);
    await expect(dashboardPage.sidebar).toHaveClass(/toggled/);
    await dashboardPage.sidebarToggle.click({ force: true });
    await dashboardPage.page.waitForTimeout(500);
    await expect(dashboardPage.sidebar).not.toHaveClass(/toggled/);
  });

  test('TC_DASH_10: Verify Employees on Leave Today widget is displayed', async ({ dashboardPage }) => {
    await expect(dashboardPage.employeesOnLeaveWidget).toBeVisible();
  });

  test('TC_DASH_11: Verify sidebar search filters navigation items', async ({ dashboardPage }) => {
    await dashboardPage.searchModule('Admin');
    await dashboardPage.page.waitForTimeout(500);
    await expect(dashboardPage.sidebarLink('Admin')).toBeVisible();
  });

  test('TC_DASH_12: Verify dashboard URL contains correct path', async ({ dashboardPage }) => {
    expect(dashboardPage.page.url()).toContain('/dashboard/index');
  });

  test('TC_DASH_13: Verify user profile dropdown image has valid attributes', async ({ page }) => {
    const img = page.locator('.oxd-userdropdown-img');
    await expect(img).toBeVisible();
    const src = await img.getAttribute('src');
    expect(src).not.toBeNull();
    expect(src.length).toBeGreaterThan(0);
    const box = await img.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('TC_DASH_14: Verify corporate branding logo is visible in sidebar header', async ({ page }) => {
    const brand = page.locator('.oxd-brand-banner img');
    await expect(brand).toBeVisible();
  });

  test('TC_DASH_15: Verify sidebar search input is functional', async ({ dashboardPage }) => {
    await expect(dashboardPage.searchInput).toBeVisible();
    const placeholder = await dashboardPage.searchInput.getAttribute('placeholder');
    expect(placeholder).toBe('Search');
  });

  test('TC_DASH_16: Verify dashboard widgets have correct card container CSS classes', async ({ page }) => {
    const firstWidget = page.locator('.oxd-sheet.orangehrm-dashboard-widget').first();
    await expect(firstWidget).toHaveClass(/orangehrm-dashboard-widget/);
  });

  test('TC_DASH_17: Verify Assign Leave link in Quick Launch redirects properly', async ({ page }) => {
    const link = page.locator('.orangehrm-quicklaunch-card:has-text("Assign Leave")');
    if (await link.count() > 0) {
      await link.click();
      await page.waitForURL('**/leave/assignLeave');
      expect(page.url()).toContain('/leave/assignLeave');
    }
  });

  test('TC_DASH_18: Verify Leave List link in Quick Launch redirects properly', async ({ page }) => {
    const link = page.locator('.orangehrm-quicklaunch-card:has-text("Leave List")');
    if (await link.count() > 0) {
      await link.click();
      await page.waitForURL('**/leave/viewLeaveList');
      expect(page.url()).toContain('/leave/viewLeaveList');
    }
  });

  test('TC_DASH_19: Verify Timesheets link in Quick Launch redirects properly', async ({ page }) => {
    const link = page.locator('.orangehrm-quicklaunch-card:has-text("Timesheets")');
    if (await link.count() > 0) {
      await link.click();
      await page.waitForURL('**/time/viewEmployeeTimesheet');
      expect(page.url()).toContain('/time/viewEmployeeTimesheet');
    }
  });

  test('TC_DASH_20: Verify Apply Leave link in Quick Launch redirects properly', async ({ page }) => {
    const link = page.locator('.orangehrm-quicklaunch-card:has-text("Apply Leave")');
    if (await link.count() > 0) {
      await link.click();
      await page.waitForURL('**/leave/applyLeave');
      expect(page.url()).toContain('/leave/applyLeave');
    }
  });

  test('TC_DASH_21: Verify My Leave link in Quick Launch redirects properly', async ({ page }) => {
    const link = page.locator('.orangehrm-quicklaunch-card:has-text("My Leave")');
    if (await link.count() > 0) {
      await link.click();
      await page.waitForURL('**/leave/viewMyLeaveList');
      expect(page.url()).toContain('/leave/viewMyLeaveList');
    }
  });

  test('TC_DASH_22: Verify My Timesheet link in Quick Launch redirects properly', async ({ page }) => {
    const link = page.locator('.orangehrm-quicklaunch-card:has-text("My Timesheet")');
    if (await link.count() > 0) {
      await link.click();
      await page.waitForURL('**/time/viewMyTimesheet');
      expect(page.url()).toContain('/time/viewMyTimesheet');
    }
  });

  test('TC_DASH_23: Verify Support option opens support page', async ({ dashboardPage, page }) => {
    await dashboardPage.openUserDropdown();
    await dashboardPage.supportLink.click();
    await page.waitForURL('**/help/support');
    expect(page.url()).toContain('/help/support');
  });

  test('TC_DASH_24: Verify About link displays modal pop-up', async ({ dashboardPage, page }) => {
    await dashboardPage.openUserDropdown();
    await dashboardPage.aboutLink.click();
    const modal = page.locator('.oxd-dialog-sheet');
    await expect(modal).toBeVisible();
    const closeBtn = modal.locator('button.oxd-dialog-close-button');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('TC_DASH_25: Verify dashboard topbar has header with correct tags', async ({ page }) => {
    const title = page.locator('.oxd-topbar-header-title');
    await expect(title).toBeVisible();
  });
});
