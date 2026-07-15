# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: leave.spec.js >> OrangeHRM Leave Module >> TC_LEAVE_19: Verify date validation error message if To Date is before From Date
- Location: tests\leave.spec.js:193:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('.oxd-input-group:has-text("To Date") .oxd-input-group__message')
Expected: "To date should be after from date"
Received: "Should be a valid date in yyyy-dd-mm format"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('.oxd-input-group:has-text("To Date") .oxd-input-group__message')
    28 × locator resolved to <span data-v-7b563373="" data-v-957b4417="" class="oxd-text oxd-text--span oxd-input-field-error-message oxd-input-group__message">Should be a valid date in yyyy-dd-mm format</span>
       - unexpected value "Should be a valid date in yyyy-dd-mm format"

```

```yaml
- text: Should be a valid date in yyyy-dd-mm format
```

# Test source

```ts
  99  |     expect(status.toLowerCase()).toContain('pending approval');
  100 |   });
  101 | 
  102 |   test('TC_LEAVE_02: Verify leave type of applied leave request', async ({ leavePage }) => {
  103 |     const leaveType = await leavePage.getLatestLeaveType(startDate, endDate);
  104 |     expect(leaveType).not.toBeNull();
  105 |   });
  106 | 
  107 |   test('TC_LEAVE_03: Verify Top Navigation Tab Apply is visible', async ({ leavePage }) => {
  108 |     await expect(leavePage.applyTab).toBeVisible();
  109 |   });
  110 | 
  111 |   test('TC_LEAVE_04: Verify Top Navigation Tab My Leave is visible', async ({ leavePage }) => {
  112 |     await expect(leavePage.myLeaveTab).toBeVisible();
  113 |   });
  114 | 
  115 |   test('TC_LEAVE_05: Verify Top Navigation Tab Entitlements dropdown is visible', async ({ page }) => {
  116 |     const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Entitlements' });
  117 |     await expect(tab).toBeVisible();
  118 |   });
  119 | 
  120 |   test('TC_LEAVE_06: Verify Top Navigation Tab Reports dropdown is visible', async ({ page }) => {
  121 |     const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Reports' });
  122 |     await expect(tab).toBeVisible();
  123 |   });
  124 | 
  125 |   test('TC_LEAVE_07: Verify Top Navigation Tab Configure dropdown is visible', async ({ page }) => {
  126 |     const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Configure' });
  127 |     await expect(tab).toBeVisible();
  128 |   });
  129 | 
  130 |   test('TC_LEAVE_08: Verify Top Navigation Tab Leave List is visible', async ({ page }) => {
  131 |     const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Leave List' });
  132 |     await expect(tab).toBeVisible();
  133 |   });
  134 | 
  135 |   test('TC_LEAVE_09: Verify Top Navigation Tab Assign Leave is visible', async ({ page }) => {
  136 |     const tab = page.locator('.oxd-topbar-body-nav-tab-item', { hasText: 'Assign Leave' });
  137 |     await expect(tab).toBeVisible();
  138 |   });
  139 | 
  140 |   test('TC_LEAVE_10: Verify validation error on empty Leave Type in Apply form', async ({ leavePage, page }) => {
  141 |     await leavePage.applyTab.click();
  142 |     await leavePage.applyButton.click();
  143 |     const err = page.locator('.oxd-input-group:has-text("Leave Type") .oxd-input-group__message');
  144 |     await expect(err).toHaveText('Required');
  145 |   });
  146 | 
  147 |   test('TC_LEAVE_11: Verify From Date input field is visible', async ({ leavePage }) => {
  148 |     await expect(leavePage.fromDateInput).toBeVisible();
  149 |   });
  150 | 
  151 |   test('TC_LEAVE_12: Verify To Date input field is visible', async ({ leavePage }) => {
  152 |     await expect(leavePage.toDateInput).toBeVisible();
  153 |   });
  154 | 
  155 |   test('TC_LEAVE_13: Verify comments textarea has correct maximum character details', async ({ leavePage }) => {
  156 |     await leavePage.applyTab.click();
  157 |     await expect(leavePage.commentsTextarea).toBeVisible();
  158 |   });
  159 | 
  160 |   test('TC_LEAVE_14: Verify calendar icon buttons exist next to date input fields', async ({ page }) => {
  161 |     const icons = page.locator('.oxd-date-input i.bi-calendar');
  162 |     await expect(icons.first()).toBeVisible();
  163 |   });
  164 | 
  165 |   test('TC_LEAVE_15: Verify Show with Status checkboxes exist in My Leave list filters', async ({ leavePage, page }) => {
  166 |     await leavePage.myLeaveTab.click();
  167 |     const statusCheckbox = page.locator('.oxd-checkbox-wrapper').first();
  168 |     await expect(statusCheckbox).toBeVisible();
  169 |   });
  170 | 
  171 |   test('TC_LEAVE_16: Verify Leave Type dropdown filter is present in My Leave tab', async ({ leavePage, page }) => {
  172 |     await leavePage.myLeaveTab.click();
  173 |     const dropdown = page.locator('.oxd-input-group:has-text("Leave Type") .oxd-select-text');
  174 |     await expect(dropdown).toBeVisible();
  175 |   });
  176 | 
  177 |   test('TC_LEAVE_17: Verify Reset button clears date inputs in My Leave filters', async ({ leavePage, page }) => {
  178 |     await leavePage.myLeaveTab.click();
  179 |     await leavePage.fromDateInput.fill('2026-05-01');
  180 |     const resetBtn = page.locator('button', { hasText: 'Reset' });
  181 |     await resetBtn.click();
  182 |     // Verify input gets cleared or reset to default value
  183 |     const val = await leavePage.fromDateInput.inputValue();
  184 |     expect(val).not.toBe('2026-05-01');
  185 |   });
  186 | 
  187 |   test('TC_LEAVE_18: Verify table headers in My Leave results page', async ({ leavePage, page }) => {
  188 |     await leavePage.myLeaveTab.click();
  189 |     const headerRow = page.locator('.oxd-table-header');
  190 |     await expect(headerRow).toBeVisible();
  191 |   });
  192 | 
  193 |   test('TC_LEAVE_19: Verify date validation error message if To Date is before From Date', async ({ leavePage, page }) => {
  194 |     await leavePage.applyTab.click();
  195 |     await leavePage.fromDateInput.fill('2026-10-10');
  196 |     await leavePage.toDateInput.fill('2026-10-05');
  197 |     await leavePage.toDateInput.press('Tab');
  198 |     const err = page.locator('.oxd-input-group:has-text("To Date") .oxd-input-group__message');
> 199 |     await expect(err).toHaveText('To date should be after from date');
      |                       ^ Error: expect(locator).toHaveText(expected) failed
  200 |   });
  201 | 
  202 |   test('TC_LEAVE_20: Verify calendar widget opens when From Date input is clicked', async ({ leavePage, page }) => {
  203 |     await leavePage.applyTab.click();
  204 |     await leavePage.fromDateInput.click();
  205 |     const calendarWidget = page.locator('.oxd-date-input-calendar');
  206 |     await expect(calendarWidget).toBeVisible();
  207 |   });
  208 | 
  209 |   test('TC_LEAVE_21: Verify calendar widget opens when To Date input is clicked', async ({ leavePage, page }) => {
  210 |     await leavePage.applyTab.click();
  211 |     await leavePage.toDateInput.click();
  212 |     const calendarWidget = page.locator('.oxd-date-input-calendar');
  213 |     await expect(calendarWidget).toBeVisible();
  214 |   });
  215 | 
  216 |   test('TC_LEAVE_22: Verify Leave page header title displays Leave', async ({ page }) => {
  217 |     const title = page.locator('.oxd-topbar-header-title');
  218 |     await expect(title).toContainText('Leave');
  219 |   });
  220 | 
  221 |   test('TC_LEAVE_23: Verify Leave Balance card is shown for specific leave types', async ({ leavePage, page }) => {
  222 |     await leavePage.applyTab.click();
  223 |     await leavePage.leaveTypeDropdown.click();
  224 |     await leavePage.dropdownOption.nth(1).click();
  225 |     const balance = page.locator('.orangehrm-leave-balance-value');
  226 |     expect(balance).toBeDefined();
  227 |   });
  228 | 
  229 |   test('TC_LEAVE_24: Verify My Leave list table rows can be scrolled and are visible', async ({ leavePage, page }) => {
  230 |     await leavePage.myLeaveTab.click();
  231 |     const table = page.locator('.oxd-table');
  232 |     await expect(table).toBeVisible();
  233 |   });
  234 | 
  235 |   test('TC_LEAVE_25: Verify search button on My Leave filters page has correct CSS layout', async ({ leavePage, page }) => {
  236 |     await leavePage.myLeaveTab.click();
  237 |     const searchBtn = page.locator('button[type="submit"]');
  238 |     await expect(searchBtn).toBeVisible();
  239 |   });
  240 | });
  241 | 
```