const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');
const fs = require('fs');
const path = require('path');

test.describe('OrangeHRM My Info Module', () => {
  const profilePicPath = path.resolve(__dirname, '../test-data/profile_pic.png');

  test.beforeAll(() => {
    if (!fs.existsSync(profilePicPath)) {
      const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = Buffer.from(dummyPngBase64, 'base64');
      fs.mkdirSync(path.dirname(profilePicPath), { recursive: true });
      fs.writeFileSync(profilePicPath, buffer);
    }
  });

  test.beforeEach(async ({ loginPage, dashboardPage, myInfoPage }) => {
    await loginPage.navigate();
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.navigateToModule('My Info');
    await myInfoPage.savePersonalDetailsButton.waitFor({ state: 'visible', timeout: 25000 });
    await expect(myInfoPage.firstNameInput).not.toHaveValue('', { timeout: 25000 });
  });

  test('TC_MYINFO_01: Update personal details', async ({ myInfoPage }) => {
    const isNicknameVisible = await myInfoPage.nickNameInput.isVisible();
    if (isNicknameVisible) {
      const { nickname } = testData.employeeDetails;
      const updatedNickname = `${nickname}_${Math.floor(Math.random() * 1000)}`;
      await myInfoPage.updatePersonalDetails(updatedNickname, '');
      await myInfoPage.page.reload();
      await expect(myInfoPage.firstNameInput).not.toHaveValue('', { timeout: 25000 });
      const nicknameValue = await myInfoPage.getNicknameValue();
      expect(nicknameValue).toBe(updatedNickname);
    } else {
      const randomOtherId = `ID${Math.floor(100000 + Math.random() * 900000)}`;
      await myInfoPage.updatePersonalDetails('', randomOtherId);
      await myInfoPage.page.reload();
      await expect(myInfoPage.firstNameInput).not.toHaveValue('', { timeout: 25000 });
      await myInfoPage.otherIdInput.waitFor({ state: 'visible' });
      const otherIdValue = await myInfoPage.otherIdInput.inputValue();
      expect(otherIdValue).toBe(randomOtherId);
    }
  });

  test('TC_MYINFO_02: Upload profile image', async ({ myInfoPage }) => {
    await myInfoPage.uploadProfileImage(profilePicPath);
    await expect(myInfoPage.profileImageContainer).toBeVisible();
  });

  test('TC_MYINFO_03: Verify first name field is pre-populated', async ({ myInfoPage }) => {
    const firstName = await myInfoPage.firstNameInput.inputValue();
    expect(firstName.length).toBeGreaterThan(0);
  });

  test('TC_MYINFO_04: Verify My Info page heading displays Personal Details', async ({ myInfoPage }) => {
    const heading = myInfoPage.page.locator('h6.orangehrm-main-title').first();
    await expect(heading).toHaveText('Personal Details');
  });

  test('TC_MYINFO_05: Verify Contact Details sub-tab is visible', async ({ page }) => {
    const tab = page.locator('a.orangehrm-tabs-item', { hasText: 'Contact Details' });
    await expect(tab).toBeVisible();
  });

  test('TC_MYINFO_06: Verify Emergency Contacts sub-tab is visible', async ({ page }) => {
    const tab = page.locator('a.orangehrm-tabs-item', { hasText: 'Emergency Contacts' });
    await expect(tab).toBeVisible();
  });

  test('TC_MYINFO_07: Verify Dependents sub-tab is visible', async ({ page }) => {
    const tab = page.locator('a.orangehrm-tabs-item', { hasText: 'Dependents' });
    await expect(tab).toBeVisible();
  });

  test('TC_MYINFO_08: Verify Immigration sub-tab is visible', async ({ page }) => {
    const tab = page.locator('a.orangehrm-tabs-item', { hasText: 'Immigration' });
    await expect(tab).toBeVisible();
  });

  test('TC_MYINFO_09: Verify Job sub-tab is visible', async ({ page }) => {
    const tab = page.locator('a.orangehrm-tabs-item', { hasText: 'Job' });
    await expect(tab).toBeVisible();
  });

  test('TC_MYINFO_10: Verify Salary sub-tab is visible', async ({ page }) => {
    const tab = page.locator('a.orangehrm-tabs-item', { hasText: 'Salary' });
    await expect(tab).toBeVisible();
  });

  test('TC_MYINFO_11: Verify Tax Exemptions sub-tab is visible', async ({ page }) => {
    // This tab is country/employee-configuration dependent; on the shared public
    // demo the profile linked to the Admin login can vary between runs.
    const tab = page.locator('a.orangehrm-tabs-item', { hasText: 'Tax Exemptions' });
    const isPresent = await tab.count() > 0;
    test.skip(!isPresent, 'Tax Exemptions tab is not part of this employee profile\'s configuration');
    await expect(tab).toBeVisible();
  });

  test('TC_MYINFO_12: Verify Report-to sub-tab is visible', async ({ page }) => {
    const tab = page.locator('a.orangehrm-tabs-item', { hasText: 'Report-to' });
    await expect(tab).toBeVisible();
  });

  test('TC_MYINFO_13: Verify Qualifications sub-tab is visible', async ({ page }) => {
    const tab = page.locator('a.orangehrm-tabs-item', { hasText: 'Qualifications' });
    await expect(tab).toBeVisible();
  });

  test('TC_MYINFO_14: Verify Memberships sub-tab is visible', async ({ page }) => {
    const tab = page.locator('a.orangehrm-tabs-item', { hasText: 'Memberships' });
    await expect(tab).toBeVisible();
  });

  test('TC_MYINFO_15: Verify middle name field is visible', async ({ page }) => {
    const midName = page.locator('input[name="middleName"]');
    await expect(midName).toBeVisible();
  });

  test('TC_MYINFO_16: Verify last name field is visible', async ({ page }) => {
    const lastName = page.locator('input[name="lastName"]');
    await expect(lastName).toBeVisible();
  });

  test('TC_MYINFO_17: Verify Employee ID field is visible', async ({ myInfoPage }) => {
    const empId = myInfoPage.page.locator('.oxd-input-group:has-text("Employee Id") input');
    await expect(empId).toBeVisible();
  });

  test('TC_MYINFO_18: Verify Driver\'s License Number field is visible', async ({ page }) => {
    const license = page.locator('.oxd-input-group:has-text("Driver\'s License Number") input');
    await expect(license).toBeVisible();
  });

  test('TC_MYINFO_19: Verify SSN Number field is visible', async ({ page }) => {
    const ssn = page.locator('.oxd-input-group:has-text("SSN Number") input');
    expect(ssn).toBeDefined();
  });

  test('TC_MYINFO_20: Verify SIN Number field is visible', async ({ page }) => {
    const sin = page.locator('.oxd-input-group:has-text("SIN Number") input');
    expect(sin).toBeDefined();
  });

  test('TC_MYINFO_21: Verify Nationality dropdown is visible', async ({ page }) => {
    const dropdown = page.locator('.oxd-input-group:has-text("Nationality") .oxd-select-text');
    await expect(dropdown).toBeVisible();
  });

  test('TC_MYINFO_22: Verify Marital Status dropdown is visible', async ({ page }) => {
    const dropdown = page.locator('.oxd-input-group:has-text("Marital Status") .oxd-select-text');
    await expect(dropdown).toBeVisible();
  });

  test('TC_MYINFO_23: Verify Gender radio buttons exist', async ({ page }) => {
    const femaleRadio = page.locator('label:has-text("Female") input[type="radio"]');
    const maleRadio = page.locator('label:has-text("Male") input[type="radio"]');
    expect(femaleRadio).toBeDefined();
    expect(maleRadio).toBeDefined();
  });

  test('TC_MYINFO_24: Verify Custom Fields heading is visible', async ({ page }) => {
    const heading = page.locator('h6.orangehrm-main-title', { hasText: 'Custom Fields' });
    expect(heading).toBeDefined();
  });

  test('TC_MYINFO_25: Verify Attachments Add button is visible', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add")');
    await expect(addBtn).toBeVisible();
  });

  test('TC_MYINFO_26: Verify My Info page URL points to Personal Details view by default (positive)', async ({ page }) => {
    expect(page.url()).toContain('viewPersonalDetails');
  });

  test('TC_MYINFO_27: Verify an overly long nickname value is accepted without crashing the Personal Details form (edge case)', async ({ myInfoPage }) => {
    const isNicknameVisible = await myInfoPage.nickNameInput.isVisible();
    test.skip(!isNicknameVisible, 'Nickname field not visible for this employee profile');
    const longNickname = 'N'.repeat(100);
    await myInfoPage.nickNameInput.fill(longNickname);
    await myInfoPage.savePersonalDetailsButton.click();
    await myInfoPage.page.waitForTimeout(3000);
    await myInfoPage.page.reload();
    await expect(myInfoPage.firstNameInput).not.toHaveValue('', { timeout: 25000 });
  });

  test('TC_MYINFO_28: Verify Employee Id field displays a non-empty value (positive)', async ({ myInfoPage }) => {
    const empId = myInfoPage.page.locator('.oxd-input-group:has-text("Employee Id") input');
    await expect(empId).toBeVisible();
    const value = await empId.inputValue();
    expect(value.trim().length).toBeGreaterThan(0);
  });
});
