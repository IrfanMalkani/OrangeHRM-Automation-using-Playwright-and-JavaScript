# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: leave.spec.js >> OrangeHRM Leave Module >> TC_LEAVE_01: Apply leave request flow
- Location: tests\leave.spec.js:95:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "pending approval"
Received string:    "cancelled (2.00)"
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic:
    - complementary [ref=e4]:
      - navigation "Sidepanel" [ref=e5]:
        - generic [ref=e6]:
          - link "client brand banner" [ref=e7] [cursor=pointer]:
            - /url: https://www.orangehrm.com/
            - img "client brand banner" [ref=e9]
          - text: 
        - generic [ref=e10]:
          - generic [ref=e11]:
            - generic [ref=e12]:
              - textbox "Search" [ref=e15]
              - button "" [ref=e16] [cursor=pointer]:
                - generic [ref=e17]: 
            - separator [ref=e18]
          - list [ref=e19]:
            - listitem [ref=e20]:
              - link "Admin" [ref=e21] [cursor=pointer]:
                - /url: /web/index.php/admin/viewAdminModule
                - generic [ref=e24]: Admin
            - listitem [ref=e25]:
              - link "PIM" [ref=e26] [cursor=pointer]:
                - /url: /web/index.php/pim/viewPimModule
                - generic [ref=e40]: PIM
            - listitem [ref=e41]:
              - link "Leave" [ref=e42] [cursor=pointer]:
                - /url: /web/index.php/leave/viewLeaveModule
                - generic [ref=e45]: Leave
            - listitem [ref=e46]:
              - link "Time" [ref=e47] [cursor=pointer]:
                - /url: /web/index.php/time/viewTimeModule
                - generic [ref=e53]: Time
            - listitem [ref=e54]:
              - link "Recruitment" [ref=e55] [cursor=pointer]:
                - /url: /web/index.php/recruitment/viewRecruitmentModule
                - generic [ref=e61]: Recruitment
            - listitem [ref=e62]:
              - link "My Info" [ref=e63] [cursor=pointer]:
                - /url: /web/index.php/pim/viewMyDetails
                - generic [ref=e69]: My Info
            - listitem [ref=e70]:
              - link "Performance" [ref=e71] [cursor=pointer]:
                - /url: /web/index.php/performance/viewPerformanceModule
                - generic [ref=e79]: Performance
            - listitem [ref=e80]:
              - link "Dashboard" [ref=e81] [cursor=pointer]:
                - /url: /web/index.php/dashboard/index
                - generic [ref=e84]: Dashboard
            - listitem [ref=e85]:
              - link "Directory" [ref=e86] [cursor=pointer]:
                - /url: /web/index.php/directory/viewDirectory
                - generic [ref=e89]: Directory
            - listitem [ref=e90]:
              - link "Maintenance" [ref=e91] [cursor=pointer]:
                - /url: /web/index.php/maintenance/viewMaintenanceModule
                - generic [ref=e95]: Maintenance
            - listitem [ref=e96]:
              - link "Claim" [ref=e97] [cursor=pointer]:
                - /url: /web/index.php/claim/viewClaimModule
                - img [ref=e100]
                - generic [ref=e104]: Claim
            - listitem [ref=e105]:
              - link "Buzz" [ref=e106] [cursor=pointer]:
                - /url: /web/index.php/buzz/viewBuzz
                - generic [ref=e109]: Buzz
    - banner [ref=e110]:
      - generic [ref=e111]:
        - generic [ref=e112]:
          - text: 
          - heading "Leave" [level=6] [ref=e114]
        - link "Upgrade" [ref=e116]:
          - /url: https://orangehrm.com/open-source/upgrade-to-advanced
          - button "Upgrade" [ref=e117] [cursor=pointer]: Upgrade
        - list [ref=e123]:
          - listitem [ref=e124]:
            - generic [ref=e125] [cursor=pointer]:
              - img "profile picture" [ref=e126]
              - paragraph [ref=e127]: John Cena
              - generic [ref=e128]: 
      - navigation "Topbar Menu" [ref=e130]:
        - list [ref=e131]:
          - listitem [ref=e132] [cursor=pointer]:
            - link "Apply" [ref=e133]:
              - /url: "#"
          - listitem [ref=e134] [cursor=pointer]:
            - link "My Leave" [ref=e135]:
              - /url: "#"
          - listitem [ref=e136] [cursor=pointer]:
            - generic [ref=e137]:
              - text: Entitlements
              - generic [ref=e138]: 
          - listitem [ref=e139] [cursor=pointer]:
            - generic [ref=e140]:
              - text: Reports
              - generic [ref=e141]: 
          - listitem [ref=e142] [cursor=pointer]:
            - generic [ref=e143]:
              - text: Configure
              - generic [ref=e144]: 
          - listitem [ref=e145] [cursor=pointer]:
            - link "Leave List" [ref=e146]:
              - /url: "#"
          - listitem [ref=e147] [cursor=pointer]:
            - link "Assign Leave" [ref=e148]:
              - /url: "#"
          - button "" [ref=e150] [cursor=pointer]:
            - generic [ref=e151]: 
  - generic [ref=e152]:
    - generic [ref=e154]:
      - generic [ref=e155]:
        - generic [ref=e156]:
          - heading "My Leave List" [level=5] [ref=e158]
          - button "" [ref=e161] [cursor=pointer]:
            - generic [ref=e162]: 
        - separator [ref=e163]
        - generic [ref=e165]:
          - generic [ref=e167]:
            - generic [ref=e169]:
              - generic [ref=e171]: From Date
              - generic [ref=e174]:
                - textbox "yyyy-dd-mm" [ref=e175]: 2026-28-07
                - generic [ref=e176] [cursor=pointer]: 
            - generic [ref=e178]:
              - generic [ref=e180]: To Date
              - generic [ref=e183]:
                - textbox "yyyy-dd-mm" [ref=e184]: 2026-29-07
                - generic [ref=e185] [cursor=pointer]: 
            - generic [ref=e187]:
              - generic [ref=e189]: Show Leave with Status*
              - generic [ref=e191]:
                - generic [ref=e192] [cursor=pointer]:
                  - generic [ref=e193]: Select
                  - generic [ref=e195]: 
                - generic [ref=e196]:
                  - generic [ref=e197]:
                    - text: Rejected
                    - generic [ref=e198] [cursor=pointer]: 
                  - generic [ref=e199]:
                    - text: Cancelled
                    - generic [ref=e200] [cursor=pointer]: 
                  - generic [ref=e201]:
                    - text: Pending Approval
                    - generic [ref=e202] [cursor=pointer]: 
                  - generic [ref=e203]:
                    - text: Scheduled
                    - generic [ref=e204] [cursor=pointer]: 
                  - generic [ref=e205]:
                    - text: Taken
                    - generic [ref=e206] [cursor=pointer]: 
            - generic [ref=e208]:
              - generic [ref=e210]: Leave Type
              - generic [ref=e213] [cursor=pointer]:
                - generic [ref=e214]: "-- Select --"
                - generic [ref=e216]: 
          - separator [ref=e217]
          - generic [ref=e218]:
            - paragraph [ref=e219]: "* Required"
            - button "Reset" [ref=e220] [cursor=pointer]
            - button "Search" [active] [ref=e221] [cursor=pointer]
      - generic [ref=e222]:
        - generic [ref=e224]: (5) Records Found
        - table [ref=e226]:
          - rowgroup [ref=e227]:
            - row " Date Employee Name Leave Type Leave Balance (Days) Number of Days Status Comments Actions" [ref=e228]:
              - columnheader "" [ref=e229]:
                - generic [ref=e231] [cursor=pointer]:
                  - checkbox "" [ref=e232]
                  - generic [ref=e234]: 
              - columnheader "Date" [ref=e235]
              - columnheader "Employee Name" [ref=e236]
              - columnheader "Leave Type" [ref=e237]
              - columnheader "Leave Balance (Days)" [ref=e238]
              - columnheader "Number of Days" [ref=e239]
              - columnheader "Status" [ref=e240]
              - columnheader "Comments" [ref=e241]
              - columnheader "Actions" [ref=e242]
          - rowgroup [ref=e243]:
            - row " 2026-22-12 to 2026-23-12 John KUMAR Cena US - Vacation 103.00 2.00 Cancelled (2.00) Vacation and personal time off request. " [ref=e245]:
              - cell "" [ref=e246]:
                - generic [ref=e249] [cursor=pointer]:
                  - checkbox "" [ref=e250]
                  - generic [ref=e252]: 
              - cell "2026-22-12 to 2026-23-12" [ref=e253]:
                - generic [ref=e254]: 2026-22-12 to 2026-23-12
              - cell "John KUMAR Cena" [ref=e255]:
                - generic [ref=e256]: John KUMAR Cena
              - cell "US - Vacation" [ref=e257]:
                - generic [ref=e258]: US - Vacation
              - cell "103.00" [ref=e259]:
                - generic [ref=e260]: "103.00"
              - cell "2.00" [ref=e261]:
                - generic [ref=e262]: "2.00"
              - cell "Cancelled (2.00)" [ref=e263]:
                - generic [ref=e264]: Cancelled (2.00)
              - cell "Vacation and personal time off request." [ref=e265]:
                - generic [ref=e266]: Vacation and personal time off request.
              - cell "" [ref=e267]:
                - listitem [ref=e269]:
                  - button "" [ref=e270] [cursor=pointer]:
                    - generic [ref=e271]: 
            - row " 2026-09-08 to 2026-09-09 John KUMAR Cena US - Vacation 103.00 23.00 Pending Approval (23.00) Vacation and personal time off request. Cancel " [ref=e273]:
              - cell "" [ref=e274]:
                - generic [ref=e277] [cursor=pointer]:
                  - checkbox "" [ref=e278]
                  - generic [ref=e280]: 
              - cell "2026-09-08 to 2026-09-09" [ref=e281]:
                - generic [ref=e282]: 2026-09-08 to 2026-09-09
              - cell "John KUMAR Cena" [ref=e283]:
                - generic [ref=e284]: John KUMAR Cena
              - cell "US - Vacation" [ref=e285]:
                - generic [ref=e286]: US - Vacation
              - cell "103.00" [ref=e287]:
                - generic [ref=e288]: "103.00"
              - cell "23.00" [ref=e289]:
                - generic [ref=e290]: "23.00"
              - cell "Pending Approval (23.00)" [ref=e291]:
                - generic [ref=e292]: Pending Approval (23.00)
              - cell "Vacation and personal time off request." [ref=e293]:
                - generic [ref=e294]: Vacation and personal time off request.
              - cell "Cancel " [ref=e295]:
                - generic [ref=e296]:
                  - button "Cancel" [ref=e297] [cursor=pointer]
                  - listitem [ref=e298]:
                    - button "" [ref=e299] [cursor=pointer]:
                      - generic [ref=e300]: 
            - row " 2026-28-07 to 2026-29-07 John KUMAR Cena US - Vacation 103.00 2.00 Pending Approval (2.00) Vacation and personal time off request. Cancel " [ref=e302]:
              - cell "" [ref=e303]:
                - generic [ref=e306] [cursor=pointer]:
                  - checkbox "" [ref=e307]
                  - generic [ref=e309]: 
              - cell "2026-28-07 to 2026-29-07" [ref=e310]:
                - generic [ref=e311]: 2026-28-07 to 2026-29-07
              - cell "John KUMAR Cena" [ref=e312]:
                - generic [ref=e313]: John KUMAR Cena
              - cell "US - Vacation" [ref=e314]:
                - generic [ref=e315]: US - Vacation
              - cell "103.00" [ref=e316]:
                - generic [ref=e317]: "103.00"
              - cell "2.00" [ref=e318]:
                - generic [ref=e319]: "2.00"
              - cell "Pending Approval (2.00)" [ref=e320]:
                - generic [ref=e321]: Pending Approval (2.00)
              - cell "Vacation and personal time off request." [ref=e322]:
                - generic [ref=e323]: Vacation and personal time off request.
              - cell "Cancel " [ref=e324]:
                - generic [ref=e325]:
                  - button "Cancel" [ref=e326] [cursor=pointer]
                  - listitem [ref=e327]:
                    - button "" [ref=e328] [cursor=pointer]:
                      - generic [ref=e329]: 
            - row " 2026-22-07 to 2026-24-07 John KUMAR Cena US - Vacation 103.00 3.00 Pending Approval (3.00) bu Cancel " [ref=e331]:
              - cell "" [ref=e332]:
                - generic [ref=e335] [cursor=pointer]:
                  - checkbox "" [ref=e336]
                  - generic [ref=e338]: 
              - cell "2026-22-07 to 2026-24-07" [ref=e339]:
                - generic [ref=e340]: 2026-22-07 to 2026-24-07
              - cell "John KUMAR Cena" [ref=e341]:
                - generic [ref=e342]: John KUMAR Cena
              - cell "US - Vacation" [ref=e343]:
                - generic [ref=e344]: US - Vacation
              - cell "103.00" [ref=e345]:
                - generic [ref=e346]: "103.00"
              - cell "3.00" [ref=e347]:
                - generic [ref=e348]: "3.00"
              - cell "Pending Approval (3.00)" [ref=e349]:
                - generic [ref=e350]: Pending Approval (3.00)
              - cell "bu" [ref=e351]:
                - generic [ref=e352]: bu
              - cell "Cancel " [ref=e353]:
                - generic [ref=e354]:
                  - button "Cancel" [ref=e355] [cursor=pointer]
                  - listitem [ref=e356]:
                    - button "" [ref=e357] [cursor=pointer]:
                      - generic [ref=e358]: 
            - row " 2026-10-06 to 2026-10-07 John KUMAR Cena US - Vacation 103.00 19.00 Pending Approval (19.00) Vacation and personal time off request. Cancel " [ref=e360]:
              - cell "" [ref=e361]:
                - generic [ref=e364] [cursor=pointer]:
                  - checkbox "" [ref=e365]
                  - generic [ref=e367]: 
              - cell "2026-10-06 to 2026-10-07" [ref=e368]:
                - generic [ref=e369]: 2026-10-06 to 2026-10-07
              - cell "John KUMAR Cena" [ref=e370]:
                - generic [ref=e371]: John KUMAR Cena
              - cell "US - Vacation" [ref=e372]:
                - generic [ref=e373]: US - Vacation
              - cell "103.00" [ref=e374]:
                - generic [ref=e375]: "103.00"
              - cell "19.00" [ref=e376]:
                - generic [ref=e377]: "19.00"
              - cell "Pending Approval (19.00)" [ref=e378]:
                - generic [ref=e379]: Pending Approval (19.00)
              - cell "Vacation and personal time off request." [ref=e380]:
                - generic [ref=e381]: Vacation and personal time off request.
              - cell "Cancel " [ref=e382]:
                - generic [ref=e383]:
                  - button "Cancel" [ref=e384] [cursor=pointer]
                  - listitem [ref=e385]:
                    - button "" [ref=e386] [cursor=pointer]:
                      - generic [ref=e387]: 
    - generic [ref=e389]:
      - paragraph [ref=e390]: OrangeHRM OS 5.9
      - paragraph [ref=e391]:
        - text: © 2005 - 2026
        - link "OrangeHRM, Inc" [ref=e392] [cursor=pointer]:
          - /url: http://www.orangehrm.com
        - text: . All rights reserved.
```

# Test source

```ts
  1   | const { test, expect } = require('../fixtures/baseTest');
  2   | const testData = require('../test-data/testData.json');
  3   | 
  4   | function formatDate(date) {
  5   |   const yyyy = date.getFullYear();
  6   |   const dd = String(date.getDate()).padStart(2, '0');
  7   |   const mm = String(date.getMonth() + 1).padStart(2, '0');
  8   |   return `${yyyy}-${mm}-${dd}`;
  9   | }
  10  | 
  11  | function getTuesdayOfOffsetWeek(offsetWeeks) {
  12  |   const date = new Date();
  13  |   date.setDate(date.getDate() + 7 * offsetWeeks);
  14  |   const day = date.getDay();
  15  |   const daysToTuesday = (2 - day + 7) % 7;
  16  |   const finalDate = new Date(date.getTime() + daysToTuesday * 24 * 60 * 60 * 1000);
  17  |   return finalDate;
  18  | }
  19  | 
  20  | test.describe.serial('OrangeHRM Leave Module', () => {
  21  |   let startDate, endDate;
  22  |   
  23  |   test.beforeAll(async ({ browser }) => {
  24  |     const today = new Date();
  25  |     const offsetWeeks = 1; // Use a constant offset to stay in the current leave period (2026)
  26  |     const start = getTuesdayOfOffsetWeek(offsetWeeks);
  27  |     const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  28  |     startDate = formatDate(start);
  29  |     endDate = formatDate(end);
  30  | 
  31  |     // Setup leave entitlement dynamically for the current logged-in employee
  32  |     const context = await browser.newContext();
  33  |     const page = await context.newPage();
  34  |     try {
  35  |       await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');
  36  |       await page.locator('input[name="username"]').fill(testData.loginCredentials.valid.username);
  37  |       await page.locator('input[name="password"]').fill(testData.loginCredentials.valid.password);
  38  |       await page.locator('button[type="submit"]').click();
  39  |       await page.waitForURL('**/dashboard/index');
  40  |       await page.locator('.oxd-userdropdown-name').waitFor({ state: 'visible', timeout: 15000 });
  41  |       
  42  |       const errorMsg = await page.evaluate(async () => {
  43  |         try {
  44  |           const nameEl = document.querySelector('.oxd-userdropdown-name');
  45  |           if (!nameEl) return 'No name element found';
  46  |           const employeeName = nameEl.textContent.trim();
  47  |           const nameParts = employeeName.split(' ');
  48  |           const lastName = nameParts[nameParts.length - 1];
  49  |           
  50  |           const searchRes = await fetch(`/web/index.php/api/v2/pim/employees?name=${encodeURIComponent(lastName)}`);
  51  |           const searchJson = await searchRes.json();
  52  |           const match = searchJson.data.find(emp => nameParts.includes(emp.firstName));
  53  |           if (!match) return 'No employee matched profile name: ' + employeeName;
  54  |           
  55  |           const empNumber = match.empNumber;
  56  |           
  57  |           const res = await fetch('/web/index.php/api/v2/leave/leave-entitlements', {
  58  |             method: 'POST',
  59  |             headers: { 'Content-Type': 'application/json' },
  60  |             body: JSON.stringify({
  61  |               empNumber: empNumber,
  62  |               leaveTypeId: 1,
  63  |               entitlement: "15.00",
  64  |               fromDate: "2026-01-01",
  65  |               toDate: "2026-12-31"
  66  |             })
  67  |           });
  68  |           if (!res.ok) {
  69  |             return `Failed to assign entitlement: ${res.status} ${await res.text()}`;
  70  |           }
  71  |           return null;
  72  |         } catch (e) {
  73  |           return e.message;
  74  |         }
  75  |       });
  76  |       if (errorMsg) {
  77  |         console.error('Entitlement assignment warning:', errorMsg);
  78  |       }
  79  |     } catch (e) {
  80  |       console.error('Failed to setup leave entitlement in beforeAll:', e);
  81  |     } finally {
  82  |       await context.close();
  83  |     }
  84  |   });
  85  |   
  86  |   test.beforeEach(async ({ loginPage, dashboardPage, leavePage }) => {
  87  |     await loginPage.navigate();
  88  |     const { username, password } = testData.loginCredentials.valid;
  89  |     await loginPage.login(username, password);
  90  |     await dashboardPage.isLoaded();
  91  |     await dashboardPage.navigateToModule('Leave');
  92  |     await leavePage.applyTab.waitFor({ state: 'visible', timeout: 25000 });
  93  |   });
  94  | 
  95  |   test('TC_LEAVE_01: Apply leave request flow', async ({ leavePage }) => {
  96  |     await leavePage.applyLeave(startDate, endDate, testData.leaveDetails.comments);
  97  |     const status = await leavePage.getLatestLeaveStatus(startDate, endDate);
  98  |     expect(status).not.toBeNull();
> 99  |     expect(status.toLowerCase()).toContain('pending approval');
      |                                  ^ Error: expect(received).toContain(expected) // indexOf
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
  199 |     await expect(err).toHaveText('To date should be after from date');
```