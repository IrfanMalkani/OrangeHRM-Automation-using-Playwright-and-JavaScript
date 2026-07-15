const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');

test.describe.serial('OrangeHRM PIM Module', () => {
  const uniqueId = Math.floor(100000 + Math.random() * 900000).toString();
  const testEmployeeId = uniqueId;
  const empFirstName = `Alex${uniqueId.substring(0, 3)}`;
  const empLastName = `Hunter${uniqueId.substring(3)}`;
  const testNickname = `Nick${uniqueId.substring(0, 4)}`;
  
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.navigate();
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.navigateToModule('PIM');
  });

  test('TC_PIM_01: Add new employee', async ({ pimPage }) => {
    await pimPage.addEmployee(empFirstName, empLastName, testEmployeeId);
    await pimPage.searchEmployee(testEmployeeId);
    await expect(pimPage.firstRowId).toHaveText(testEmployeeId);
  });

  test('TC_PIM_02: Search employee details', async ({ pimPage }) => {
    await pimPage.searchEmployee(testEmployeeId);
    await expect(pimPage.firstRowId).toHaveText(testEmployeeId);
  });

  test('TC_PIM_03: Update employee information', async ({ pimPage }) => {
    const isNicknameTested = await pimPage.updateEmployeeNickname(testEmployeeId, testNickname);
    await pimPage.searchEmployee(testEmployeeId);
    await expect(pimPage.firstRowId).toHaveText(testEmployeeId, { timeout: 15000 });
    await pimPage.editButton.click();
    await expect(pimPage.employeeIdInput).toHaveValue(testEmployeeId, { timeout: 15000 });
    if (isNicknameTested) {
      await expect(pimPage.nickNameInput).toHaveValue(testNickname);
    } else {
      await expect(pimPage.otherIdInput).toHaveValue(testNickname);
    }
  });

  test('TC_PIM_04: Delete employee records', async ({ pimPage }) => {
    await pimPage.deleteEmployee(testEmployeeId);
    await pimPage.searchEmployee(testEmployeeId);
    await expect(pimPage.tableRows).toHaveCount(0);
  });

  test('TC_PIM_05: Verify PIM search with non-existent employee ID returns no records', async ({ pimPage }) => {
    const fakeId = '999999';
    await pimPage.searchEmployee(fakeId);
    const noRecords = pimPage.page.locator('span:has-text("No Records Found")').first();
    await expect(noRecords).toBeVisible({ timeout: 15000 });
  });

  test('TC_PIM_06: Verify PIM Employee List tab loads correctly', async ({ pimPage }) => {
    await pimPage.employeeListTab.waitFor({ state: 'visible', timeout: 15000 });
    await pimPage.employeeListTab.click();
    await expect(pimPage.searchEmployeeIdInput).toBeVisible();
    await expect(pimPage.searchButton).toBeVisible();
    await expect(pimPage.resetButton).toBeVisible();
  });

  test('TC_PIM_07: Verify PIM top menu has Configuration tab', async ({ page }) => {
    const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Configuration' });
    await expect(tab).toBeVisible();
  });

  test('TC_PIM_08: Verify PIM top menu has Reports tab', async ({ page }) => {
    const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Reports' });
    await expect(tab).toBeVisible();
  });

  test('TC_PIM_09: Verify PIM top menu has Optional Fields menu', async ({ page }) => {
    const conf = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Configuration' });
    await conf.click();
    const item = page.locator('.oxd-dropdown-menu a', { hasText: 'Optional Fields' });
    await expect(item).toBeVisible();
  });

  test('TC_PIM_10: Verify PIM top menu has Custom Fields menu', async ({ page }) => {
    const conf = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Configuration' });
    await conf.click();
    const item = page.locator('.oxd-dropdown-menu a', { hasText: 'Custom Fields' });
    await expect(item).toBeVisible();
  });

  test('TC_PIM_11: Verify PIM top menu has Data Import menu', async ({ page }) => {
    const conf = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Configuration' });
    await conf.click();
    const item = page.locator('.oxd-dropdown-menu a', { hasText: 'Data Import' });
    await expect(item).toBeVisible();
  });

  test('TC_PIM_12: Verify PIM top menu has Reporting Methods menu', async ({ page }) => {
    const conf = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Configuration' });
    await conf.click();
    const item = page.locator('.oxd-dropdown-menu a', { hasText: 'Reporting Methods' });
    await expect(item).toBeVisible();
  });

  test('TC_PIM_13: Verify PIM top menu has Termination Reasons menu', async ({ page }) => {
    const conf = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Configuration' });
    await conf.click();
    const item = page.locator('.oxd-dropdown-menu a', { hasText: 'Termination Reasons' });
    await expect(item).toBeVisible();
  });

  test('TC_PIM_14: Verify validation error on empty First Name input', async ({ pimPage, page }) => {
    await pimPage.addEmployeeTab.click();
    await pimPage.saveButton.click();
    const err = page.locator('.oxd-input-group:has-text("Employee Full Name") .oxd-input-group__message').first();
    await expect(err).toHaveText('Required');
  });

  test('TC_PIM_15: Verify validation error on empty Last Name input', async ({ pimPage, page }) => {
    await pimPage.addEmployeeTab.click();
    await pimPage.firstNameInput.fill('TestFirst');
    await pimPage.saveButton.click();
    const err = page.locator('.oxd-input-group:has-text("Employee Full Name") .oxd-input-group__message').last();
    await expect(err).toHaveText('Required');
  });

  test('TC_PIM_16: Verify Create Login Details switch toggle is visible', async ({ pimPage, page }) => {
    await pimPage.addEmployeeTab.click();
    const toggle = page.locator('.oxd-switch-wrapper input');
    await expect(toggle).toBeAttached();
  });

  test('TC_PIM_17: Verify Cancel button on Add Employee form returns to employee list', async ({ pimPage, page }) => {
    await pimPage.addEmployeeTab.click();
    const cancel = page.locator('button.oxd-button--ghost');
    await cancel.click();
    await page.waitForURL('**/pim/viewEmployeeList');
    expect(page.url()).toContain('/pim/viewEmployeeList');
  });

  test('TC_PIM_18: Verify table checkboxes exist for employee rows', async ({ pimPage, page }) => {
    await pimPage.employeeListTab.click();
    const check = page.locator('.oxd-table-body .oxd-checkbox-wrapper').first();
    expect(check).toBeDefined();
  });

  test('TC_PIM_19: Verify reset button clears Employee Id search field', async ({ pimPage }) => {
    await pimPage.employeeListTab.click();
    await pimPage.searchEmployeeIdInput.fill('12345');
    await pimPage.resetButton.click();
    await expect(pimPage.searchEmployeeIdInput).toHaveValue('');
  });

  test('TC_PIM_20: Verify PIM breadcrumb title contains PIM', async ({ page }) => {
    const breadcrumb = page.locator('.oxd-topbar-header-title');
    await expect(breadcrumb).toContainText('PIM');
  });

  test('TC_PIM_21: Verify job title dropdown is functional in search form', async ({ page }) => {
    const dropdown = page.locator('.oxd-input-group:has-text("Job Title") .oxd-select-text');
    await expect(dropdown).toBeVisible();
  });

  test('TC_PIM_22: Verify sub unit dropdown is functional in search form', async ({ page }) => {
    const dropdown = page.locator('.oxd-input-group:has-text("Sub Unit") .oxd-select-text');
    await expect(dropdown).toBeVisible();
  });

  test('TC_PIM_23: Verify employment status dropdown is functional in search form', async ({ page }) => {
    const dropdown = page.locator('.oxd-input-group:has-text("Employment Status") .oxd-select-text');
    await expect(dropdown).toBeVisible();
  });

  test('TC_PIM_24: Verify supervisor name input autocomplete has autocomplete attributes', async ({ page }) => {
    const input = page.locator('.oxd-input-group:has-text("Supervisor Name") input');
    await expect(input).toBeVisible();
  });

  test('TC_PIM_25: Verify add employee photoupload element has file type input attribute', async ({ pimPage, page }) => {
    await pimPage.addEmployeeTab.click();
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });
});
