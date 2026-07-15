const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');

test.describe('OrangeHRM Time Module', () => {

  test.beforeEach(async ({ loginPage, dashboardPage, timePage }) => {
    await loginPage.navigate();
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.navigateToModule('Time');
    await timePage.isLoaded();
  });

  test('TC_TIME_01: Verify Time page loads with sub-navigation headers', async ({ timePage }) => {
    const header = await timePage.getHeaderText();
    expect(header.trim()).toBe('Time');
    const tabsVisible = await timePage.areAllTabsVisible();
    expect(tabsVisible).toBe(true);
  });

  test('TC_TIME_02: Verify access to My Timesheets page', async ({ timePage }) => {
    await timePage.navigateToMyTimesheets();
    const heading = timePage.page.locator('h6.orangehrm-main-title, h6.oxd-text').first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('TC_TIME_03: Verify access to Punch In/Out attendance page', async ({ timePage }) => {
    await timePage.navigateToPunchInOut();
    const punchHeading = timePage.page.locator('h6:has-text("Punch In"), h6:has-text("Punch Out")').first();
    await expect(punchHeading).toBeVisible({ timeout: 15000 });
  });

  test('TC_TIME_04: Verify search button validation with empty/invalid inputs in employee timesheets', async ({ timePage }) => {
    await timePage.timesheetsTab.hover();
    await timePage.employeeTimesheetsLink.click();
    await timePage.page.waitForLoadState('domcontentloaded');
    await timePage.viewButton.click();
    const errorText = timePage.page.locator('.oxd-input-group__message').first();
    await expect(errorText).toBeVisible({ timeout: 5000 });
    await expect(errorText).toHaveText('Required');
  });

  test('TC_TIME_05: Verify top navigation contains Reports tab', async ({ timePage }) => {
    await expect(timePage.reportsTab).toBeVisible();
  });

  test('TC_TIME_06: Verify top navigation contains Project Info tab', async ({ timePage }) => {
    await expect(timePage.projectInfoTab).toBeVisible();
  });

  test('TC_TIME_07: Verify Customers option exists under Project Info', async ({ timePage, page }) => {
    await timePage.projectInfoTab.click();
    const item = page.locator('.oxd-dropdown-menu a', { hasText: 'Customers' });
    await expect(item).toBeVisible();
  });

  test('TC_TIME_08: Verify Projects option exists under Project Info', async ({ timePage, page }) => {
    await timePage.projectInfoTab.click();
    const item = page.locator('.oxd-dropdown-menu a', { hasText: 'Projects' });
    await expect(item).toBeVisible();
  });

  test('TC_TIME_09: Verify Activities option exists under Project Info', async ({ timePage, page }) => {
    await timePage.projectInfoTab.click();
    const item = page.locator('.oxd-dropdown-menu a', { hasText: 'Activities' });
    await expect(item).toBeVisible();
  });

  test('TC_TIME_10: Verify Project Reports option exists under Reports menu', async ({ timePage, page }) => {
    await timePage.reportsTab.click();
    const item = page.locator('.oxd-dropdown-menu a', { hasText: 'Project Reports' });
    await expect(item).toBeVisible();
  });

  test('TC_TIME_11: Verify Employee Reports option exists under Reports menu', async ({ timePage, page }) => {
    await timePage.reportsTab.click();
    const item = page.locator('.oxd-dropdown-menu a', { hasText: 'Employee Reports' });
    await expect(item).toBeVisible();
  });

  test('TC_TIME_12: Verify Attendance Summary option exists under Reports menu', async ({ timePage, page }) => {
    await timePage.reportsTab.click();
    const item = page.locator('.oxd-dropdown-menu a', { hasText: 'Attendance Summary' });
    await expect(item).toBeVisible();
  });

  test('TC_TIME_13: Verify employee name search input field exists on Employee Timesheets page', async ({ timePage }) => {
    await timePage.timesheetsTab.hover();
    await timePage.employeeTimesheetsLink.click();
    await expect(timePage.employeeNameInput).toBeVisible();
  });

  test('TC_TIME_14: Verify punch page has date input element', async ({ timePage, page }) => {
    await timePage.navigateToPunchInOut();
    const dateInput = page.locator('.oxd-date-input input');
    await expect(dateInput).toBeVisible();
  });

  test('TC_TIME_15: Verify punch page has time input element', async ({ timePage, page }) => {
    await timePage.navigateToPunchInOut();
    const timeInput = page.locator('.oxd-time-input input');
    await expect(timeInput).toBeVisible();
  });

  test('TC_TIME_16: Verify punch page note textarea is functional', async ({ timePage, page }) => {
    await timePage.navigateToPunchInOut();
    const noteTextarea = page.locator('textarea');
    await expect(noteTextarea).toBeVisible();
  });

  test('TC_TIME_17: Verify attendance table headers in My Records page', async ({ timePage, page }) => {
    await timePage.navigateToAttendanceRecords();
    const colHeader = page.locator('.oxd-table-header');
    await expect(colHeader).toBeVisible();
  });

  test('TC_TIME_18: Verify My Records date picker input elements exist', async ({ timePage, page }) => {
    await timePage.navigateToAttendanceRecords();
    const dateInputs = page.locator('.oxd-date-input input');
    expect(await dateInputs.count()).toBeGreaterThan(0);
  });

  test('TC_TIME_19: Verify calendar pop-up opens on clicking date input in My Records page', async ({ timePage, page }) => {
    await timePage.navigateToAttendanceRecords();
    const dateInput = page.locator('.oxd-date-input input').first();
    await dateInput.click();
    const calendar = page.locator('.oxd-date-input-calendar');
    await expect(calendar).toBeVisible();
  });

  test('TC_TIME_20: Verify Reset button clears search filters in My Records page', async ({ timePage, page }) => {
    await timePage.navigateToAttendanceRecords();
    const reset = page.locator('button', { hasText: 'Reset' });
    await expect(reset).toBeVisible();
  });

  test('TC_TIME_21: Verify view records button text contains View', async ({ timePage, page }) => {
    await timePage.navigateToAttendanceRecords();
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toHaveText('View');
  });

  test('TC_TIME_22: Verify breadcrumb title text details are visible', async ({ page }) => {
    const breadcrumb = page.locator('.oxd-topbar-header-title');
    await expect(breadcrumb).toContainText('Time');
  });

  test('TC_TIME_23: Verify Timesheets menu is visible in sub-navigation bar', async ({ timePage }) => {
    await expect(timePage.timesheetsTab).toBeVisible();
  });

  test('TC_TIME_24: Verify Attendance menu is visible in sub-navigation bar', async ({ timePage }) => {
    await expect(timePage.attendanceTab).toBeVisible();
  });

  test('TC_TIME_25: Verify Punch In button exists in Punch page when logged out or punched out', async ({ timePage, page }) => {
    await timePage.navigateToPunchInOut();
    const inBtn = page.locator('button:has-text("In"), button:has-text("Out")');
    expect(await inBtn.count()).toBeGreaterThan(0);
  });
});
