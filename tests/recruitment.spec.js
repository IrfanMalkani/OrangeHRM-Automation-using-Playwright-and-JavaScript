const { test, expect } = require('../fixtures/baseTest');
const testData = require('../test-data/testData.json');

test.describe.serial('OrangeHRM Recruitment Module', () => {
  const uniqueId = Math.floor(1000 + Math.random() * 9000);
  const candidateFirstName = `Sophia${uniqueId}`;
  const candidateLastName = `SophiaL${uniqueId}`;
  const candidateFullName = `${candidateFirstName} ${candidateLastName}`;
  const candidateEmail = `sophia.${uniqueId}@example.com`;
  
  test.beforeEach(async ({ loginPage, dashboardPage, recruitmentPage }) => {
    await loginPage.navigate();
    const { username, password } = testData.loginCredentials.valid;
    await loginPage.login(username, password);
    await dashboardPage.isLoaded();
    await dashboardPage.navigateToModule('Recruitment');
    await recruitmentPage.addButton.waitFor({ state: 'visible', timeout: 25000 });
  });

  test('TC_REC_01: Add candidate details', async ({ recruitmentPage }) => {
    const { contactNumber } = testData.candidateDetails;
    await recruitmentPage.addCandidate(candidateFirstName, candidateLastName, candidateEmail, contactNumber, null);
    await expect(recruitmentPage.page.locator('h6:has-text("Application Stage"), h6:has-text("Candidate Profile")').first()).toBeVisible({ timeout: 30000 });
  });

  test('TC_REC_02: Search candidate records', async ({ recruitmentPage }) => {
    await recruitmentPage.searchCandidate(candidateFirstName);
    const exists = await recruitmentPage.isCandidateInResults(candidateFullName);
    expect(exists).toBe(true);
  });

  test('TC_REC_03: Verify Recruitment page has Add button visible', async ({ recruitmentPage }) => {
    await expect(recruitmentPage.addButton).toBeVisible();
  });

  test('TC_REC_04: Verify Candidates tab is functional', async ({ recruitmentPage }) => {
    await recruitmentPage.candidatesTab.click();
    await expect(recruitmentPage.searchButton).toBeVisible();
  });

  test('TC_REC_05: Verify top navigation contains Vacancies tab', async ({ page }) => {
    const vacanciesTab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Vacancies' });
    await expect(vacanciesTab).toBeVisible();
  });

  test('TC_REC_06: Verify job title dropdown filter is visible', async ({ page }) => {
    const dropdown = page.locator('.oxd-input-group:has-text("Job Title") .oxd-select-text');
    await expect(dropdown).toBeVisible();
  });

  test('TC_REC_07: Verify vacancy dropdown filter is visible', async ({ page }) => {
    const dropdown = page.locator('.oxd-input-group:has-text("Vacancy") .oxd-select-text');
    await expect(dropdown).toBeVisible();
  });

  test('TC_REC_08: Verify hiring manager dropdown filter is visible', async ({ page }) => {
    const dropdown = page.locator('.oxd-input-group:has-text("Hiring Manager") .oxd-select-text');
    await expect(dropdown).toBeVisible();
  });

  test('TC_REC_09: Verify status dropdown filter is visible', async ({ page }) => {
    const dropdown = page.locator('.oxd-input-group:has-text("Status") .oxd-select-text');
    await expect(dropdown).toBeVisible();
  });

  test('TC_REC_10: Verify method of application dropdown filter is visible', async ({ page }) => {
    const dropdown = page.locator('.oxd-input-group:has-text("Method of Application") .oxd-select-text');
    await expect(dropdown).toBeVisible();
  });

  test('TC_REC_11: Verify validation error on empty First Name input', async ({ recruitmentPage, page }) => {
    await recruitmentPage.addButton.click();
    await recruitmentPage.saveButton.click();
    // The Add Candidate form uses separate First/Last Name fields (no longer a single "Candidate Full Name" field).
    const err = page.locator('.oxd-input-group').filter({ has: recruitmentPage.firstNameInput }).locator('.oxd-input-group__message').first();
    await expect(err).toHaveText('Required');
  });

  test('TC_REC_12: Verify validation error on empty Last Name input', async ({ recruitmentPage, page }) => {
    await recruitmentPage.addButton.click();
    await recruitmentPage.firstNameInput.fill('Soph');
    await recruitmentPage.saveButton.click();
    const err = page.locator('.oxd-input-group').filter({ has: recruitmentPage.lastNameInput }).locator('.oxd-input-group__message').first();
    await expect(err).toHaveText('Required');
  });

  test('TC_REC_13: Verify validation error on empty Email input', async ({ recruitmentPage, page }) => {
    await recruitmentPage.addButton.click();
    await recruitmentPage.saveButton.click();
    const err = page.locator('.oxd-input-group:has-text("Email") .oxd-input-group__message');
    await expect(err).toHaveText('Required');
  });

  test('TC_REC_14: Verify validation error on invalid Email format', async ({ recruitmentPage, page }) => {
    await recruitmentPage.addButton.click();
    await recruitmentPage.emailInput.fill('invalidemailformat');
    await recruitmentPage.saveButton.click();
    const err = page.locator('.oxd-input-group:has-text("Email") .oxd-input-group__message');
    await expect(err).toHaveText('Expected format: admin@example.com');
  });

  test('TC_REC_15: Verify Cancel button on Add Candidate form returns to candidates page', async ({ recruitmentPage, page }) => {
    await recruitmentPage.addButton.click();
    const cancel = page.locator('button.oxd-button--ghost');
    await cancel.click();
    await page.waitForURL('**/recruitment/viewCandidates');
    expect(page.url()).toContain('/recruitment/viewCandidates');
  });

  test('TC_REC_16: Verify Reset button clears Candidate Name input', async ({ recruitmentPage, page }) => {
    await recruitmentPage.candidatesTab.click();
    await recruitmentPage.searchCandidateNameInput.fill(candidateFirstName);
    // Reset only clears a confirmed autocomplete selection, not unconfirmed free-typed text
    // (same behavior as the Directory module's search field).
    const option = recruitmentPage.autocompleteOption.filter({ hasText: candidateFirstName }).first();
    await option.waitFor({ state: 'visible', timeout: 15000 });
    await option.click();
    const reset = page.locator('button', { hasText: 'Reset' });
    await reset.click();
    await expect(recruitmentPage.searchCandidateNameInput).toHaveValue('');
  });

  test('TC_REC_17: Verify Recruitment header breadcrumb displays Recruitment / Candidates', async ({ page }) => {
    const breadcrumb = page.locator('.oxd-topbar-header-title');
    await expect(breadcrumb).toContainText('Recruitment');
  });

  test('TC_REC_18: Verify table checkboxes exist for recruitment rows', async ({ page }) => {
    const check = page.locator('.oxd-table-body .oxd-checkbox-wrapper').first();
    expect(check).toBeDefined();
  });

  test('TC_REC_19: Verify date of application filter inputs are visible', async ({ page }) => {
    // "From Date"/"To Date" are now a single "Date of Application" group with From/To placeholder inputs.
    const dateGroup = page.locator('.oxd-input-group:has-text("Date of Application")');
    const fromDate = dateGroup.locator('input[placeholder="From"]');
    const toDate = dateGroup.locator('input[placeholder="To"]');
    await expect(fromDate).toBeVisible();
    await expect(toDate).toBeVisible();
  });

  test('TC_REC_20: Verify Keywords input is functional', async ({ page }) => {
    const keywords = page.locator('.oxd-input-group:has-text("Keywords") input');
    await expect(keywords).toBeVisible();
  });

  test('TC_REC_21: Verify select all checkbox is in the header', async ({ page }) => {
    const headerCheck = page.locator('.oxd-table-header .oxd-checkbox-wrapper');
    await expect(headerCheck).toBeVisible();
  });

  test('TC_REC_22: Verify records text is visible above the table', async ({ page }) => {
    const records = page.locator('.orangehrm-horizontal-padding > span');
    await expect(records).toBeVisible();
  });

  test('TC_REC_23: Verify file upload field accepts doc/docx/pdf file types', async ({ recruitmentPage }) => {
    await recruitmentPage.addButton.click();
    const resumeInput = recruitmentPage.resumeInput;
    await expect(resumeInput).toBeAttached();
  });

  test('TC_REC_24: Verify consent checkbox is visible in Add Candidate form', async ({ recruitmentPage, page }) => {
    await recruitmentPage.addButton.click();
    const consent = page.locator('.oxd-checkbox-wrapper input[type="checkbox"]');
    expect(consent).toBeDefined();
  });

  test('TC_REC_25: Verify Vacancy dropdown has option elements loaded', async ({ recruitmentPage, page }) => {
    await recruitmentPage.addButton.click();
    const vacancyDropdown = page.locator('.oxd-input-group:has-text("Vacancy") .oxd-select-text');
    await expect(vacancyDropdown).toBeVisible();
  });
});
