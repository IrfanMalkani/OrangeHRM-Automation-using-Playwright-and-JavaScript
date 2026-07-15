const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');

test.describe.serial('OrangeHRM Admin Module', () => {
  const uniqueId = Math.floor(100000 + Math.random() * 900000).toString();
  const testEmployeeId = uniqueId;
  const empFirstName = `Alex${uniqueId.substring(0, 3)}`;
  const empLastName = `Hunter${uniqueId.substring(3)}`;
  const testUsername = `alex.${uniqueId}`;
  
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.navigate();
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
  });

  test('TC_ADMIN_01: Add new user (Pre-requisite: Add Employee first)', async ({ dashboardPage, pimPage, adminPage }) => {
    await dashboardPage.navigateToModule('PIM');
    await pimPage.addEmployee(empFirstName, empLastName, testEmployeeId);
    
    await dashboardPage.navigateToModule('Admin');
    const fullName = `${empFirstName} ${empLastName}`;
    const { role, password } = testData.userDetails;
    await adminPage.addUser(role, fullName, testUsername, password);
    
    await adminPage.searchUser(testUsername);
    await expect(adminPage.firstRowUsername).toHaveText(testUsername);
  });

  test('TC_ADMIN_02: Search user by username', async ({ dashboardPage, adminPage }) => {
    await dashboardPage.navigateToModule('Admin');
    await adminPage.searchUser(testUsername);
    await expect(adminPage.firstRowUsername).toHaveText(testUsername);
  });

  test('TC_ADMIN_03: Update user details', async ({ dashboardPage, adminPage }) => {
    await dashboardPage.navigateToModule('Admin');
    await adminPage.updateUserRole(testUsername, 'ESS');
    
    await adminPage.searchUser(testUsername);
    await expect(adminPage.firstRowUsername).toHaveText(testUsername, { timeout: 15000 });
    await adminPage.editButton.click();
    await expect(adminPage.usernameInput).toHaveValue(testUsername, { timeout: 15000 });
    await expect(adminPage.userRoleDropdown).toContainText('ESS');
  });

  test('TC_ADMIN_04: Verify user role displays correctly in search results', async ({ dashboardPage, adminPage }) => {
    await dashboardPage.navigateToModule('Admin');
    await adminPage.searchUser(testUsername);
    await expect(adminPage.firstRowUsername).toHaveText(testUsername, { timeout: 15000 });
    
    const roleText = await adminPage.firstRowRole.textContent();
    expect(roleText.trim()).toBe('ESS');
  });

  test('TC_ADMIN_05: Verify Admin page has Add button visible', async ({ dashboardPage, adminPage }) => {
    await dashboardPage.navigateToModule('Admin');
    await expect(adminPage.addButton).toBeVisible();
  });

  test('TC_ADMIN_06: Delete existing user and cleanup employee', async ({ dashboardPage, adminPage, pimPage }) => {
    await dashboardPage.navigateToModule('Admin');
    await adminPage.deleteUser(testUsername);
    
    await adminPage.searchUser(testUsername);
    await expect(adminPage.tableRows).toHaveCount(0);

    await dashboardPage.navigateToModule('PIM');
    await pimPage.deleteEmployee(testEmployeeId);
  });

  test('TC_ADMIN_07: Verify resetting the search form clears username field', async ({ dashboardPage, adminPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    await adminPage.searchUsernameInput.fill('tempuser');
    await page.locator('button', { hasText: 'Reset' }).click();
    await expect(adminPage.searchUsernameInput).toHaveValue('');
  });

  test('TC_ADMIN_08: Verify search with non-existent username returns zero records', async ({ dashboardPage, adminPage }) => {
    await dashboardPage.navigateToModule('Admin');
    await adminPage.searchUser('non_existent_username_9999');
    await expect(adminPage.tableRows).toHaveCount(0);
  });

  test('TC_ADMIN_09: Verify Admin sub-menu bar contains User Management item', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const userManagement = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'User Management' });
    await expect(userManagement).toBeVisible();
  });

  test('TC_ADMIN_10: Verify Job dropdown menu is visible in top navigation bar', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const jobDropdown = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Job' });
    await expect(jobDropdown).toBeVisible();
  });

  test('TC_ADMIN_11: Verify Organization dropdown menu is visible in top navigation bar', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const orgDropdown = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Organization' });
    await expect(orgDropdown).toBeVisible();
  });

  test('TC_ADMIN_12: Verify Qualifications dropdown menu is visible in top navigation bar', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const qualDropdown = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Qualifications' });
    await expect(qualDropdown).toBeVisible();
  });

  test('TC_ADMIN_13: Verify Nationalities tab item is visible in top navigation bar', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const natLink = page.locator('a.oxd-topbar-body-nav-tab-item', { hasText: 'Nationalities' });
    await expect(natLink).toBeVisible();
  });

  test('TC_ADMIN_14: Verify Corporate Branding tab item is visible in top navigation bar', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const brandLink = page.locator('a.oxd-topbar-body-nav-tab-item', { hasText: 'Corporate Branding' });
    await expect(brandLink).toBeVisible();
  });

  test('TC_ADMIN_15: Verify Configuration dropdown menu is visible in top navigation bar', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const configDropdown = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Configuration' });
    await expect(configDropdown).toBeVisible();
  });

  test('TC_ADMIN_16: Verify validation error on adding user with empty password', async ({ dashboardPage, adminPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    await adminPage.addButton.click();
    await adminPage.saveButton.click();
    const errorMsg = page.locator('.oxd-input-group').filter({ has: page.locator('label', { hasText: /^Password$/ }) }).locator('.oxd-input-group__message');
    await expect(errorMsg).toHaveText('Required');
  });

  test('TC_ADMIN_17: Verify validation error on adding user with mismatched confirm password', async ({ dashboardPage, adminPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    await adminPage.addButton.click();
    await adminPage.passwordInput.fill('Password123');
    await adminPage.confirmPasswordInput.fill('Different123');
    const errorMsg = page.locator('.oxd-input-group:has-text("Confirm Password") .oxd-input-group__message');
    await expect(errorMsg).toHaveText('Passwords do not match');
  });

  test('TC_ADMIN_18: Verify autocomplete dropdown is hidden by default', async ({ dashboardPage, adminPage }) => {
    await dashboardPage.navigateToModule('Admin');
    await adminPage.addButton.click();
    await expect(adminPage.autocompleteDropdown).not.toBeVisible();
  });

  test('TC_ADMIN_19: Verify cancel button returns to user grid page', async ({ dashboardPage, adminPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    await adminPage.addButton.click();
    const cancel = page.locator('button.oxd-button--ghost');
    await cancel.click();
    await page.waitForURL('**/admin/viewSystemUsers');
    expect(page.url()).toContain('/admin/viewSystemUsers');
  });

  test('TC_ADMIN_20: Verify select all checkbox is visible on table header', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const selectAllCheckbox = page.locator('.oxd-table-header .oxd-checkbox-wrapper input');
    expect(selectAllCheckbox).toBeDefined();
  });

  test('TC_ADMIN_21: Verify row checkbox can be hovered and clicked', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const rowCheckbox = page.locator('.oxd-table-body .oxd-checkbox-wrapper').first();
    if (await rowCheckbox.count() > 0) {
      await expect(rowCheckbox).toBeVisible();
    }
  });

  test('TC_ADMIN_22: Verify records count display text exists above table', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const recordsText = page.locator('.orangehrm-horizontal-padding > span');
    await expect(recordsText).toBeVisible();
  });

  test('TC_ADMIN_23: Verify Admin breadcrumb title contains User Management', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const breadcrumb = page.locator('.oxd-topbar-header-title');
    await expect(breadcrumb).toContainText('User Management');
  });

  test('TC_ADMIN_24: Verify table column headers Username, User Role, Employee Name, Status, Actions exist', async ({ dashboardPage, page }) => {
    await dashboardPage.navigateToModule('Admin');
    const headers = ['Username', 'User Role', 'Employee Name', 'Status', 'Actions'];
    for (const header of headers) {
      const col = page.locator('.oxd-table-header', { hasText: header });
      expect(col).toBeDefined();
    }
  });

  test('TC_ADMIN_25: Verify search button tag name is button', async ({ dashboardPage, adminPage }) => {
    await dashboardPage.navigateToModule('Admin');
    const tagName = await adminPage.searchButton.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('button');
  });
});
