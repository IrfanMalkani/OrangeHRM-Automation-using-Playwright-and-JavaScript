// ──────────────────────────────────────────────────────────
// DirectoryPage.js – Page Object Model for OrangeHRM Directory
// URL: /web/index.php/directory/viewDirectory
// ──────────────────────────────────────────────────────────

class DirectoryPage {
  constructor(page) {
    this.page = page;

    // ── Page Header ──
    this.headerBreadcrumb = page.locator('.oxd-topbar-header-breadcrumb h6').first();

    // ── Search Form ──
    this.employeeNameInput = page.locator('.oxd-input-group:has-text("Employee Name") input');
    this.jobTitleDropdown = page.locator('.oxd-input-group:has-text("Job Title") .oxd-select-text');
    this.locationDropdown = page.locator('.oxd-input-group:has-text("Location") .oxd-select-text');
    this.searchButton = page.locator('button[type="submit"]');
    this.resetButton = page.locator('button', { hasText: 'Reset' });

    // ── Results Grid ──
    this.employeeCards = page.locator('.orangehrm-directory-card');
    this.noRecordsMessage = page.locator('span:has-text("No Records Found")');

    // ── Autocomplete ──
    this.autocompleteOption = page.locator('.oxd-autocomplete-option');
    this.selectOption = (optionText) => page.locator('.oxd-select-option', { hasText: optionText });
  }

  // ── Page Load Verification ──
  async isLoaded() {
    await this.page.waitForURL('**/directory/viewDirectory', { timeout: 30000 });
    await this.headerBreadcrumb.waitFor({ state: 'visible', timeout: 20000 });
    return true;
  }

  async getHeaderText() {
    return await this.headerBreadcrumb.textContent();
  }

  // ── Search Actions ──
  async searchByName(employeeName) {
    await this.employeeNameInput.fill(employeeName);
    const option = this.autocompleteOption.first();
    await option.waitFor({ state: 'visible', timeout: 15000 });
    await option.click();
    await this.searchButton.click();
    await this.page.waitForTimeout(2000);
  }

  async searchByJobTitle(jobTitle) {
    await this.jobTitleDropdown.click();
    await this.selectOption(jobTitle).click();
    await this.searchButton.click();
    await this.page.waitForTimeout(2000);
  }

  async resetSearch() {
    await this.resetButton.click();
    await this.page.waitForTimeout(1500);
  }

  // ── Results Verification ──
  async getEmployeeCardCount() {
    await this.page.waitForTimeout(1000);
    return await this.employeeCards.count();
  }

  async isNoRecordsVisible() {
    try {
      await this.noRecordsMessage.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = DirectoryPage;
