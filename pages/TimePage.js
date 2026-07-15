// ──────────────────────────────────────────────────────────
// TimePage.js – Page Object Model for OrangeHRM Time module
// URL: /web/index.php/time/viewEmployeeTimesheet
// ──────────────────────────────────────────────────────────

class TimePage {
  constructor(page) {
    this.page = page;

    // ── Page Header ──
    this.headerBreadcrumb = page.locator('.oxd-topbar-header-breadcrumb h6').first();

    // ── Top Navigation Tabs ──
    this.timesheetsTab = page.locator('.oxd-topbar-body-nav-tab', { hasText: 'Timesheets' });
    this.attendanceTab = page.locator('.oxd-topbar-body-nav-tab', { hasText: 'Attendance' });
    this.reportsTab = page.locator('.oxd-topbar-body-nav-tab', { hasText: 'Reports' });
    this.projectInfoTab = page.locator('.oxd-topbar-body-nav-tab', { hasText: 'Project Info' });

    // ── Timesheet sub-menus ──
    this.myTimesheetsLink = page.locator('a.oxd-topbar-body-nav-tab-link', { hasText: 'My Timesheets' });
    this.employeeTimesheetsLink = page.locator('a.oxd-topbar-body-nav-tab-link', { hasText: 'Employee Timesheets' });

    // ── Attendance sub-menus ──
    this.myRecordsLink = page.locator('a.oxd-topbar-body-nav-tab-link', { hasText: 'My Records' });
    this.punchInOutLink = page.locator('a.oxd-topbar-body-nav-tab-link', { hasText: 'Punch In/Out' });
    this.employeeRecordsLink = page.locator('a.oxd-topbar-body-nav-tab-link', { hasText: 'Employee Records' });

    // ── Common Form Elements ──
    this.employeeNameInput = page.locator('.oxd-input-group:has-text("Employee Name") input');
    this.viewButton = page.locator('button[type="submit"]');
    this.editButton = page.locator('button:has-text("Edit")');
    this.submitButton = page.locator('button[type="submit"]');

    // ── Timesheet Grid ──
    this.timesheetTable = page.locator('.orangehrm-timesheet-table, .oxd-table');
    this.timesheetRows = page.locator('.oxd-table-row');

    // ── Attendance ──
    this.punchInButton = page.locator('button:has-text("In")');
    this.punchOutButton = page.locator('button:has-text("Out")');
    this.attendanceRecordsTable = page.locator('.oxd-table');

    // ── Autocomplete ──
    this.autocompleteOption = page.locator('.oxd-autocomplete-option');
  }

  // ── Page Load Verification ──
  async isLoaded() {
    await this.page.waitForURL('**/time/**', { timeout: 30000 });
    await this.headerBreadcrumb.waitFor({ state: 'visible', timeout: 20000 });
    return true;
  }

  async getHeaderText() {
    return await this.headerBreadcrumb.textContent();
  }

  // ── Navigation ──
  async navigateToMyTimesheets() {
    await this.timesheetsTab.hover();
    await this.myTimesheetsLink.waitFor({ state: 'visible', timeout: 5000 });
    await this.myTimesheetsLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async navigateToAttendanceRecords() {
    await this.attendanceTab.hover();
    await this.myRecordsLink.waitFor({ state: 'visible', timeout: 5000 });
    await this.myRecordsLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async navigateToPunchInOut() {
    await this.attendanceTab.hover();
    await this.punchInOutLink.waitFor({ state: 'visible', timeout: 5000 });
    await this.punchInOutLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ── Tab Visibility ──
  async areAllTabsVisible() {
    const tabs = [this.timesheetsTab, this.attendanceTab];
    for (const tab of tabs) {
      if (!(await tab.isVisible())) return false;
    }
    return true;
  }
}

module.exports = TimePage;
