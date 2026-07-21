
## 📊 Executive Overview

This repository houses a production-ready, enterprise-grade E2E test automation framework for the **OrangeHRM Open Source** web application. Built using **Playwright JS**, the suite adheres strictly to the **Page Object Model (POM)** pattern, avoids hardcoded delays, utilizes robust element-action synchronization, and includes automated dynamic test case generation and packaging.

* **Target Application**: [OrangeHRM Open Source Demo](https://opensource-demo.orangehrmlive.com)
* **Design Pattern**: Page Object Model (POM) with Custom Fixtures
* **Total Coverage**: **350 Test Cases** across **14 Modules** (exactly 25 tests per module)

---

## 🗂️ Unified Results Structure

All test outputs, reports, and evidence are consolidated inside a single, centralized `Results/` folder to prevent clutter and cross-module contamination.

```text
Results/
├── Reports/
│   ├── HTML/                 # Consolidated E2E Execution Dashboard & module HTMLs
│   │   ├── Report.zip        # Consolidated zip containing all HTML/Excel/CSV results
│   │   └── playwright-report # Playwright's native interactive execution report
│   ├── JSON/                 # Playwright JSON results (results.json)
│   └── JUnit/                # JUnit-compatible XML results (results.xml)
├── TestCases/
│   ├── CSV/                  # Module-specific and master CSV test logs
│   └── XLSX/                 # Professional module-specific and master Excel spreadsheets
└── Evidence/                 # Screenshots, videos, and trace files captured on failure
```

---

## 🚀 Execution & Coverage

### Prerequisites
- Node.js (v20+ recommended)
- Google Chrome / Mozilla Firefox / Apple Safari (Playwright manages these)
- PowerShell (for post-test packaging on Windows)

### Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   npm install
   ```
2. Install Playwright browser binaries:
   ```bash
   npx playwright install
   ```

### Running Tests
* Run the entire suite (all 350 tests) in headless parallel mode:
  ```bash
  npm run test
  ```
* Run a specific spec module (e.g., Login):
  ```bash
  npx playwright test tests/login.spec.js
  ```
* Run tests matching a specific tag or test ID (e.g., `TC_LOGIN_01`):
  ```bash
  npx playwright test -g "TC_LOGIN_01"
  ```
* Run in UI / Headed Mode:
  ```bash
  npm run test:headed
  ```
* Run in debug / trace mode:
  ```bash
  npm run test:debug
  ```

*Note: The test run automatically triggers the `posttest` hook to package and compile Excel, CSV, HTML, and ZIP reports inside `Results/`.*

---

## 🔬 Test Suite Coverage Details

The framework includes **exactly 25 test cases** for each of the 14 functional modules, validating happy path E2E flows, boundaries, negative inputs, UI attributes, responsiveness, and security validation:

| # | Spec Module Name | Spec File Path | Description / Scope | Test Count |
|---|------------------|----------------|---------------------|:----------:|
| 1 | **Login** | `tests/login.spec.js` | Form validations, credential mask checking, placeholder titles, layout checks. | 25 |
| 2 | **Logout** | `tests/logout.spec.js` | Session cleanup, history navigation back-lock checks, direct URL routing guards. | 25 |
| 3 | **Validations** | `tests/validations.spec.js` | Field requirements, boundary constraints, XSS injection prevention. | 25 |
| 4 | **Forgot Password** | `tests/forgotPassword.spec.js` | Cancellation paths, username resets, UI links, header labels. | 25 |
| 5 | **Change Password** | `tests/changePassword.spec.js` | Password complexity rules, alignment checks, short-length inputs, tabs. | 25 |
| 6 | **Dashboard** | `tests/dashboard.spec.js` | Quick Launch widgets, employee charts, sidebar menu filters, responsive shifts. | 25 |
| 7 | **PIM** | `tests/pim.spec.js` | CRUD employee records, ID searches, detail edits, profile uploads, filters. | 25 |
| 8 | **Admin** | `tests/admin.spec.js` | System user creations, role dropdown filters, column layouts, username lookups. | 25 |
| 9 | **Leave** | `tests/leave.spec.js` | Leave application form inputs, duration checks, calendar popups, pending status. | 25 |
| 10 | **Recruitment** | `tests/recruitment.spec.js` | Candidate profiles, stage changes, resume formats, vacancy selector limits. | 25 |
| 11 | **My Info** | `tests/myinfo.spec.js` | SSN/SIN verification, dropdown lists, attachment attachments, avatar changes. | 25 |
| 12 | **Buzz** | `tests/buzz.spec.js` | Activity post shares, like limits, media uploads, post content length checks. | 25 |
| 13 | **Time** | `tests/time.spec.js` | Timesheets editing, project details, hour formats, punch-in/out records. | 25 |
| 14 | **Directory** | `tests/directory.spec.js` | Directory search cards, location and job title filters, autocomplete checks. | 25 |
| | **Consolidated Total** | | | **350** |

---

## 🛠️ Framework Architecture & Features

### 1. Custom Test Fixture (`fixtures/baseTest.js`)
We extend Playwright's test runner to pre-instantiate all page objects before the execution of each test block. Tests simply destructure the needed page object directly, ensuring clean, modular page instantiation:
```javascript
test('TC_LOGIN_01: Verify successful login with valid credentials', async ({ loginPage, dashboardPage }) => {
  await loginPage.login(username, password);
  expect(await dashboardPage.isLoaded()).toBe(true);
});
```

### 2. Auto-Discovery & Dynamic Packaging (`utils/zipReports.js`)
- **Zero-Maintenance Master List**: The script scans the `/tests/` directory at runtime using regular expressions to extract every test case title and ID dynamically.
- **Reporting Metrics**: Computes pass rates and execution metrics based on the latest runs and writes individual + master CSV and Excel (XLSX) sheets styled with OrangeHRM's theme palette.
- **Auto-Zipping**: Automatically triggers PowerShell to package HTML reports, Excel/CSV sheets, and Playwright reports into `Results/Reports/HTML/Report.zip`.

### 3. Execution Evidence
Failures automatically trigger screenshots, videos, and full tracing saved under `Results/Evidence/` for fast debug cycles.

---

## ✍️ Author & Maintainer

* **Irfan Malkani** - QA Automation Architect
* *Specialization: Playwright | JavaScript | E2E Framework Design | Quality Engineering*
