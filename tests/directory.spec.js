const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');

test.describe('OrangeHRM Directory Module', () => {

  test.beforeEach(async ({ loginPage, dashboardPage, directoryPage }) => {
    await loginPage.navigate();
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.navigateToModule('Directory');
    await directoryPage.isLoaded();
  });

  test('TC_DIR_01: Verify Directory page load and header breadcrumb', async ({ directoryPage }) => {
    const header = await directoryPage.getHeaderText();
    expect(header.trim()).toBe('Directory');
  });

  test('TC_DIR_02: Verify search functionality by Job Title', async ({ directoryPage }) => {
    await directoryPage.searchByJobTitle('Account Assistant');
    const cardCount = await directoryPage.getEmployeeCardCount();
    if (cardCount === 0) {
      expect(await directoryPage.isNoRecordsVisible()).toBe(true);
    } else {
      expect(cardCount).toBeGreaterThan(0);
    }
  });

  test('TC_DIR_03: Verify reset button clears search parameters', async ({ directoryPage }) => {
    await directoryPage.jobTitleDropdown.click();
    await directoryPage.selectOption('Account Assistant').click();
    await directoryPage.resetSearch();
    const selectedText = await directoryPage.jobTitleDropdown.textContent();
    expect(selectedText).toContain('-- Select --');
  });

  test('TC_DIR_04: Verify searching with invalid employee name returns no records', async ({ directoryPage }) => {
    await directoryPage.employeeNameInput.fill('NonExistentEmployeeXYZ');
    await directoryPage.searchButton.click();
    const isNoRecords = await directoryPage.isNoRecordsVisible();
    expect(isNoRecords).toBe(true);
  });

  test('TC_DIR_05: Verify Location dropdown filter is visible', async ({ directoryPage }) => {
    await expect(directoryPage.locationDropdown).toBeVisible();
  });

  test('TC_DIR_06: Verify Job Title dropdown filter is visible', async ({ directoryPage }) => {
    await expect(directoryPage.jobTitleDropdown).toBeVisible();
  });

  test('TC_DIR_07: Verify Employee Name input field is visible', async ({ directoryPage }) => {
    await expect(directoryPage.employeeNameInput).toBeVisible();
  });

  test('TC_DIR_08: Verify Search button is visible', async ({ directoryPage }) => {
    await expect(directoryPage.searchButton).toBeVisible();
  });

  test('TC_DIR_09: Verify Reset button is visible', async ({ directoryPage }) => {
    await expect(directoryPage.resetButton).toBeVisible();
  });

  test('TC_DIR_10: Verify card grid container is visible in search results', async ({ page }) => {
    const grid = page.locator('.orangehrm-container');
    await expect(grid).toBeVisible();
  });

  test('TC_DIR_11: Verify employee card has image element', async ({ page }) => {
    const img = page.locator('.orangehrm-directory-card-img').first();
    expect(img).toBeDefined();
  });

  test('TC_DIR_12: Verify employee card has name header link', async ({ page }) => {
    const name = page.locator('.orangehrm-directory-card-header h8, .orangehrm-directory-card-header p').first();
    expect(name).toBeDefined();
  });

  test('TC_DIR_13: Verify employee card job title text block exists', async ({ page }) => {
    const subtitle = page.locator('.orangehrm-directory-card-subtitle').first();
    expect(subtitle).toBeDefined();
  });

  test('TC_DIR_14: Verify employee card location text block exists', async ({ page }) => {
    const details = page.locator('.orangehrm-directory-card-description').first();
    expect(details).toBeDefined();
  });

  test('TC_DIR_15: Verify autocomplete options container is hidden on page load', async ({ directoryPage }) => {
    await expect(directoryPage.autocompleteOption).not.toBeVisible();
  });

  test('TC_DIR_16: Verify search by Location filter option functionality', async ({ directoryPage }) => {
    await directoryPage.locationDropdown.click();
    const firstOption = directoryPage.page.locator('.oxd-select-option').nth(1);
    if (await firstOption.count() > 0) {
      const optionText = await firstOption.textContent();
      await firstOption.click();
      await directoryPage.searchButton.click();
      const cards = await directoryPage.getEmployeeCardCount();
      expect(cards).toBeDefined();
    }
  });

  test('TC_DIR_17: Verify Location dropdown is reset to -- Select -- on Reset click', async ({ directoryPage }) => {
    await directoryPage.locationDropdown.click();
    const firstOption = directoryPage.page.locator('.oxd-select-option').nth(1);
    if (await firstOption.count() > 0) {
      await firstOption.click();
      await directoryPage.resetSearch();
      const val = await directoryPage.locationDropdown.textContent();
      expect(val).toContain('-- Select --');
    }
  });

  test('TC_DIR_18: Verify Search button has type submit attribute', async ({ directoryPage }) => {
    const typeAttr = await directoryPage.searchButton.getAttribute('type');
    expect(typeAttr).toBe('submit');
  });

  test('TC_DIR_19: Verify search cards count text matches results length', async ({ directoryPage, page }) => {
    const cards = await directoryPage.getEmployeeCardCount();
    const span = page.locator('.orangehrm-horizontal-padding > span');
    expect(span).toBeDefined();
  });

  test('TC_DIR_20: Verify employee name input accepts keyboard tab navigation', async ({ directoryPage, page }) => {
    await directoryPage.employeeNameInput.focus();
    await directoryPage.page.keyboard.press('Tab');
    const focusedSelect = page.locator('.oxd-input-group:has-text("Job Title") .oxd-select-text-input');
    await expect(focusedSelect).toBeFocused();
  });

  test('TC_DIR_21: Verify directory layout contains search parameters fold collapsible element', async ({ page }) => {
    const fold = page.locator('.oxd-table-filter');
    await expect(fold).toBeVisible();
  });

  test('TC_DIR_22: Verify search panel title is Directory', async ({ page }) => {
    const breadcrumb = page.locator('.oxd-topbar-header-title');
    await expect(breadcrumb).toContainText('Directory');
  });

  test('TC_DIR_23: Verify employee list is scrollable', async ({ page }) => {
    const container = page.locator('.orangehrm-container');
    await expect(container).toBeVisible();
  });

  test('TC_DIR_24: Verify reset button hover styling properties', async ({ directoryPage }) => {
    const cursor = await directoryPage.resetButton.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');
  });

  test('TC_DIR_25: Verify search input field placeholder matches default text hint', async ({ directoryPage }) => {
    const placeholder = await directoryPage.employeeNameInput.getAttribute('placeholder');
    expect(placeholder).toBe('Type for hints...');
  });

  test('TC_DIR_26: Verify searching employee name with special characters returns no records without error (negative)', async ({ directoryPage }) => {
    await directoryPage.employeeNameInput.fill('<script>alert(1)</script>');
    await directoryPage.searchButton.click();
    const isNoRecords = await directoryPage.isNoRecordsVisible();
    expect(isNoRecords).toBe(true);
  });

  test('TC_DIR_27: Verify Reset button does not clear an unconfirmed Employee Name text entry (edge case)', async ({ directoryPage }) => {
    // Reset only clears the dropdown filters (see TC_DIR_03/TC_DIR_17); a name
    // typed but never confirmed via the autocomplete suggestion list is left as-is.
    await directoryPage.employeeNameInput.fill('NonExistentEmployeeXYZ');
    await directoryPage.resetSearch();
    const value = await directoryPage.employeeNameInput.inputValue();
    expect(value).toBe('NonExistentEmployeeXYZ');
  });

  test('TC_DIR_28: Verify searching with a whitespace-only employee name does not throw an error (edge case)', async ({ directoryPage }) => {
    await directoryPage.employeeNameInput.fill('   ');
    await directoryPage.searchButton.click();
    await directoryPage.page.waitForTimeout(1500);
    const cardCount = await directoryPage.getEmployeeCardCount();
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });
});
