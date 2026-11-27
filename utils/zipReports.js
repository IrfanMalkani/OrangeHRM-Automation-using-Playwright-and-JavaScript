const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ExcelJS = require('exceljs');

const resultsDir = path.resolve(__dirname, '../Results');
const reportsDir = path.join(resultsDir, 'Reports');
const testResultsJson = path.join(reportsDir, 'JSON/results.json');
const testCasesDir = path.join(resultsDir, 'TestCases');
const csvDir = path.join(testCasesDir, 'CSV');
const xlsxDir = path.join(testCasesDir, 'XLSX');
const htmlReportDir = path.join(reportsDir, 'HTML');
const zipOutputPath = path.join(reportsDir, 'HTML/Report.zip');
const stagingDir = path.join(resultsDir, '_staging');

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function deriveModuleFromFile(filename) {
  if (!filename) return 'General';
  const name = filename.replace('.spec.js', '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function deriveFeatureFromTitle(title) {
  if (!title) return 'Verification';
  return title.replace(/^TC_[A-Z0-9_]+:\s*/i, '');
}

// Strips the trailing "(positive)" / "(negative)" / "(edge case)" style tag
// used by some titles to steer the Positive/Negative classifier, so the
// Description column reads as a clean sentence.
function cleanDescriptionText(desc) {
  return desc.replace(/\s*\((positive|negative|edge case|negative\/edge case)\)\s*$/i, '').trim();
}

// ── Human-readable Pre-condition / Test Steps / Expected Result generation ──
// Rather than a single hardcoded boilerplate string for every test case, this
// parses each test's own beforeEach setup and body to produce specifics.

const KNOWN_LOCATOR_LABELS = {
  usernameInput: 'Username field',
  passwordInput: 'Password field',
  loginButton: 'Login button',
  errorAlert: 'error alert message',
  forgotPasswordLink: "'Forgot your password?' link",
  credentialHintBox: 'credential hint box',
  copyrightText: 'copyright footer text',
  orangeHrmLogo: 'brand logo',
  loginTitle: 'Login title',
  resetUsernameInput: 'username field',
  resetButton: 'Reset Password button',
  cancelButton: 'Cancel button',
  resetSuccessTitle: 'reset success heading',
  saveButton: 'Save button',
  searchButton: 'Search button',
  applyButton: 'Apply button',
  applyTab: 'Apply tab',
  myLeaveTab: 'My Leave tab',
  fromDateInput: 'From Date field',
  toDateInput: 'To Date field',
  commentsTextarea: 'Comments field',
  leaveTypeDropdown: 'Leave Type dropdown',
  dropdownOption: 'dropdown option',
  employeeNameInput: 'Employee Name field',
  jobTitleDropdown: 'Job Title dropdown',
  locationDropdown: 'Location dropdown',
  employeeCards: 'employee card list',
  noRecordsMessage: "'No Records Found' message",
  autocompleteOption: 'autocomplete suggestion',
  sidebarToggle: 'sidebar collapse toggle',
  sidebar: 'sidebar navigation panel',
  searchInput: 'sidebar search field',
  widgets: 'dashboard widgets',
  timeAtWorkWidget: "'Time at Work' widget",
  myActionsWidget: "'My Actions' widget",
  quickLaunchWidget: "'Quick Launch' widget",
  buzzWidget: "'Buzz Latest Posts' widget",
  employeesOnLeaveWidget: "'Employees on Leave Today' widget",
  userDropdown: 'user profile dropdown',
  userDropdownName: 'logged-in user name',
  logoutLink: 'Logout link',
  aboutLink: 'About link',
  supportLink: 'Support link',
  changePasswordLink: 'Change Password link',
  headerBreadcrumb: 'page header breadcrumb',
  buzzFeed: 'Buzz feed',
  buzzPosts: 'Buzz post list',
  buzzPostBody: 'Buzz post content',
  postTextarea: 'post text area',
  postButton: 'Post button',
  shareButton: 'Share button',
  mostRecentPostsTab: "'Most Recent Posts' tab",
  mostLikedPostsTab: "'Most Liked Posts' tab",
  mostCommentedPostsTab: "'Most Commented Posts' tab",
  timesheetsTab: 'Timesheets tab',
  attendanceTab: 'Attendance tab',
  reportsTab: 'Reports tab',
  projectInfoTab: 'Project Info tab',
  myTimesheetsLink: 'My Timesheets link',
  employeeTimesheetsLink: 'Employee Timesheets link',
  myRecordsLink: 'My Records link',
  punchInOutLink: 'Punch In/Out link',
  employeeRecordsLink: 'Employee Records link',
  viewButton: 'View button',
  firstNameInput: 'First Name field',
  nickNameInput: 'Nickname field',
  otherIdInput: 'Other Id field',
  savePersonalDetailsButton: 'Save button',
  profileImageContainer: 'profile image container',
};

function humanizeIdentifier(raw) {
  if (!raw) return 'target';
  let name = raw.replace(/[_-]+/g, ' ');
  name = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return name.toLowerCase().trim() || 'target';
}

// Best-effort label for an ad hoc `page.locator('...')` / `getBy...()` expression,
// e.g. `.locator('button:has-text("Reset")')` -> "'Reset' element".
function extractLocatorLabel(exprText) {
  if (!exprText) return null;
  let m = exprText.match(/hasText:\s*['"`]([^'"`]+)['"`]/);
  if (m) return `'${m[1]}' element`;
  m = exprText.match(/has-text\(["']([^"']+)["']\)/);
  if (m) return `'${m[1]}' element`;
  m = exprText.match(/\[placeholder=["']([^"']+)["']\s*\]/);
  if (m) return `'${m[1]}' field`;
  m = exprText.match(/input\[name=["']([^"']+)["']\s*\]/);
  if (m) return `${humanizeIdentifier(m[1])} field`;
  m = exprText.match(/getByRole\(\s*['"`]([^'"`]+)['"`]/);
  if (m) return `${m[1]} element`;
  m = exprText.match(/text=([^'"`)]+)/);
  if (m) return `'${m[1].trim()}' element`;
  m = exprText.match(/['"`]([a-zA-Z][a-zA-Z0-9_-]*(?:[.\s][a-zA-Z0-9_-]+)*)['"`]/);
  if (m) {
    const tokens = m[1].split(/[.\s]+/).filter(Boolean);
    const last = tokens[tokens.length - 1].replace(/-/g, ' ');
    return `${last} element`;
  }
  return null;
}

// Finds `const X = ...locator(...)...` declarations in a test body so that
// later `X.click()` / `expect(X)...` references resolve to a readable label
// instead of the bare variable name.
function buildVarLabelMap(body) {
  const map = {};
  const declRegex = /(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^\n]+)/g;
  let m;
  while ((m = declRegex.exec(body)) !== null) {
    const rhs = m[2];
    if (/locator\(|getBy(Text|Role|Label|Placeholder|TestId)\(/.test(rhs)) {
      const label = extractLocatorLabel(rhs);
      if (label) map[m[1]] = label;
    }
  }
  return map;
}

function describeTarget(expr, varLabelMap) {
  const e = expr.trim();
  if (/locator\(|getBy(Text|Role|Label|Placeholder|TestId)\(/.test(e)) {
    return extractLocatorLabel(e) || 'targeted element';
  }
  const propMatch = e.match(/([A-Za-z0-9_]+)$/);
  const propName = propMatch ? propMatch[1] : e;
  if (varLabelMap && varLabelMap[propName]) return varLabelMap[propName];
  if (KNOWN_LOCATOR_LABELS[propName]) return KNOWN_LOCATOR_LABELS[propName];
  return humanizeIdentifier(propName);
}

const ACTION_VERBS = {
  click: 'Click',
  dblclick: 'Double-click',
  check: 'Check',
  uncheck: 'Uncheck',
  hover: 'Hover over',
  focus: 'Focus',
  selectOption: 'Select an option in',
  setInputFiles: 'Upload a file into',
};

// Maps one line of test-body code to a human step, or null if the line isn't
// a meaningful user-facing action (e.g. a locator declaration or a wait).
function describeAction(line, varLabelMap) {
  const namedSteps = [
    [/loginPage\.navigate\(/, () => 'Navigate to the OrangeHRM login page'],
    [/loginPage\.login\(/, () => 'Enter the username and password, then click the Login button'],
    [/loginPage\.loginWithUsernameOnly\(/, () => 'Enter only the username and click the Login button'],
    [/loginPage\.loginWithPasswordOnly\(/, () => 'Enter only the password and click the Login button'],
    [/loginPage\.clickLoginButtonWithoutCredentials\(/, () => 'Click the Login button without entering any credentials'],
    [/loginPage\.clickForgotPassword\(/, () => "Click the 'Forgot your password?' link"],
    [/loginPage\.resetPassword\(/, () => 'Enter the username and submit the password reset request'],
    [/loginPage\.clickCancelOnForgotPassword\(/, () => 'Click the Cancel button on the reset password page'],
    [/dashboardPage\.navigateToModule\(\s*['"]([^'"]+)['"]/, m => `Navigate to the '${m[1]}' module from the sidebar`],
    [/dashboardPage\.openUserDropdown\(/, () => 'Open the user profile dropdown menu'],
    [/dashboardPage\.searchModule\(/, () => 'Type into the sidebar module search box'],
    [/dashboardPage\.toggleSidebar\(/, () => 'Click the sidebar collapse/expand toggle'],
    [/dashboardPage\.logout\(/, () => 'Open the user dropdown and click Logout'],
    [/dashboardPage\.clickChangePassword\(/, () => 'Open the user dropdown and click Change Password'],
    [/dashboardPage\.clickAbout\(/, () => 'Open the user dropdown and click About'],
    [/buzzPage\.createPost\(/, () => 'Enter post text and submit a new Buzz post'],
    [/directoryPage\.searchByJobTitle\(/, () => 'Select a Job Title filter and click Search'],
    [/directoryPage\.searchByName\(/, () => 'Enter an employee name, select it from the autocomplete suggestions, and click Search'],
    [/directoryPage\.resetSearch\(/, () => 'Click the Reset button to clear search filters'],
    [/leavePage\.applyLeave\(/, () => 'Select a leave type, set the From/To dates, enter comments, and submit the Apply Leave form'],
    [/timePage\.navigateToMyTimesheets\(/, () => 'Navigate to the My Timesheets page'],
    [/timePage\.navigateToPunchInOut\(/, () => 'Navigate to the Punch In/Out page'],
    [/timePage\.navigateToAttendanceRecords\(/, () => 'Navigate to the Attendance My Records page'],
    [/myInfoPage\.updatePersonalDetails\(/, () => 'Update the Personal Details form fields and save'],
    [/myInfoPage\.uploadProfileImage\(/, () => 'Upload a new profile image file'],
    [/\.setViewportSize\(/, () => 'Resize the browser viewport to simulate a mobile device'],
    [/page\.goBack\(/, () => "Navigate back using the browser's back button"],
    [/page\.reload\(/, () => 'Reload the current page'],
    [/page\.goto\(\s*['"`]([^'"`]*)['"`]/, m => `Navigate directly to '${m[1]}'`],
    [/page\.keyboard\.press\(\s*['"`]([^'"`]+)['"`]/, m => `Press the '${m[1]}' key`],
  ];

  for (const [re, fn] of namedSteps) {
    const m = line.match(re);
    if (m) return fn(m);
  }

  // Lines that are pure setup/inspection rather than a user-facing step.
  if (/page\.route\(/.test(line)) return null;
  if (/\.waitFor(Timeout|Selector|LoadState)?\(/.test(line) && !/waitForURL/.test(line)) return null;
  if (/\.evaluate\(/.test(line)) return null;
  if (/console\.(log|error)\(/.test(line)) return null;

  let m = line.match(/([A-Za-z0-9_.]+)\.(click|dblclick|check|uncheck|hover|focus|selectOption|setInputFiles)\(/);
  if (m) return `${ACTION_VERBS[m[2]]} the ${describeTarget(m[1], varLabelMap)}`;

  m = line.match(/([A-Za-z0-9_.]+)\.fill\(\s*(['"`])((?:\\.|(?!\2).)*)\2/);
  if (m) {
    const value = m[3];
    const preview = value.length > 40 ? `${value.slice(0, 40)}…` : value;
    return `Enter '${preview}' into the ${describeTarget(m[1], varLabelMap)}`;
  }

  m = line.match(/([A-Za-z0-9_.]+)\.press\(\s*['"`]([^'"`]+)['"`]/);
  if (m) return `Press the '${m[2]}' key while focused on the ${describeTarget(m[1], varLabelMap)}`;

  return null;
}

function deriveStepsFromBody(body, varLabelMap) {
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  const steps = [];
  for (const line of lines) {
    if (/^(const|let|var)\s+\w+\s*=/.test(line) &&
      !/\.(click|dblclick|check|uncheck|hover|focus|selectOption|setInputFiles|fill|press|reload|goto|goBack)\(/.test(line)) {
      continue;
    }
    if (/^(await\s+)?expect[.(]/.test(line)) continue;
    if (/^\/\//.test(line)) continue;

    const step = describeAction(line, varLabelMap);
    if (step && !steps.includes(step)) steps.push(step);
  }
  if (steps.length === 0) steps.push('Perform the actions described in the test title');
  return steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

function extractFirstArg(argsRaw) {
  if (!argsRaw) return '';
  let depth = 0;
  let inStr = null;
  for (let i = 0; i < argsRaw.length; i++) {
    const c = argsRaw[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    else if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') depth--;
    else if (c === ',' && depth === 0) return argsRaw.substring(0, i).trim();
  }
  return argsRaw.trim();
}

function formatAssertionValue(raw) {
  if (raw == null || raw === '') return 'the expected value';
  const v = raw.trim();
  const strMatch = v.match(/^['"`]([\s\S]*)['"`]$/);
  if (strMatch) return `'${strMatch[1]}'`;
  const regexMatch = v.match(/^\/(.*)\/[a-z]*$/);
  if (regexMatch) return `a value matching /${regexMatch[1]}/`;
  return `'${v}'`;
}

const MATCHER_TEMPLATES = {
  toBe: (t, n, v) => `${t} should ${n}equal ${v}`,
  toEqual: (t, n, v) => `${t} should ${n}equal ${v}`,
  toContain: (t, n, v) => `${t} should ${n}contain ${v}`,
  toContainText: (t, n, v) => `${t} should ${n}contain the text ${v}`,
  toHaveText: (t, n, v) => `${t} should ${n}display the text ${v}`,
  toHaveValue: (t, n, v) => `${t} should ${n}have the value ${v}`,
  toHaveClass: (t, n, v) => `${t} should ${n}have a CSS class matching ${v}`,
  toHaveURL: (t, n, v) => `The browser URL should ${n}match ${v}`,
  toHaveCount: (t, n, v) => `${t} should have a count of ${v}`,
  toBeVisible: (t, n) => `${t} should ${n}be visible`,
  toBeHidden: (t, n) => `${t} should ${n}be hidden`,
  toBeEnabled: (t, n) => `${t} should ${n}be enabled`,
  toBeDisabled: (t, n) => `${t} should ${n}be disabled`,
  toBeFocused: (t) => `${t} should receive keyboard focus`,
  toBeChecked: (t, n) => `${t} should ${n}be checked`,
  toBeAttached: (t, n) => `${t} should ${n}be present in the DOM`,
  toBeDefined: (t) => `${t} should be present`,
  toBeNull: (t, n) => `${t} should ${n}be null`,
  toBeTruthy: (t) => `${t} should evaluate to a truthy value`,
  toBeGreaterThan: (t, n, v) => `${t} should be greater than ${v}`,
  toBeGreaterThanOrEqual: (t, n, v) => `${t} should be greater than or equal to ${v}`,
  toBeLessThan: (t, n, v) => `${t} should be less than ${v}`,
  toBeLessThanOrEqual: (t, n, v) => `${t} should be less than or equal to ${v}`,
};

function describeExprForAssertion(expr, varLabelMap) {
  let e = expr.trim().replace(/\.trim\(\)$/, '').replace(/\.toLowerCase\(\)$/, '');
  if (/locator\(|getBy(Text|Role|Label|Placeholder|TestId)\(/.test(e)) {
    return `The ${extractLocatorLabel(e) || 'targeted element'}`;
  }
  const propMatch = e.match(/([A-Za-z0-9_]+)$/);
  const propName = propMatch ? propMatch[1] : e;
  if (varLabelMap && varLabelMap[propName]) return `The ${varLabelMap[propName]}`;
  if (KNOWN_LOCATOR_LABELS[propName]) return `The ${KNOWN_LOCATOR_LABELS[propName]}`;
  return `The ${humanizeIdentifier(propName)}`;
}

// `expect(isLoaded).toBe(true)`-style booleans read badly through the generic
// "The is loaded should equal 'true'" template; phrase these more naturally.
function describeBooleanCheck(targetExpr, matcher, rawFirstArg) {
  if (matcher !== 'toBe' && matcher !== 'toEqual') return null;
  const literal = rawFirstArg.trim().toLowerCase();
  if (literal !== 'true' && literal !== 'false') return null;
  const propMatch = targetExpr.trim().match(/([A-Za-z0-9_]+)$/);
  const propName = propMatch ? propMatch[1] : '';
  const prefixMatch = propName.match(/^(is|has)([A-Z][A-Za-z0-9]*)$/);
  if (!prefixMatch) return null;

  const wantTrue = literal === 'true';
  const predicate = humanizeIdentifier(prefixMatch[2]);
  if (predicate.startsWith('no ')) {
    return wantTrue ? `There should be ${predicate}` : `There should not be ${predicate}`;
  }
  if (prefixMatch[1] === 'is') {
    return wantTrue ? `It should be ${predicate}` : `It should not be ${predicate}`;
  }
  return wantTrue ? `It should have ${predicate}` : `It should not have ${predicate}`;
}

function deriveExpectedResults(body, varLabelMap) {
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  const results = [];
  const exprRegex = /expect\(([^;]+?)\)((?:\s*\.\s*not)?)\s*\.\s*(to[A-Za-z]+)\(([^;]*)\)/;
  for (const raw of lines) {
    const m = raw.match(exprRegex);
    if (!m) continue;
    const targetExpr = m[1].trim();
    const negated = !!m[2];
    const matcher = m[3];
    const rawFirstArg = extractFirstArg(m[4]);
    const booleanSentence = describeBooleanCheck(targetExpr, matcher, rawFirstArg);
    let sentence = booleanSentence;
    if (!sentence) {
      const firstArg = formatAssertionValue(rawFirstArg);
      const target = describeExprForAssertion(targetExpr, varLabelMap);
      const template = MATCHER_TEMPLATES[matcher];
      sentence = template
        ? template(target, negated ? 'not ' : '', firstArg)
        : `${target} should meet the '${matcher}' condition`;
    }
    if (sentence && !results.includes(sentence)) results.push(sentence);
  }
  if (results.length === 0) return 'The action completes successfully and the test assertions pass.';
  return results.map(s => `- ${s}`).join('\n');
}

// Extracts the `{ ... }` body following the nearest `=>` after `fromIndex`,
// using brace counting so nested blocks/objects don't break extraction.
function extractBlockBody(content, fromIndex) {
  const arrowIdx = content.indexOf('=>', fromIndex);
  if (arrowIdx === -1) return '';
  const braceStart = content.indexOf('{', arrowIdx);
  if (braceStart === -1 || braceStart - arrowIdx > 5) return '';
  let depth = 0;
  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return content.substring(braceStart + 1, i);
    }
  }
  return '';
}

function derivePreconditionFromSetup(content) {
  const beforeEachIdx = content.search(/test\.beforeEach\(/);
  const setupBody = beforeEachIdx !== -1 ? extractBlockBody(content, beforeEachIdx) : '';

  if (!/loginPage\.login\(/.test(setupBody)) {
    return 'The OrangeHRM login page is loaded in the browser.';
  }
  let sentence = 'The user is logged in to OrangeHRM with valid credentials and the Dashboard has loaded.';
  if (/clickChangePassword\(/.test(setupBody)) {
    sentence += ' The user has navigated to the Change Password page.';
  } else {
    const moduleMatch = setupBody.match(/navigateToModule\(\s*['"]([^'"]+)['"]\s*\)/);
    if (moduleMatch) sentence += ` The user has navigated to the '${moduleMatch[1]}' module.`;
  }
  return sentence;
}

function loadMasterTestCasesFromSpecs() {
  const tcs = [];
  const testDir = path.resolve(__dirname, '../tests');
  if (!fs.existsSync(testDir)) return tcs;

  const files = fs.readdirSync(testDir);
  files.forEach(file => {
    if (!file.endsWith('.spec.js')) return;
    const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
    const preCondition = derivePreconditionFromSetup(content);

    const regex = /test\(\s*(['"`])(TC_[A-Z0-9_]+)\s*:\s*((?:\\.|(?!\1).)*)\1/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const id = match[2];
      const rawDesc = match[3].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\`/g, '`').replace(/\\\\/g, '\\');
      const moduleName = deriveModuleFromFile(file);
      const testBody = extractBlockBody(content, match.index + match[0].length);
      const varLabelMap = buildVarLabelMap(testBody);

      tcs.push({
        id,
        module: moduleName,
        subtask: moduleName,
        feature: deriveFeatureFromTitle(cleanDescriptionText(rawDesc)),
        testType: rawDesc.toLowerCase().includes('negative') || rawDesc.toLowerCase().includes('error') || rawDesc.toLowerCase().includes('invalid') ? 'Negative' : 'Positive',
        description: cleanDescriptionText(rawDesc),
        preCondition,
        testSteps: deriveStepsFromBody(testBody, varLabelMap),
        expectedResult: deriveExpectedResults(testBody, varLabelMap),
        priority: id.endsWith('01') || id.endsWith('02') || id.endsWith('03') ? 'High' : 'Medium',
        specFile: file
      });
    }
  });

  return tcs;
}

const masterTestCases = loadMasterTestCasesFromSpecs();

function getLatestResults() {
  if (!fs.existsSync(testResultsJson)) {
    console.log(`⚠️ test-results.json not found at ${testResultsJson}. Generating default PASSED statuses.`);
    return {};
  }

  try {
    const rawData = fs.readFileSync(testResultsJson, 'utf-8');
    const data = JSON.parse(rawData);
    const resultsMap = {};

    const processSuite = (suite) => {
      if (suite.specs) {
        suite.specs.forEach(spec => {
          spec.tests.forEach(testRun => {
            let status = 'skipped';
            let duration = 0;
            let errorMsg = '';

            if (testRun.results && testRun.results.length > 0) {
              const latestResult = testRun.results[testRun.results.length - 1];
              status = latestResult.status;
              duration = latestResult.duration;
              if (latestResult.error) {
                errorMsg = latestResult.error.message || latestResult.error.value || 'Unknown error';
              }
            }

            if (status === 'expected' || status === 'passed') {
              status = 'PASSED';
            } else if (status === 'unexpected' || status === 'failed') {
              status = 'FAILED';
            } else {
              status = 'SKIPPED';
            }

            // Extract TC ID from spec title
            const testCaseIdMatch = spec.title.match(/TC_[A-Z0-9_]+/);
            if (testCaseIdMatch) {
              const tcId = testCaseIdMatch[0];
              resultsMap[tcId] = {
                status,
                duration: (duration / 1000).toFixed(2),
                error: errorMsg,
                title: spec.title,
                file: spec.file ? path.basename(spec.file) : ''
              };
            }
          });
        });
      }
      if (suite.suites) {
        suite.suites.forEach(processSuite);
      }
    };

    if (data.suites) {
      data.suites.forEach(processSuite);
    }
    return resultsMap;
  } catch (error) {
    console.error('❌ Error parsing test-results.json:', error.message);
    return {};
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateHtmlContent(title, stats, testCases, timestamp) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="OrangeHRM E2E Test Execution Report. Detailed overview of test cases, statuses, durations, and logs for automated quality assurance.">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #0f172a;
      --card-bg: rgba(30, 41, 59, 0.7);
      --border-color: rgba(255, 255, 255, 0.08);
      --primary-color: #ff7919;
      --primary-glow: rgba(255, 121, 25, 0.15);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --success: #10b981;
      --failure: #ef4444;
      --skipped: #64748b;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      line-height: 1.6;
      padding: 2rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 2.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      backdrop-filter: blur(8px);
      position: relative;
      overflow: hidden;
    }

    header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
      pointer-events: none;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .logo-badge {
      background-color: var(--primary-color);
      color: white;
      font-weight: 700;
      font-size: 14px;
      padding: 4px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }

    header h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }

    header p {
      color: var(--text-muted);
      font-size: 14px;
    }

    .meta-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      margin-top: 24px;
      font-size: 13px;
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-muted);
    }

    .meta-item strong {
      color: var(--text-main);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }

    .stat-card::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 4px;
      background: var(--skipped);
    }

    .stat-card.total::after { background: var(--primary-color); }
    .stat-card.passed::after { background: var(--success); }
    .stat-card.failed::after { background: var(--failure); }
    .stat-card.rate::after { background: #eab308; }

    .stat-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      margin-top: 4px;
    }

    .stat-card.passed .stat-value { color: var(--success); }
    .stat-card.failed .stat-value { color: var(--failure); }
    .stat-card.rate .stat-value { color: #eab308; }

    /* Results Table */
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 2rem;
      backdrop-filter: blur(8px);
    }

    .table-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-header h2 {
      font-size: 18px;
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      background-color: rgba(15, 23, 42, 0.5);
      padding: 12px 24px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
    }

    td {
      padding: 14px 24px;
      font-size: 13px;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }

    tr:hover td {
      background-color: rgba(255, 255, 255, 0.02);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.passed {
      background-color: rgba(16, 185, 129, 0.12);
      color: var(--success);
    }

    .status-badge.failed {
      background-color: rgba(239, 68, 68, 0.12);
      color: var(--failure);
    }

    .status-badge.skipped {
      background-color: rgba(100, 116, 139, 0.12);
      color: var(--skipped);
    }

    .error-log {
      font-family: monospace;
      color: var(--failure);
      background-color: rgba(239, 68, 68, 0.05);
      padding: 6px 10px;
      border-radius: 4px;
      margin-top: 4px;
      font-size: 11px;
      max-width: 500px;
      overflow-x: auto;
      white-space: pre-wrap;
    }

    footer {
      text-align: center;
      margin-top: 3rem;
      font-size: 12px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-container">
        <h1>${title}</h1>
        <span class="logo-badge">PLAYWRIGHT</span>
      </div>
      <p>Automated E2E Test Suite Dashboard & Report Packaging</p>
      
      <div class="meta-grid">
        <div class="meta-item">🕒 Timestamp: <strong>${timestamp}</strong></div>
        <div class="meta-item">🔧 Framework: <strong>Page Object Model (POM)</strong></div>
        <div class="meta-item">✍️ Author: <strong>Irfan Malkani</strong></div>
      </div>
    </header>

    <div class="stats-grid">
      <div id="stat-card-total" class="stat-card total">
        <div class="stat-label">Total Executed</div>
        <div class="stat-value">${stats.total}</div>
      </div>
      <div id="stat-card-passed" class="stat-card passed">
        <div class="stat-label">Passed</div>
        <div class="stat-value">${stats.passed}</div>
      </div>
      <div id="stat-card-failed" class="stat-card failed">
        <div class="stat-label">Failed</div>
        <div class="stat-value">${stats.failed}</div>
      </div>
      <div id="stat-card-rate" class="stat-card rate">
        <div class="stat-label">Pass Rate</div>
        <div class="stat-value">${stats.passRate}%</div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-header">
        <h2 id="table-title">Test Case Details</h2>
      </div>
      <table id="execution-results-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Test Scenario Name</th>
            <th>Spec File</th>
            <th>Duration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${testCases.length === 0 ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No test cases executed.</td></tr>` : 
            testCases.map(tc => `
              <tr>
                <td><strong>${tc.id}</strong></td>
                <td>
                  <div>${escapeHtml(tc.description)}</div>
                  ${tc.error ? `<div class="error-log">${escapeHtml(tc.error)}</div>` : ''}
                </td>
                <td>${escapeHtml(tc.specFile)}</td>
                <td>${tc.duration || '0.00'}s</td>
                <td><span class="status-badge ${tc.status.toLowerCase()}">${tc.status}</span></td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>
    </div>

    <footer>
      OrangeHRM E2E Quality Assurance Suite &bull; Generated by Playwright JS
    </footer>
  </div>
</body>
</html>`;
}

async function writeXlsxReport(filePath, title, testCases) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title.substring(0, 30));

  worksheet.columns = [
    { header: 'Test Case ID', key: 'id', width: 15 },
    { header: 'Module', key: 'module', width: 15 },
    { header: 'Subtask', key: 'subtask', width: 20 },
    { header: 'Feature', key: 'feature', width: 20 },
    { header: 'Test Type', key: 'testType', width: 12 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Pre-condition', key: 'preCondition', width: 30 },
    { header: 'Test Steps', key: 'testSteps', width: 40 },
    { header: 'Expected Result', key: 'expectedResult', width: 40 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Status', key: 'status', width: 12 }
  ];

  // Format Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell(cell => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF7919' } // Orange HRM Main brand color
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FFFF7919' } }
    };
  });

  // Add Data
  testCases.forEach(tc => {
    const row = worksheet.addRow({
      id: tc.id,
      module: tc.module,
      subtask: tc.subtask,
      feature: tc.feature,
      testType: tc.testType,
      description: tc.description,
      preCondition: tc.preCondition,
      testSteps: tc.testSteps,
      expectedResult: tc.expectedResult,
      priority: tc.priority,
      status: tc.status
    });

    row.height = 35; // Generous height for multiline cells
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFEAEAEA' } },
        bottom: { style: 'thin', color: { argb: 'FFEAEAEA' } },
        left: { style: 'thin', color: { argb: 'FFEAEAEA' } },
        right: { style: 'thin', color: { argb: 'FFEAEAEA' } }
      };

      // Highlight status cell
      if (colNumber === 11) {
        cell.font = { name: 'Segoe UI', size: 10, bold: true };
        if (cell.value === 'PASSED') {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF107C41' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1E7DD' } };
        } else if (cell.value === 'FAILED') {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFA51D24' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
        } else if (cell.value === 'SKIPPED') {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF5A6268' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E3E5' } };
        }
      }
    });
  });

  await workbook.xlsx.writeFile(filePath);
}

function writeCsvReport(filePath, testCases) {
  const headers = ['Test Case ID', 'Module', 'Subtask', 'Feature', 'Test Type', 'Description', 'Pre-condition', 'Test Steps', 'Expected Result', 'Priority', 'Status'];
  const rows = [headers.join(',')];

  testCases.forEach(tc => {
    const values = [
      tc.id,
      tc.module,
      tc.subtask,
      tc.feature,
      tc.testType,
      tc.description,
      tc.preCondition,
      tc.testSteps,
      tc.expectedResult,
      tc.priority,
      tc.status
    ].map(val => {
      // Escape double quotes and wrap in quotes if contains comma/newline
      const str = String(val || '').replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    });
    rows.push(values.join(','));
  });

  fs.writeFileSync(filePath, rows.join('\n'), 'utf-8');
}



async function run() {
  console.log('📊 Starting report packaging...');

  ensureDirectoryExists(reportsDir);
  ensureDirectoryExists(testCasesDir);
  ensureDirectoryExists(csvDir);
  ensureDirectoryExists(xlsxDir);
  ensureDirectoryExists(htmlReportDir);

  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const resultsMap = getLatestResults();

  // Create a map of masterTestCases by ID for quick lookup
  const masterMap = {};
  masterTestCases.forEach(tc => {
    masterMap[tc.id] = tc;
  });

  const enrichedTestCases = [];

  // 1. Process all run results from Playwright JSON output
  for (const [tcId, runResult] of Object.entries(resultsMap)) {
    const masterTc = masterMap[tcId];
    const specFile = runResult.file || (masterTc ? masterTc.specFile : '');
    const moduleName = deriveModuleFromFile(specFile);
    
    enrichedTestCases.push({
      id: tcId,
      module: masterTc ? masterTc.module : moduleName,
      subtask: masterTc ? masterTc.subtask : moduleName,
      feature: masterTc ? masterTc.feature : deriveFeatureFromTitle(runResult.title),
      testType: masterTc ? masterTc.testType : 'Positive',
      description: masterTc ? masterTc.description : runResult.title,
      preCondition: masterTc ? masterTc.preCondition : 'User is logged in',
      testSteps: masterTc ? masterTc.testSteps : '1. Run test automation code',
      expectedResult: masterTc ? masterTc.expectedResult : 'Action executes successfully and verification passes',
      priority: masterTc ? masterTc.priority : 'Medium',
      specFile: specFile,
      status: runResult.status,
      duration: runResult.duration,
      error: runResult.error
    });
  }

  // 2. Add any test cases from master list that were skipped / didn't execute
  masterTestCases.forEach(masterTc => {
    if (!resultsMap[masterTc.id]) {
      enrichedTestCases.push({
        ...masterTc,
        status: 'SKIPPED',
        duration: '0.00',
        error: ''
      });
    }
  });

  // Group by spec file name to separate modules
  const modules = {
    'login': { title: 'Login Module', filter: 'login.spec.js' },
    'logout': { title: 'Logout Module', filter: 'logout.spec.js' },
    'validations': { title: 'Validations Module', filter: 'validations.spec.js' },
    'forgotPassword': { title: 'Forgot Password Module', filter: 'forgotPassword.spec.js' },
    'changePassword': { title: 'Change Password Module', filter: 'changePassword.spec.js' },
    'dashboard': { title: 'Dashboard Module', filter: 'dashboard.spec.js' },
    'pim': { title: 'PIM Module', filter: 'pim.spec.js' },
    'admin': { title: 'Admin Module', filter: 'admin.spec.js' },
    'leave': { title: 'Leave Module', filter: 'leave.spec.js' },
    'recruitment': { title: 'Recruitment Module', filter: 'recruitment.spec.js' },
    'myinfo': { title: 'My Info Module', filter: 'myinfo.spec.js' },
    'buzz': { title: 'Buzz Module', filter: 'buzz.spec.js' },
    'time': { title: 'Time Module', filter: 'time.spec.js' },
    'directory': { title: 'Directory Module', filter: 'directory.spec.js' }
  };

  // Ensure clean staging directory
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  ensureDirectoryExists(stagingDir);
  
  const stagingHtmlDir = path.join(stagingDir, 'HTMLReports');
  const stagingTestCasesDir = path.join(stagingDir, 'TestCases');
  const stagingCsvDir = path.join(stagingTestCasesDir, 'CSV');
  const stagingXlsxDir = path.join(stagingTestCasesDir, 'XLSX');
  
  ensureDirectoryExists(stagingHtmlDir);
  ensureDirectoryExists(stagingTestCasesDir);
  ensureDirectoryExists(stagingCsvDir);
  ensureDirectoryExists(stagingXlsxDir);

  // 1. Generate Separate Reports for each Module
  for (const [key, mod] of Object.entries(modules)) {
    const modCases = enrichedTestCases.filter(tc => tc.specFile === mod.filter);
    if (modCases.length === 0) continue;
    
    // Stats calculation
    const total = modCases.length;
    const passed = modCases.filter(c => c.status === 'PASSED').length;
    const failed = modCases.filter(c => c.status === 'FAILED').length;
    const skipped = modCases.filter(c => c.status === 'SKIPPED').length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    
    const modStats = { total, passed, failed, skipped, passRate };

    // HTML report
    const htmlContent = generateHtmlContent(`OrangeHRM - ${mod.title}`, modStats, modCases, timestamp);
    const htmlPath = path.join(htmlReportDir, `${key}_ExecutionReport.html`);
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    fs.copyFileSync(htmlPath, path.join(stagingHtmlDir, `${key}_ExecutionReport.html`));
    console.log(`✅ Generated separate HTML Report for ${mod.title}`);

    // CSV report
    const csvPath = path.join(csvDir, `${key}_TestCases.csv`);
    writeCsvReport(csvPath, modCases);
    fs.copyFileSync(csvPath, path.join(stagingCsvDir, `${key}_TestCases.csv`));
    console.log(`✅ Generated separate CSV TestCases for ${mod.title}`);

    // Excel report
    const xlsxPath = path.join(xlsxDir, `${key}_TestCases.xlsx`);
    await writeXlsxReport(xlsxPath, mod.title, modCases);
    fs.copyFileSync(xlsxPath, path.join(stagingXlsxDir, `${key}_TestCases.xlsx`));
    console.log(`✅ Generated separate XLSX TestCases for ${mod.title}`);
  }

  // 2. Generate Consolidated/Master Reports
  const total = enrichedTestCases.length;
  const passed = enrichedTestCases.filter(c => c.status === 'PASSED').length;
  const failed = enrichedTestCases.filter(c => c.status === 'FAILED').length;
  const skipped = enrichedTestCases.filter(c => c.status === 'SKIPPED').length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  const masterStats = { total, passed, failed, skipped, passRate };

  const masterHtmlContent = generateHtmlContent('OrangeHRM - Consolidated Execution Report', masterStats, enrichedTestCases, timestamp);
  const masterHtmlPath = path.join(htmlReportDir, 'ExecutionReport.html');
  fs.writeFileSync(masterHtmlPath, masterHtmlContent, 'utf-8');
  fs.copyFileSync(masterHtmlPath, path.join(stagingDir, 'ExecutionReport.html'));
  console.log(`✅ Generated Master Consolidated HTML Report`);

  const masterCsvPath = path.join(csvDir, 'OrangeHRM_TestCases.csv');
  writeCsvReport(masterCsvPath, enrichedTestCases);
  fs.copyFileSync(masterCsvPath, path.join(stagingCsvDir, 'OrangeHRM_TestCases.csv'));
  console.log(`✅ Generated Consolidated CSV TestCases`);

  const masterXlsxPath = path.join(xlsxDir, 'OrangeHRM_TestCases.xlsx');
  await writeXlsxReport(masterXlsxPath, 'OrangeHRM Test Cases', enrichedTestCases);
  fs.copyFileSync(masterXlsxPath, path.join(stagingXlsxDir, 'OrangeHRM_TestCases.xlsx'));
  console.log(`✅ Generated Consolidated XLSX TestCases`);

  // 3. Copy Playwright standard HTML report if it exists
  const playwrightReportSource = path.join(htmlReportDir, 'playwright-report');
  if (fs.existsSync(playwrightReportSource)) {
    const playwrightStagingDest = path.join(stagingDir, 'playwright-report');
    ensureDirectoryExists(playwrightStagingDest);
    
    const copyRecursive = (src, dest) => {
      const list = fs.readdirSync(src);
      list.forEach(item => {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        if (fs.statSync(srcPath).isDirectory()) {
          ensureDirectoryExists(destPath);
          copyRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      });
    };
    copyRecursive(playwrightReportSource, playwrightStagingDest);
    console.log('📁 Included Playwright standard HTML report in staging.');
  }

  // 4. Compress everything in staging using PowerShell
  try {
    if (fs.existsSync(zipOutputPath)) {
      fs.unlinkSync(zipOutputPath);
    }
    console.log(`🤐 Packaging all separate reports to ${zipOutputPath}...`);
    // Wait 2 seconds for Windows file system / antivirus handles to release locks
    await new Promise(resolve => setTimeout(resolve, 2000));
    execSync(`powershell -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipOutputPath}' -Force"`);
    console.log(`✅ Successfully created ${zipOutputPath} archive!`);
  } catch (error) {
    console.error('❌ Failed to compress report files:', error.message);
  } finally {
    // Cleanup staging
    try {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = async function globalTeardown(config) {
  await run().catch(console.error);
};
