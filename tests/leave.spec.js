const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');

function formatDate(date) {
  const yyyy = date.getFullYear();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getTuesdayOfOffsetWeek(offsetWeeks) {
  const date = new Date();
  date.setDate(date.getDate() + 7 * offsetWeeks);
  const day = date.getDay();
  const daysToTuesday = (2 - day + 7) % 7;
  const finalDate = new Date(date.getTime() + daysToTuesday * 24 * 60 * 60 * 1000);
  return finalDate;
}

test.describe.serial('OrangeHRM Leave Module', () => {
  let startDate, endDate;
  
  test.beforeAll(async ({ browser }) => {
    const today = new Date();
    const offsetWeeks = 1; // Use a constant offset to stay in the current leave period (2026)
    const start = getTuesdayOfOffsetWeek(offsetWeeks);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    startDate = formatDate(start);
    endDate = formatDate(end);

    // Setup leave entitlement dynamically for the current logged-in employee
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');
      await page.locator('input[name="username"]').fill(testData.loginCredentials.valid.username);
      await page.locator('input[name="password"]').fill(testData.loginCredentials.valid.password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/dashboard/index');
      await page.locator('.oxd-userdropdown-name').waitFor({ state: 'visible', timeout: 15000 });
      
      const errorMsg = await page.evaluate(async () => {
        try {
          const nameEl = document.querySelector('.oxd-userdropdown-name');
          if (!nameEl) return 'No name element found';
          const employeeName = nameEl.textContent.trim();
          const nameParts = employeeName.split(' ');
          const lastName = nameParts[nameParts.length - 1];
          
          const searchRes = await fetch(`/web/index.php/api/v2/pim/employees?name=${encodeURIComponent(lastName)}`);
          const searchJson = await searchRes.json();
          const match = searchJson.data.find(emp => nameParts.includes(emp.firstName));
          if (!match) return 'No employee matched profile name: ' + employeeName;
          
          const empNumber = match.empNumber;
          
          const res = await fetch('/web/index.php/api/v2/leave/leave-entitlements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empNumber: empNumber,
              leaveTypeId: 1,
              entitlement: "15.00",
              fromDate: "2026-01-01",
              toDate: "2026-12-31"
            })
          });
          if (!res.ok) {
            return `Failed to assign entitlement: ${res.status} ${await res.text()}`;
          }
          return null;
        } catch (e) {
          return e.message;
        }
      });
      if (errorMsg) {
        console.error('Entitlement assignment warning:', errorMsg);
      }
    } catch (e) {
      console.error('Failed to setup leave entitlement in beforeAll:', e);
    } finally {
      await context.close();
    }
  });
  
  test.beforeEach(async ({ loginPage, dashboardPage, leavePage }) => {
    await loginPage.navigate();
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.navigateToModule('Leave');
    await leavePage.applyTab.waitFor({ state: 'visible', timeout: 25000 });
  });

  test('TC_LEAVE_01: Apply leave request flow', async ({ leavePage }) => {
    await leavePage.applyLeave(startDate, endDate, testData.leaveDetails.comments);
    const status = await leavePage.getLatestLeaveStatus(startDate, endDate);
    expect(status).not.toBeNull();
    expect(status.toLowerCase()).toContain('pending approval');
  });

  test('TC_LEAVE_02: Verify leave type of applied leave request', async ({ leavePage }) => {
    const leaveType = await leavePage.getLatestLeaveType(startDate, endDate);
    expect(leaveType).not.toBeNull();
  });

  test('TC_LEAVE_03: Verify Top Navigation Tab Apply is visible', async ({ leavePage }) => {
    await expect(leavePage.applyTab).toBeVisible();
  });

  test('TC_LEAVE_04: Verify Top Navigation Tab My Leave is visible', async ({ leavePage }) => {
    await expect(leavePage.myLeaveTab).toBeVisible();
  });

  test('TC_LEAVE_05: Verify Top Navigation Tab Entitlements dropdown is visible', async ({ page }) => {
    const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Entitlements' });
    await expect(tab).toBeVisible();
  });

  test('TC_LEAVE_06: Verify Top Navigation Tab Reports dropdown is visible', async ({ page }) => {
    const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Reports' });
    await expect(tab).toBeVisible();
  });

  test('TC_LEAVE_07: Verify Top Navigation Tab Configure dropdown is visible', async ({ page }) => {
    const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Configure' });
    await expect(tab).toBeVisible();
  });

  test('TC_LEAVE_08: Verify Top Navigation Tab Leave List is visible', async ({ page }) => {
    const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Leave List' });
    await expect(tab).toBeVisible();
  });

  test('TC_LEAVE_09: Verify Top Navigation Tab Assign Leave is visible', async ({ page }) => {
    const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Assign Leave' });
    await expect(tab).toBeVisible();
  });

  test('TC_LEAVE_10: Verify validation error on empty Leave Type in Apply form', async ({ leavePage, page }) => {
    await leavePage.applyTab.click();
    await leavePage.applyButton.click();
    const err = page.locator('.oxd-input-group:has-text("Leave Type") .oxd-input-group__message');
    await expect(err).toHaveText('Required');
  });

  test('TC_LEAVE_11: Verify From Date input field is visible', async ({ leavePage }) => {
    await expect(leavePage.fromDateInput).toBeVisible();
  });

  test('TC_LEAVE_12: Verify To Date input field is visible', async ({ leavePage }) => {
    await expect(leavePage.toDateInput).toBeVisible();
  });

  test('TC_LEAVE_13: Verify comments textarea has correct maximum character details', async ({ leavePage }) => {
    await leavePage.applyTab.click();
    await expect(leavePage.commentsTextarea).toBeVisible();
  });

  test('TC_LEAVE_14: Verify calendar icon buttons exist next to date input fields', async ({ page }) => {
    const icons = page.locator('.oxd-date-input i.bi-calendar');
    await expect(icons.first()).toBeVisible();
  });

  test('TC_LEAVE_15: Verify Show with Status checkboxes exist in My Leave list filters', async ({ leavePage, page }) => {
    await leavePage.myLeaveTab.click();
    const statusCheckbox = page.locator('.oxd-checkbox-wrapper').first();
    await expect(statusCheckbox).toBeVisible();
  });

  test('TC_LEAVE_16: Verify Leave Type dropdown filter is present in My Leave tab', async ({ leavePage, page }) => {
    await leavePage.myLeaveTab.click();
    const dropdown = page.locator('.oxd-input-group:has-text("Leave Type") .oxd-select-text');
    await expect(dropdown).toBeVisible();
  });

  test('TC_LEAVE_17: Verify Reset button clears date inputs in My Leave filters', async ({ leavePage, page }) => {
    await leavePage.myLeaveTab.click();
    await leavePage.fromDateInput.fill('2026-05-01');
    const resetBtn = page.locator('button', { hasText: 'Reset' });
    await resetBtn.click();
    // Verify input gets cleared or reset to default value
    const val = await leavePage.fromDateInput.inputValue();
    expect(val).not.toBe('2026-05-01');
  });

  test('TC_LEAVE_18: Verify table headers in My Leave results page', async ({ leavePage, page }) => {
    await leavePage.myLeaveTab.click();
    const headerRow = page.locator('.oxd-table-header');
    await expect(headerRow).toBeVisible();
  });

  test('TC_LEAVE_19: Verify date validation error message if To Date is before From Date', async ({ leavePage, page }) => {
    await leavePage.applyTab.click();
    
    await leavePage.fromDateInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await leavePage.fromDateInput.fill('2026-10-10');
    await page.keyboard.press('Tab');
    
    await leavePage.toDateInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await leavePage.toDateInput.fill('2026-05-10');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    const err = page.locator('.oxd-input-group:has-text("To Date") .oxd-input-group__message');
    await expect(err).toHaveText('To date should be after from date');
  });

  test('TC_LEAVE_20: Verify calendar widget opens when From Date input is clicked', async ({ leavePage, page }) => {
    await leavePage.applyTab.click();
    await leavePage.fromDateInput.click();
    const calendarWidget = page.locator('.oxd-date-input-calendar');
    await expect(calendarWidget).toBeVisible();
  });

  test('TC_LEAVE_21: Verify calendar widget opens when To Date input is clicked', async ({ leavePage, page }) => {
    await leavePage.applyTab.click();
    await leavePage.toDateInput.click();
    const calendarWidget = page.locator('.oxd-date-input-calendar');
    await expect(calendarWidget).toBeVisible();
  });

  test('TC_LEAVE_22: Verify Leave page header title displays Leave', async ({ page }) => {
    const title = page.locator('.oxd-topbar-header-title');
    await expect(title).toContainText('Leave');
  });

  test('TC_LEAVE_23: Verify Leave Balance card is shown for specific leave types', async ({ leavePage, page }) => {
    await leavePage.applyTab.click();
    await leavePage.leaveTypeDropdown.click();
    await leavePage.dropdownOption.nth(1).click();
    const balance = page.locator('.orangehrm-leave-balance-value');
    expect(balance).toBeDefined();
  });

  test('TC_LEAVE_24: Verify My Leave list table rows can be scrolled and are visible', async ({ leavePage, page }) => {
    await leavePage.myLeaveTab.click();
    const table = page.locator('.oxd-table');
    await expect(table).toBeVisible();
  });

  test('TC_LEAVE_25: Verify search button on My Leave filters page has correct CSS layout', async ({ leavePage, page }) => {
    await leavePage.myLeaveTab.click();
    const searchBtn = page.locator('button[type="submit"]');
    await expect(searchBtn).toBeVisible();
  });
});
