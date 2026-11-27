#!/usr/bin/env node
/**
 * generateQAReport.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds an evidence-based QA execution report (XLSX + CSV + HTML) from the
 * Playwright JSON results of the LAST COMPLETED run, enriched with test intent
 * (steps / expected results / test data) parsed from the spec sources.
 *
 * Ground truth for status and actual behaviour is Results/Reports/JSON/results.json
 * (every attempt, error, stdout/stderr and attachment). Nothing is assumed:
 *   - PASS      : Playwright outcome "expected" or "flaky" (passed in at least one attempt)
 *   - FAIL      : Playwright outcome "unexpected"
 *   - BLOCKED   : not executed because an earlier test in the same serial group failed
 *   - SKIPPED   : not executed because the test called test.skip() (reason recorded)
 * A PASS whose assertions cannot fail (e.g. expect(locator).toBeDefined()) or are
 * conditional is reported with Actual Result "Not Verified".
 *
 * It UPDATES the existing report files in place (same folders, same file names):
 *   Results/TestCases/CSV/<module>_TestCases.csv   + OrangeHRM_TestCases.csv
 *   Results/TestCases/XLSX/<module>_TestCases.xlsx + OrangeHRM_TestCases.xlsx
 *   Results/Reports/HTML/<module>_ExecutionReport.html + ExecutionReport.html
 *   Results/Reports/HTML/Report.zip – only with --zip (off by default: the bundle can exceed
 *   GitHub's 100 MB file limit)
 * Tests, page objects and config are never modified. No file is deleted.
 *
 * Runs automatically after `npx playwright test` (utils/qaReportReporter.js), or manually.
 * Usage:  node utils/generateQAReport.js [--json <results.json>] [--out <Results dir>] [--old-xlsx <file>] [--zip]
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const argVal = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : def;
};
const JSON_PATH = argVal('--json', path.join(ROOT, 'Results/Reports/JSON/results.json'));
const RESULTS_DIR = argVal('--out', path.join(ROOT, 'Results'));
const CSV_DIR = path.join(RESULTS_DIR, 'TestCases/CSV');
const XLSX_DIR = path.join(RESULTS_DIR, 'TestCases/XLSX');
const HTML_DIR = path.join(RESULTS_DIR, 'Reports/HTML');
const MAKE_ZIP = argv.includes('--zip');
const OLD_XLSX = argVal('--old-xlsx', path.join(XLSX_DIR, 'OrangeHRM_TestCases.xlsx'));
const TEST_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'test-data/testData.json'), 'utf8'));
const BASE_URL = 'https://opensource-demo.orangehrmlive.com';

// Same module keys / titles / order as utils/zipReports.js (file names depend on the key)
const MODULE_FILES = [
  ['login', 'Login'], ['logout', 'Logout'], ['validations', 'Validations'], ['forgotPassword', 'Forgot Password'],
  ['changePassword', 'Change Password'], ['dashboard', 'Dashboard'], ['pim', 'PIM'], ['admin', 'Admin'],
  ['leave', 'Leave'], ['recruitment', 'Recruitment'], ['myinfo', 'My Info'], ['buzz', 'Buzz'],
  ['time', 'Time'], ['directory', 'Directory'],
];
const MODULE_NAMES = Object.fromEntries(MODULE_FILES.map(([k, t]) => [`${k}.spec.js`, t]));

// ── Run-specific manual evidence review notes ────────────────────────────────
// Written after a human review of screenshots / stdout / stderr of ONE specific run.
// They are applied only when results.json belongs to that run (matched by start time).
const REVIEWED_RUN_START = '2026-08-14T12:11:25.459Z';
const REVIEWS = {}; // { [run startTime]: { notes: {id: text}, categories: {id: failureCategory} } }
REVIEWS[REVIEWED_RUN_START] = { notes: {
  TC_PASSWORD_02:
    "Reviewer note (evidence review): the attempt-1 failure screenshot shows the 'Required' and 'Passwords do not match' messages on screen. " +
    'The test counts the messages with locator.count() immediately after clicking Save; count() does not auto-wait, so the check ran before the messages rendered. ' +
    'This is a test synchronisation issue, not an application defect.',
  TC_LEAVE_01:
    "Reviewer note (evidence review): (1) the beforeAll setup that assigns a 15-day leave entitlement failed with a login-page timeout (stderr), and the spec's try/catch let the tests continue; " +
    "(2) on the retry the My Leave list returned 'No Records Found' for the requested dates (stdout + screenshot). " +
    'The submitted leave request was therefore not visible in the application. Whether the submission was rejected for lack of leave balance cannot be confirmed from the saved evidence; open the retry trace.zip to confirm.',
}, categories: {} };

REVIEWS['2026-11-26T06:52:06.615Z'] = {
  notes: {
    // Source: attempt-1 trace network log + failure screenshots of both attempts
    TC_LEAVE_01: {
      actual: "Leave request was not created. The server rejected the submission (HTTP 400) and the My Leave list showed 'No Records Found' on both attempts (leave status = empty).",
      reason: 'Test data issue – the application behaved correctly. The test assigns leave only for 2026 but applies for January 2027, and it types dates as yyyy-mm-dd while the demo site uses yyyy-dd-mm, so the dates were read as 1 May – 1 June 2027, for which the employee has no leave balance.',
    },
    // Source: attempt-1 failure screenshot
    TC_BUZZ_01: { append: "On attempt 1 the Buzz feed was empty ('No Posts Available') on the shared demo site." },
  },
  categories: { TC_LEAVE_01: 'Test script / data defect (app behaved correctly)' },
};

// ════════════════════════════════════════════════════════════════════════════
// 1. Source parsing helpers (string/comment aware)
// ════════════════════════════════════════════════════════════════════════════
function skipString(src, i) {
  const q = src[i];
  i++;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (q === '`' && c === '$' && src[i + 1] === '{') { const end = matchBracket(src, i + 1); i = end < 0 ? src.length : end + 1; continue; }
    if (c === q) return i + 1;
    i++;
  }
  return i;
}

function matchBracket(src, open) {
  let depth = 0;
  for (let i = open; i < src.length;) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(src, i); continue; }
    if (c === '/' && src[i + 1] === '/') { const j = src.indexOf('\n', i); if (j < 0) return -1; i = j; continue; }
    if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i); if (j < 0) return -1; i = j + 2; continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

function bodyAfterArrow(src, fromIdx) {
  const arrow = src.indexOf('=>', fromIdx);
  if (arrow < 0) return null;
  const brace = src.indexOf('{', arrow);
  if (brace < 0 || brace - arrow > 6) return null;
  const end = matchBracket(src, brace);
  if (end < 0) return null;
  return src.substring(brace + 1, end);
}

/** Splits code into statements; tracks whether each statement sits inside an if/else block. */
function splitStatements(code) {
  const out = [];
  const blockStack = []; // 'cond' | 'plain'
  let cur = '';
  let paren = 0;
  const push = () => {
    const t = cur.trim();
    if (t) out.push({ text: t, cond: blockStack.includes('cond') });
    cur = '';
  };
  for (let i = 0; i < code.length;) {
    const c = code[i];
    if (c === '"' || c === "'" || c === '`') { const j = skipString(code, i); cur += code.slice(i, j); i = j; continue; }
    if (c === '/' && code[i + 1] === '/') { const j = code.indexOf('\n', i); i = j < 0 ? code.length : j; continue; }
    if (c === '/' && code[i + 1] === '*') { const j = code.indexOf('*/', i); i = j < 0 ? code.length : j + 2; continue; }
    if (c === '(' || c === '[') paren++;
    if (c === ')' || c === ']') paren--;
    if (paren <= 0 && c === '{') {
      // object literal / destructuring on the same statement → keep inline
      if (/(=|\(|,|return)\s*$/.test(cur) || /^(const|let|var)\s*$/.test(cur.trim())) {
        const end = matchBracket(code, i);
        cur += code.slice(i, end + 1); i = end + 1; continue;
      }
      const head = cur.trim();
      blockStack.push(/^(\}\s*)?(if|else)\b/.test(head) ? 'cond' : 'plain');
      cur = ''; i++; continue;
    }
    if (paren <= 0 && c === '}') { push(); blockStack.pop(); i++; continue; }
    if (paren <= 0 && (c === ';' || c === '\n')) { push(); i++; continue; }
    cur += c; i++;
  }
  push();
  return out;
}

function splitArgs(argsRaw) {
  const args = [];
  let depth = 0, start = 0;
  for (let i = 0; i < argsRaw.length; i++) {
    const c = argsRaw[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(argsRaw, i) - 1; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) { args.push(argsRaw.slice(start, i).trim()); start = i + 1; }
  }
  const last = argsRaw.slice(start).trim();
  if (last) args.push(last);
  return args;
}

const strLiteral = s => { const m = (s || '').trim().match(/^(['"`])([\s\S]*)\1$/); return m && !m[2].includes('${') ? m[2] : null; };
const humanize = raw => (raw || '').replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').toLowerCase().trim();
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const browserName = b => ({ chromium: 'Chromium', firefox: 'Firefox', webkit: 'WebKit' }[b] || cap(b));
// "1 test case(s) were" → "1 test case was", "3 check(s)" → "3 checks"
const grammar = s => String(s).replace(/\b(\d+)((?:\s+[A-Za-z]+)*?)\s+(test case|check|failure)\(s\)(\s+(?:were|are|need|cannot|have))?/g, (m, n, mid, noun, verb) => {
  const one = Number(n) === 1;
  let v = verb || '';
  if (one) v = v.replace('were', 'was').replace(/\bare\b/, 'is').replace('need', 'needs').replace('have', 'has');
  return `${n}${mid}${' ' + noun}${one ? '' : 's'}${v}`;
});
const resolveTestData = p => p.split('.').slice(1).reduce((o, k) => (o == null ? undefined : o[k]), TEST_DATA);

const KNOWN_LABELS = {
  usernameInput: 'Username field', passwordInput: 'Password field', loginButton: 'Login button',
  errorAlert: 'error alert message', forgotPasswordLink: "'Forgot your password?' link", credentialHintBox: 'credential hint box',
  copyrightText: 'copyright footer text', orangeHrmLogo: 'OrangeHRM logo', loginTitle: 'Login title',
  resetUsernameInput: 'reset-password username field', resetButton: 'Reset Password button', cancelButton: 'Cancel button',
  resetSuccessTitle: 'reset success heading', saveButton: 'Save button', searchButton: 'Search button', addButton: 'Add button',
  applyButton: 'Apply button', applyTab: 'Apply tab', myLeaveTab: 'My Leave tab', fromDateInput: 'From Date field',
  toDateInput: 'To Date field', commentsTextarea: 'Comments field', leaveTypeDropdown: 'Leave Type dropdown',
  employeeNameInput: 'Employee Name field', jobTitleDropdown: 'Job Title dropdown', locationDropdown: 'Location dropdown',
  employeeCards: 'employee cards', noRecordsMessage: "'No Records Found' message", autocompleteOption: 'autocomplete suggestion',
  sidebarToggle: 'sidebar collapse toggle', sidebar: 'sidebar navigation panel', searchInput: 'sidebar search field',
  widgets: 'dashboard widgets', timeAtWorkWidget: "'Time at Work' widget", myActionsWidget: "'My Actions' widget",
  quickLaunchWidget: "'Quick Launch' widget", buzzWidget: "'Buzz Latest Posts' widget", employeesOnLeaveWidget: "'Employees on Leave Today' widget",
  userDropdown: 'user profile dropdown', userDropdownName: 'logged-in user name', logoutLink: 'Logout link', aboutLink: 'About link',
  supportLink: 'Support link', changePasswordLink: 'Change Password link', headerBreadcrumb: 'page header breadcrumb',
  firstRowUsername: 'first result row username', firstRowRole: 'first result row user role', editButton: 'Edit button',
  userRoleDropdown: 'User Role dropdown',
};

const KNOWN_CLASSES = {
  'oxd-input-group__message': 'field validation message', 'oxd-alert-content-text': 'alert message',
  'oxd-userdropdown-name': 'logged-in user name', 'oxd-button--ghost': 'secondary (ghost-style) button', 'oxd-topbar-header-breadcrumb': 'page header breadcrumb',
};

function locatorLabel(expr) {
  if (!expr) return null;
  let m = expr.match(/hasText:\s*['"`]([^'"`]+)['"`]/); if (m) return `'${m[1]}' element`;
  m = expr.match(/button\[type=\\?["']submit/); if (m) return 'submit (Save/Login) button';
  for (const [cls, label] of Object.entries(KNOWN_CLASSES)) if (expr.includes(`.${cls}`)) return label;
  m = expr.match(/has-text\(\\?["']([^"'\\]+)\\?["']\)/); if (m) return `'${m[1]}' element`;
  m = expr.match(/getBy(?:Role)\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{\s*name:\s*['"`]([^'"`]+)/); if (m) return `'${m[2]}' ${m[1]}`;
  m = expr.match(/getBy(?:Text|Label|Placeholder|TestId)\(\s*['"`]([^'"`]+)/); if (m) return `'${m[1]}' element`;
  m = expr.match(/\[placeholder=["']([^"']+)["']\s*\]/); if (m) return `'${m[1]}' field`;
  m = expr.match(/\[name=["']([^"']+)["']\s*\]/); if (m) return `${humanize(m[1])} field`;
  m = expr.match(/\[type=["']([^"']+)["']\s*\]/); if (m && /input/.test(expr)) return `${m[1]} input`;
  m = expr.match(/text=([^'"`)]+)/); if (m) return `'${m[1].trim()}' element`;
  m = expr.match(/locator\(\s*['"`]([^'"`]+)['"`]/);
  if (m) {
    const sel = m[1].split(',')[0].trim();
    const cls = sel.match(/\.([a-zA-Z][\w-]*)(?!.*\.[a-zA-Z])/);
    const name = cls ? cls[1].replace(/^(oxd|orangehrm)-/, '').replace(/_+|-/g, ' ') : sel.replace(/[^\w\s-]/g, ' ').trim();
    return `${name.replace(/\s+/g, ' ')} element`;
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// 2. Per-spec context (setup, serial mode, describe-level variables)
// ════════════════════════════════════════════════════════════════════════════
const specCache = {};
function loadSpec(file) {
  if (specCache[file]) return specCache[file];
  const src = fs.readFileSync(path.join(ROOT, 'tests', file), 'utf8');
  const lines = src.split(/\r?\n/);
  const lineStart = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineStart.push(i + 1);

  const beIdx = src.search(/test\.beforeEach\(/);
  const baIdx = src.search(/test\.beforeAll\(/);
  const beforeEach = beIdx >= 0 ? bodyAfterArrow(src, beIdx) || '' : '';
  const beforeAll = baIdx >= 0 ? bodyAfterArrow(src, baIdx) || '' : '';
  const serial = /test\.describe\.serial\(|mode:\s*['"]serial['"]/.test(src);

  // describe-level variables (2-space indent inside describe)
  const describeVars = {};
  const re = /^ {2}(?:const|let)\s+([^=;]+?)\s*(?:=\s*([^;]+))?;/gm;
  let m;
  while ((m = re.exec(src))) {
    const names = m[1].split(',').map(s => s.trim()).filter(n => /^\w+$/.test(n));
    names.forEach(n => {
      let desc;
      const rhs = (m[2] || '').trim();
      if (!rhs) desc = 'computed at run time in beforeAll';
      else if (/Math\.random/.test(rhs)) desc = /100000.*900000/.test(rhs) ? 'random 6-digit number generated at run time' : 'random value generated at run time';
      else desc = rhs.replace(/`/g, '').replace(/\$\{\s*([\w.]+)(?:\.substring\([^)]*\))?\s*\}/g, '<$1>');
      describeVars[n] = { rhs, desc };
    });
  }
  const ctx = { file, src, lines, lineStart, beforeEach, beforeAll, serial, describeVars };
  specCache[file] = ctx;
  return ctx;
}

function findTestBody(ctx, line, id) {
  for (const off of [0, 1, -1, 2, -2, 3]) {
    const ln = line - 1 + off;
    if (ln < 0 || ln >= ctx.lines.length) continue;
    const col = ctx.lines[ln].indexOf(id + ':');
    if (col >= 0) return { body: bodyAfterArrow(ctx.src, ctx.lineStart[ln] + col), actualLine: ln + 1 };
  }
  return { body: null, actualLine: line };
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Steps / expected results / test data derivation
// ════════════════════════════════════════════════════════════════════════════
function buildVarInfo(statements) {
  const labels = {}; const locVars = new Set(); const dataVars = {}; const literalVars = {}; const boolOwner = {};
  for (const { text } of statements) {
    let m = text.match(/^(?:const|let|var)\s+\{([^}]+)\}\s*=\s*(testData(?:\.\w+)+)/);
    if (m) { m[1].split(',').map(s => s.trim().split(':')[0].trim()).forEach(k => { dataVars[k] = `${m[2]}.${k}`; }); continue; }
    m = text.match(/^(?:const|let|var)\s+(\w+)\s*=\s*([\s\S]+)$/);
    if (!m) continue;
    const [, name, rhsRaw] = m;
    const rhs = rhsRaw.replace(/^await\s+/, '');
    if (/^testData(\.\w+)+$/.test(rhs)) { dataVars[name] = rhs; continue; }
    if (strLiteral(rhs) !== null || /^-?\d+(\.\d+)?$/.test(rhs)) { literalVars[name] = strLiteral(rhs) !== null ? strLiteral(rhs) : rhs; continue; }
    if (/^'[^']*'\.repeat\(\d+\)$|^"[^"]*"\.repeat\(\d+\)$/.test(rhs)) { const r = rhs.match(/^['"]([^'"]*)['"]\.repeat\((\d+)\)/); literalVars[name] = `'${r[1]}' repeated ${r[2]} times`; continue; }
    let g;
    if ((g = rhs.match(/^(\w+)Page\.(is|has)(\w+)\(/))) boolOwner[name] = `${humanize(g[1])} page`;
    if ((g = rhs.match(/^page\.title\(\)/))) labels[name] = 'page title';
    else if ((g = rhs.match(/^page\.url\(\)/))) labels[name] = 'page URL';
    else if ((g = rhs.match(/^([\w.]+)\.getAttribute\(\s*['"`]([^'"`]+)/))) labels[name] = `'${g[2]}' attribute of the ${targetLabel(g[1], labels)}`;
    else if ((g = rhs.match(/^([\s\S]+?)\.count\(\)/))) labels[name] = `number of ${plural(targetLabel(g[1], labels))}`;
    else if ((g = rhs.match(/^([\s\S]+?)\.(textContent|innerText|allTextContents|allInnerTexts)\(\)/))) labels[name] = `text of the ${targetLabel(g[1], labels)}`;
    else if ((g = rhs.match(/^([\s\S]+?)\.inputValue\(\)/))) labels[name] = `value of the ${targetLabel(g[1], labels)}`;
    else if ((g = rhs.match(/^([\s\S]+?)\.isVisible\(\)/))) labels[name] = `visibility of the ${targetLabel(g[1], labels)}`;
    else if ((g = rhs.match(/^([\s\S]+?)\.(isEnabled|isDisabled|isChecked|isEditable)\(\)/))) labels[name] = `${humanize(g[2].replace(/^is/, ''))} state of the ${targetLabel(g[1], labels)}`;
    else if ((g = rhs.match(/^([\s\S]+?)\.evaluate\(/))) labels[name] = `computed value read from the ${targetLabel(g[1], labels)}`;
    else if ((g = rhs.match(/^page\.context\(\)\.cookies\(/))) labels[name] = 'browser cookies';
    else if ((g = rhs.match(/^\w+Page\.(?:get|fetch|read)(\w+)\(/))) labels[name] = humanize(g[1]);
    else if ((g = rhs.match(/^\w+Page\.(is|has)(\w+)\(/))) labels[name] = `${humanize(g[1] + g[2])} flag`;
    else if (/locator\(|getBy(Text|Role|Label|Placeholder|TestId)\(/.test(rhs)) { labels[name] = locatorLabel(rhs) || humanize(name); locVars.add(name); }
    else if ((g = rhs.match(/^(\w+Page)\.(\w+)$/)) || (g = rhs.match(/^(\w+Page)\.(\w+)\.(first|last|nth)\(/))) { labels[name] = KNOWN_LABELS[g[2]] || humanize(g[2]); locVars.add(name); }
  }
  return { labels, locVars, dataVars, literalVars, boolOwner };
}

function targetLabel(expr, labels) {
  let e = (expr || '').trim().replace(/^await\s+/, '');
  if (/^page\.url\(\)$/.test(e)) return 'page URL';
  if (/^page\.title\(\)$/.test(e)) return 'page title';
  let prefix = '';
  if (/\.nth\(\s*[a-zA-Z_]\w*\s*\)$/.test(e)) prefix = 'each ';
  for (let prev = null; prev !== e;) { prev = e; e = e.replace(/\.filter\(\{[^}]*\}\)$/, '').replace(/\.(first|last)\(\)$/, '').replace(/\.nth\([^)]*\)$/, ''); }
  if (/locator\(|getBy(Text|Role|Label|Placeholder|TestId)\(/.test(e)) return prefix + (locatorLabel(e) || 'targeted element');
  const last = (e.match(/(\w+)$/) || [])[1] || e;
  return prefix + ((labels && labels[last]) || KNOWN_LABELS[last] || humanize(last) || 'target');
}
const plural = label => label.replace(/\s+element$/, '') + ' elements';

function describeExpectTarget(expr, info) {
  let e = expr.trim().replace(/^await\s+/, '');
  const suffix = [];
  e = e.replace(/\.trim\(\)/g, '').replace(/\.toLowerCase\(\)/g, () => { suffix.push('(case-insensitive)'); return ''; });
  let m;
  if ((m = e.match(/^([\s\S]+?)\.count\(\)$/))) return `The number of ${plural(targetLabel(m[1], info.labels))}`;
  if ((m = e.match(/^([\s\S]+?)\.length$/))) return `The number of ${targetLabel(m[1], info.labels)}`;
  if ((m = e.match(/^([\w.]+)\.getAttribute\(\s*['"`]([^'"`]+)/))) return `The '${m[2]}' attribute of the ${targetLabel(m[1], info.labels)}`;
  if (/^page\.url\(\)$/.test(e)) return 'The page URL';
  if (/^page\.title\(\)$/.test(e)) return 'The page title';
  if (/^\w+$/.test(e) && info.dataVars[e]) return `The ${humanize(e)}`;
  if (/===|!==|\|\||&&|\s[<>]=?\s/.test(e)) return `The expression (${e.replace(/\s+/g, ' ')})`;
  const lbl = targetLabel(e, info.labels);
  return `${lbl.startsWith('each ') ? cap(lbl) : 'The ' + lbl}${suffix.length ? ' ' + suffix[0] : ''}`;
}

function formatValue(raw, info, ctx) {
  const v = (raw || '').trim();
  if (!v) return '';
  const s = strLiteral(v);
  if (s !== null) return `'${s}'`;
  let m = v.match(/^\/(.*)\/([a-z]*)$/);
  if (m) {
    const alts = m[1].split('|');
    return alts.length > 1 && alts.every(a => /^[\w\s'.-]+$/.test(a)) ? `one of: ${alts.map(a => `'${a}'`).join(', ')}` : `text matching /${m[1]}/${m[2]}`;
  }
  if (/^-?\d+(\.\d+)?$/.test(v) || /^(true|false|null)$/.test(v)) return v;
  if (/^testData(\.\w+)+$/.test(v)) return `'${resolveTestData(v)}'`;
  if (/^\w+$/.test(v) && info.dataVars[v]) return `'${resolveTestData(info.dataVars[v])}'`;
  if (/^\w+$/.test(v) && info.literalVars && info.literalVars[v] !== undefined) return /repeated/.test(info.literalVars[v]) ? info.literalVars[v] : `'${info.literalVars[v]}'`;
  if (/^\w+$/.test(v) && ctx.describeVars[v]) {
    const desc = ctx.describeVars[v].desc.replace(/<(\w+)>/g, (m0, n) => (ctx.describeVars[n] && /random/.test(ctx.describeVars[n].desc) ? '<random number>' : `<${humanize(n)}>`));
    return `the generated ${humanize(v).replace(/^test /, '')} (${desc})`;
  }
  if (/^\[.*\]$/s.test(v)) return v.replace(/\s+/g, ' ');
  return `(${v.replace(/[A-Za-z_]\w*/g, id => humanize(id)).replace(/\s+/g, ' ')})`;
}

const MATCHERS = {
  toBe: (t, n, v) => `${t} should ${n}equal ${v}`,
  toEqual: (t, n, v) => `${t} should ${n}equal ${v}`,
  toStrictEqual: (t, n, v) => `${t} should ${n}equal ${v}`,
  toContain: (t, n, v) => `${t} should ${n}contain ${v}`,
  toMatch: (t, n, v) => `${t} should ${n}match ${v}`,
  toContainText: (t, n, v) => `${t} should ${n}contain the text ${v}`,
  toHaveText: (t, n, v) => `${t} should ${n}show ${/^the generated/.test(v) ? v : `the text ${v}`}`,
  toHaveValue: (t, n, v) => `${t} should ${n}have the value ${v}`,
  toHaveAttribute: (t, n, v) => `${t} should ${n}have the attribute ${v}`,
  toHaveClass: (t, n, v) => `${t} should ${n}have a CSS class matching ${v.replace(/^text matching /, '')}`,
  toHaveCSS: (t, n, v) => `${t} should ${n}have the CSS property ${v}`,
  toHaveURL: (t, n, v) => `The browser URL should ${n}match ${v}`,
  toHaveTitle: (t, n, v) => `The page title should ${n}match ${v}`,
  toHaveCount: (t, n, v) => (v === '0' ? `${t} should not be shown` : v === '1' ? `${t} should appear exactly once` : `${t} should appear exactly ${v} times`),
  toBeVisible: (t, n) => `${t} should ${n}be visible`,
  toBeHidden: (t, n) => `${t} should ${n}be hidden`,
  toBeEnabled: (t, n) => `${t} should ${n}be enabled`,
  toBeDisabled: (t, n) => `${t} should ${n}be disabled`,
  toBeEditable: (t, n) => `${t} should ${n}be editable`,
  toBeFocused: (t, n) => `${t} should ${n}have keyboard focus`,
  toBeChecked: (t, n) => `${t} should ${n}be checked`,
  toBeAttached: (t, n) => `${t} should ${n}be present in the page`,
  toBeEmpty: (t, n) => `${t} should ${n}be empty`,
  toBeDefined: (t, n) => `${t} should ${n}be defined`,
  toBeUndefined: (t, n) => `${t} should ${n}be undefined`,
  toBeNull: (t, n) => (n ? `${t} should be shown (not empty)` : `${t} should be empty`),
  toBeTruthy: (t, n) => `${t} should ${n}be true / present`,
  toBeFalsy: (t, n) => `${t} should ${n}be false / absent`,
  toBeGreaterThan: (t, n, v) => `${t} should be greater than ${v}`,
  toBeGreaterThanOrEqual: (t, n, v) => `${t} should be at least ${v}`,
  toBeLessThan: (t, n, v) => `${t} should be less than ${v}`,
  toBeLessThanOrEqual: (t, n, v) => `${t} should be at most ${v}`,
};

/** Returns [{sentence, weak, weakReason, cond}] for each expect() in the statements. */
function analyseAssertions(statements, info, ctx) {
  const out = [];
  for (const st of statements) {
    const text = st.text;
    const idx = text.search(/\bexpect(\.soft)?\(/);
    if (idx < 0) continue;
    const open = text.indexOf('(', idx);
    const close = matchBracket(text, open);
    if (close < 0) continue;
    const targetArgs = splitArgs(text.slice(open + 1, close));
    const target = targetArgs[0] || '';
    const rest = text.slice(close + 1);
    const mm = rest.match(/^\s*(\.not)?\s*\.\s*(to\w+)\(/);
    if (!mm) continue;
    const negated = !!mm[1];
    const matcher = mm[2];
    const mOpen = rest.indexOf('(', rest.indexOf(matcher));
    const mClose = matchBracket(rest, mOpen);
    const mArgs = splitArgs(rest.slice(mOpen + 1, mClose < 0 ? rest.length : mClose));
    const value = mArgs[0] || '';

    // effectiveness
    let weakReason = null;
    const bareTarget = target.replace(/^await\s+/, '').trim();
    const isLocatorTarget = /locator\(|getBy\w+\(/.test(bareTarget) && !/\.(count|textContent|innerText|getAttribute|isVisible|inputValue|evaluate)\(/.test(bareTarget)
      || info.locVars.has(bareTarget) || /^\w+Page\.\w+$/.test(bareTarget);
    if (matcher === 'toBeDefined' && !negated) weakReason = 'toBeDefined() passes for any value except undefined (a Locator, string, null or boolean is always "defined")';
    else if (/\|\|\s*['"`]/.test(target)) weakReason = "the asserted value has a hard-coded fallback (value || 'literal'), so it can never be empty";
    else if (matcher === 'toBeGreaterThanOrEqual' && value.trim() === '0') weakReason = 'a count is always >= 0';
    else if ((matcher === 'toBeTruthy' || matcher === 'toBeDefined') && isLocatorTarget) weakReason = 'a Locator object is always truthy; it does not check that the element exists';
    else if (/^expect\(\s*(true|1)\s*\)/.test(text.slice(idx))) weakReason = 'asserts a literal constant';

    let sentence;
    const lit = value.trim().toLowerCase();
    const boolName = (bareTarget.match(/^(?:is|has)([A-Z]\w*)$/) || [])[1];
    if ((matcher === 'toBe' || matcher === 'toEqual') && (lit === 'true' || lit === 'false') && boolName) {
      const yes = (lit === 'true') !== negated;
      const owner = info.boolOwner[bareTarget] ? ` on the ${info.boolOwner[bareTarget]}` : '';
      sentence = `The '${humanize(bareTarget)}' check${owner} should return ${yes}`;
    } else if (matcher === 'toBeTruthy' && bareTarget === 'matchesAny') {
      const listStmt = statements.find(s => /validStatuses\s*=\s*\[/.test(s.text));
      const vals = listStmt ? (listStmt.text.match(/['"]([^'"]+)['"]/g) || []).map(x => cap(x.slice(1, -1).replace(/\b\w/g, ch => ch.toUpperCase()))) : [];
      sentence = vals.length ? `The leave status should be one of: ${vals.join(', ')}` : 'The status should be one of the accepted values';
    } else if (matcher === 'toBeTruthy' && /^(matches|has|is)\w*/i.test(bareTarget) && !info.labels[bareTarget]) {
      sentence = `The '${humanize(bareTarget)}' check should be true`;
    } else {
      const t = describeExpectTarget(target, info);
      const tpl = MATCHERS[matcher];
      let v = formatValue(value, info, ctx);
      if (matcher === 'toHaveAttribute' && mArgs.length > 1) v = `${formatValue(mArgs[0], info, ctx)} = ${formatValue(mArgs[1], info, ctx)}`;
      if (matcher === 'toHaveCSS' && mArgs.length > 1) v = `${formatValue(mArgs[0], info, ctx)} = ${formatValue(mArgs[1], info, ctx)}`;
      sentence = tpl ? tpl(t, negated ? 'not ' : '', v) : `${t} should ${negated ? 'not ' : ''}satisfy ${matcher}(${value})`;
    }
    out.push({ sentence, weak: !!weakReason, weakReason, cond: st.cond });
  }
  return out;
}

const NAMED_STEPS = [
  [/loginPage\.navigate\(/, () => 'Open the OrangeHRM login page'],
  [/loginPage\.login\(\s*(['"`][^'"`]*['"`])\s*,\s*(['"`][^'"`]*['"`])/, m => `Log in with username ${m[1]} and password ${m[2]}`],
  [/loginPage\.login\(/, () => 'Enter the username and password and click Login'],
  [/loginPage\.loginWithUsernameOnly\(/, () => 'Enter only the username and click Login'],
  [/loginPage\.loginWithPasswordOnly\(/, () => 'Enter only the password and click Login'],
  [/loginPage\.clickLoginButtonWithoutCredentials\(/, () => 'Click Login without entering any credentials'],
  [/loginPage\.clickForgotPassword\(/, () => "Click the 'Forgot your password?' link"],
  [/loginPage\.resetPassword\(/, () => 'Enter the username and submit the password reset request'],
  [/loginPage\.clickCancelOnForgotPassword\(/, () => 'Click Cancel on the Reset Password page'],
  [/dashboardPage\.isLoaded\(/, () => 'Wait for the Dashboard to load'],
  [/dashboardPage\.navigateToModule\(\s*['"]([^'"]+)['"]/, m => `Open the '${m[1]}' module from the side menu`],
  [/dashboardPage\.openUserDropdown\(/, () => 'Open the user profile dropdown'],
  [/dashboardPage\.searchModule\(\s*(['"`][^'"`]*['"`])?/, m => `Type ${m[1] || 'a module name'} into the side-menu search box`],
  [/dashboardPage\.toggleSidebar\(/, () => 'Click the side-menu collapse/expand toggle'],
  [/dashboardPage\.logout\(/, () => 'Open the user dropdown and click Logout'],
  [/dashboardPage\.clickChangePassword\(/, () => 'Open the user dropdown and click Change Password'],
  [/dashboardPage\.clickAbout\(/, () => 'Open the user dropdown and click About'],
  [/\.setViewportSize\(\s*\{\s*width:\s*(\d+)\s*,\s*height:\s*(\d+)/, m => `Resize the browser viewport to ${m[1]}x${m[2]}`],
  [/page\.goBack\(/, () => 'Click the browser Back button'],
  [/page\.goForward\(/, () => 'Click the browser Forward button'],
  [/page\.reload\(/, () => 'Reload the page'],
  [/page\.goto\(\s*['"`]([^'"`]*)['"`]/, m => `Navigate directly to ${m[1].replace(/^\//, BASE_URL + '/')}`],
  [/page\.goto\(/, () => 'Navigate directly to a URL'],
  [/page\.keyboard\.press\(\s*['"`]([^'"`]+)['"`]/, m => `Press the '${m[1]}' key`],
  [/page\.keyboard\.type\(\s*['"`]([^'"`]+)['"`]/, m => `Type '${m[1]}'`],
  [/context\(\)\.clearCookies\(/, () => 'Clear the browser cookies'],
  [/page\.route\(/, () => 'Intercept network requests (route mock)'],
  [/waitForURL\(\s*['"`]([^'"`]+)['"`]/, m => `Wait for navigation to ${m[1]}`],
];
const ACTIONS = { click: 'Click', dblclick: 'Double-click', check: 'Tick', uncheck: 'Untick', hover: 'Hover over', focus: 'Focus', clear: 'Clear', selectOption: 'Select an option in', setInputFiles: 'Upload a file into', tap: 'Tap' };

function describeArgs(argsRaw, info, ctx) {
  return splitArgs(argsRaw).map(a => {
    const s = strLiteral(a);
    if (s !== null) return `'${s}'`;
    if (/^testData(\.\w+)+$/.test(a)) return `'${resolveTestData(a)}'`;
    if (/^\w+$/.test(a) && info.dataVars[a]) return `'${resolveTestData(info.dataVars[a])}'`;
    if (/^\w+$/.test(a) && info.literalVars && info.literalVars[a] !== undefined) return /repeated/.test(info.literalVars[a]) ? info.literalVars[a] : `'${info.literalVars[a]}'`;
    if (a === 'null' || a === 'undefined') return '(none)';
    if (/^\w+$/.test(a)) return `<${humanize(a)}>`;
    const f = a.match(/['"`]([^'"`]+\.(png|jpe?g|gif|pdf|docx?|txt|csv))['"`]/i);
    if (f) return `file '${path.basename(f[1])}'`;
    return '<computed value>';
  }).join(', ');
}

function describeAction(text, info, ctx) {
  if (/\bexpect(\.soft)?\(/.test(text)) return null;
  if (/test\.skip\(/.test(text)) return 'Skip the test if the feature is not available for this user';
  for (const [re, fn] of NAMED_STEPS) { const m = text.match(re); if (m) return fn(m); }
  if (/\.waitFor(Timeout|Selector|LoadState)?\(|console\.(log|error)|\.evaluate\(/.test(text)) return null;

  let m = text.match(/([\w.]+(?:\([^()]*\))?(?:\.\w+\([^()]*\))*)\.fill\(\s*([\s\S]+)\)\s*;?$/);
  if (m) {
    const args = splitArgs(m[2]);
    const val = describeArgs(args[0] || '', info, ctx);
    return `Enter ${val === "''" ? 'an empty value' : val} into the ${targetLabel(m[1].replace(/^await\s+/, ''), info.labels)}`;
  }
  m = text.match(/([\w.]+(?:\([^()]*\))?(?:\.\w+\([^()]*\))*)\.(?:type|pressSequentially)\(\s*([^,)]+)/);
  if (m) return `Type ${describeArgs(m[2], info, ctx)} into the ${targetLabel(m[1].replace(/^await\s+/, ''), info.labels)}`;
  m = text.match(/([\w.]+(?:\([^()]*\))?(?:\.\w+\([^()]*\))*)\.press\(\s*['"`]([^'"`]+)['"`]/);
  if (m) return `Press '${m[2]}' in the ${targetLabel(m[1].replace(/^await\s+/, ''), info.labels)}`;
  m = text.match(/([\w.]+(?:\((?:[^()]|\([^()]*\))*\))?(?:\.\w+\([^()]*\))*)\.(click|dblclick|check|uncheck|hover|focus|clear|selectOption|setInputFiles|tap)\(([^]*)\)\s*;?$/);
  if (m) {
    const verb = ACTIONS[m[2]];
    const tgt = targetLabel(m[1].replace(/^await\s+/, ''), info.labels);
    const extra = m[2] === 'selectOption' || m[2] === 'setInputFiles' ? ` (${describeArgs(m[3], info, ctx)})` : '';
    return `${verb} the ${tgt}${extra}`;
  }
  // generic page-object action
  m = text.match(/(?:await\s+)?(?:(?:const|let)\s+\w+\s*=\s*await\s+)?(\w+Page)\.(\w+)\(([\s\S]*)\)\s*;?$/);
  if (m) {
    const method = m[2];
    const args = describeArgs(m[3], info, ctx);
    if (/^(get|fetch|read)/.test(method)) return `Read the ${humanize(method.replace(/^(get|fetch|read)/, ''))}`;
    if (method === 'isLoaded') return `Wait for the ${humanize(m[1].replace(/Page$/, ''))} page to load`;
    const vis = method.match(/^is(\w+)Visible$/);
    if (vis) return `Check that the '${humanize(vis[1])}' message is shown on the ${humanize(m[1].replace(/Page$/, ''))} page`;
    if (/^(is|has)/.test(method)) return `Check whether the ${humanize(m[1].replace(/Page$/, ''))} page ${humanize(method)}`;
    return `${cap(humanize(method))}${args ? ` (${args})` : ''}`;
  }
  m = text.match(/^(?:const|let)\s+\w+\s*=\s*await\s+([\s\S]+?)\.(getAttribute|textContent|innerText|count|isVisible|inputValue)\(\s*(['"`][^'"`]*['"`])?/);
  if (m) {
    const tgt = targetLabel(m[1], info.labels);
    if (m[2] === 'getAttribute') return `Read the ${m[3] || ''} attribute of the ${tgt}`.replace(/\s+/g, ' ');
    if (m[2] === 'count') return `Count the ${plural(tgt)}`;
    if (m[2] === 'isVisible') return `Check whether the ${tgt} is visible`;
    return `Read the text of the ${tgt}`;
  }
  if (/^(?:const|let)\s+\w+\s*=\s*await\s+page\.title\(\)/.test(text)) return 'Read the page title';
  return null;
}

function deriveSteps(statements, info, ctx) {
  const steps = [];
  for (const st of statements) {
    const s = describeAction(st.text, info, ctx);
    if (s) steps.push(st.cond ? `${s} (only if the condition in the test is met)` : s);
  }
  return steps;
}

function deriveTestData(bodyStatements, info, ctx, body, setupUsesLogin) {
  const items = [];
  const add = s => { if (s && !items.includes(s)) items.push(s); };
  if (setupUsesLogin) add(`Login: ${TEST_DATA.loginCredentials.valid.username} / ${TEST_DATA.loginCredentials.valid.password}`);
  // `info` here is built from the test body only, so destructured setup credentials are not repeated.
  Object.entries(info.dataVars).forEach(([k, p]) => add(`${cap(humanize(k))}: ${resolveTestData(p)}`));
  const refs = body.match(/testData(\.\w+)+/g) || [];
  refs.forEach(r => {
    const v = resolveTestData(r);
    if (v !== undefined && typeof v !== 'object') add(`${cap(humanize(r.split('.').pop()))}: ${v}`);
  });
  Object.entries(info.literalVars || {}).forEach(([k, v]) => add(`${cap(humanize(k))}: ${v === '' ? '(empty)' : v}`));
  for (const { text } of bodyStatements) {
    let m;
    const re = /\.(fill|type|pressSequentially|selectOption)\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;
    while ((m = re.exec(text))) add(`${m[1] === 'selectOption' ? 'Option' : 'Input'}: ${m[3] === '' ? '(empty)' : m[3]}`);
    const pm = text.match(/\w+Page\.(?!navigateToModule|navigate\b|get|is|has)(\w+)\(([\s\S]*)\)\s*;?$/);
    if (pm) splitArgs(pm[2]).forEach(a => { const s = strLiteral(a); if (s !== null) add(`${cap(humanize(pm[1]))} input: ${s === '' ? '(empty)' : s}`); });
    const f = text.match(/setInputFiles\([\s\S]*?['"`]([^'"`]+\.(png|jpe?g|gif|pdf|docx?|txt|csv))['"`]/i) || text.match(/['"`]([^'"`]*test-data[^'"`]+\.\w+)['"`]/);
    if (f) add(`File: ${f[1].replace(/^(\.\.\/)+/, '')}`);
  }
  // describe-level variables used by the test, plus the variables they are built from
  const used = new Set(Object.keys(ctx.describeVars).filter(k => new RegExp(`\\b${k}\\b`).test(body)));
  let grew = true;
  while (grew) {
    grew = false;
    [...used].forEach(k => Object.keys(ctx.describeVars).forEach(dep => {
      if (!used.has(dep) && new RegExp(`\\b${dep}\\b`).test(ctx.describeVars[k].rhs)) { used.add(dep); grew = true; }
    }));
  }
  const randomBase = n => ctx.describeVars[n] && /random/.test(ctx.describeVars[n].desc);
  Object.entries(ctx.describeVars).filter(([k]) => used.has(k)).forEach(([k, v]) => {
    // a random base value (e.g. uniqueId) is shown inside the values built from it, not on its own line
    if (randomBase(k) && [...used].some(o => o !== k && new RegExp(`\\b${k}\\b`).test(ctx.describeVars[o].rhs))) return;
    let desc = /^\w+$/.test(v.rhs) ? `<${v.rhs}>` : v.desc;
    desc = desc.replace(/<(\w+)>/g, (m0, n) => (randomBase(n) ? '<random number>' : `<${humanize(n)}>`));
    if (/computed at run time in beforeAll/.test(desc)) desc = 'calculated at run time';
    else if (/^random/.test(desc)) desc = 'random value generated at run time';
    else desc += ' (generated at run time)';
    add(`${cap(humanize(k))}: ${desc}`);
  });
  return items.length ? items.join('\n') : 'Not applicable (UI check only)';
}

function derivePrecondition(ctx, body) {
  const parts = [];
  const be = ctx.beforeEach;
  if (/loginPage\.login\(/.test(be)) {
    let p = 'User is logged in as Admin';
    const mod = be.match(/navigateToModule\(\s*['"]([^'"]+)['"]/);
    if (/clickChangePassword\(/.test(be)) p += ' and the Change Password page is open';
    else if (mod) p += ` and the ${mod[1]} module is open`;
    parts.push(p + '.');
  } else if (/loginPage\.navigate\(/.test(be)) {
    parts.push(/clickForgotPassword\(/.test(be) ? 'The Reset Password page is open.' : 'The login page is open (user not logged in).');
  }
  if (/leave-entitlements/.test(ctx.beforeAll)) parts.push('A 15-day leave entitlement (year 2026) is assigned to the employee before the tests.');
  if (ctx.serial) parts.push(`Runs in sequence: the earlier ${MODULE_NAMES[ctx.file]} tests must pass first.`);
  const skip = body && body.match(/test\.skip\([^,]+,\s*(['"`])((?:\\.|(?!\1).)*)\1/);
  if (skip) parts.push(`Skipped automatically if: ${skip[2].replace(/\\'/g, "'")}.`);
  return parts.join(' ') || 'None.';
}

// Post condition: the state the application/user is left in after the test, derived from what
// the test code does (saves data, logs out, logs in, or only reads the page).
function derivePostCondition(ctx, body, title, moduleKey, scenario) {
  const t = title.toLowerCase();
  const b = body || '';
  const loggedOutModule = ['login', 'validations', 'forgotPassword', 'logout'].includes(moduleKey);
  const validLogin = (/loginCredentials\.valid\b/.test(b) && /\.login\(/.test(b)) || /\.login\(\s*['"]Admin['"]\s*,\s*['"]admin123['"]/.test(b);
  // data-changing tests
  const dataRules = [
    [/^add new user/, 'The new system user is saved and listed in Admin > User Management.'],
    [/^update user details/, "The test user's updated details are saved."],
    [/^delete existing user and cleanup employee/, 'The test user and its employee record are deleted; no test data is left behind.'],
    [/^add new employee/, 'The new employee record is saved and listed in PIM > Employee List.'],
    [/^update employee information/, "The employee's updated information is saved."],
    [/^delete employee records/, 'The test employee record is deleted from PIM.'],
    [/^add candidate details/, 'The new candidate is saved and listed in Recruitment > Candidates.'],
    [/^update personal details/, 'The updated personal details are saved in My Info.'],
    [/^upload profile image/, "The uploaded image is saved as the employee's profile picture."],
    [/^apply leave request/, 'The leave request is submitted and listed in My Leave.'],
  ];
  for (const [re, text] of dataRules) if (re.test(t)) return text + ' User remains logged in as Admin.';
  if (/createPost\(/.test(b)) {
    return (/script tag/.test(t) ? 'The post is published in the Buzz feed and the script text is shown as plain text (not executed).'
      : 'The new post is published in the Buzz feed.') + ' User remains logged in as Admin.';
  }
  if (/savePersonalDetailsButton\.click\(/.test(b)) return 'The entered value is saved in Personal Details. User remains logged in as Admin.';
  // session changes
  if (/logout\(/i.test(b)) return 'User is logged out and the login page is displayed.';
  if (moduleKey === 'forgotPassword') {
    if (/route\.fulfill/.test(b) && /resetPassword\(/.test(b)) return 'A password reset request is submitted (server response simulated by the test) and the confirmation page is displayed. User is not logged in.';
    if (/resetPassword\(/.test(b)) return 'A password reset request is submitted for the entered username. User is not logged in.';
    if (/clickCancelOnForgotPassword\(|goBack\(/.test(b)) return 'User is not logged in; the login page is displayed.';
    return 'User is not logged in; the Reset Password page stays open.';
  }
  if (loggedOutModule) {
    if (validLogin) return 'User is logged in as Admin and the Dashboard is displayed.';
    return 'User is not logged in; the login page stays open.';
  }
  if (moduleKey === 'changePassword') return 'The password is not changed. User remains logged in as Admin.';
  if (/Negative/.test(scenario) && /validation|error|required|empty|mismatch|invalid email|short/.test(t)) {
    return 'No data is saved; the form shows the validation message. User remains logged in as Admin.';
  }
  return 'No application data is changed. User remains logged in as Admin.';
}

function deriveScenario(module, title) {
  const t = title.toLowerCase();
  let cat;
  if (/\(negative\)/.test(t)) cat = 'Negative / Validation';
  else if (/\(edge case\)/.test(t)) cat = 'Edge Case / Boundary';
  else if (/\(positive\)/.test(t)) cat = 'Positive Functional';
  else if (/xss|sql|inject|script|security|session|cookie|back button|direct url|unauthori|without login|cache/.test(t)) cat = 'Security / Session';
  else if (/mobile|viewport|responsive|resize|tablet/.test(t)) cat = 'Responsive Layout';
  else if (/whitespace|long|special char|boundary|maximum|minimum|max |min |limit|length/.test(t)) cat = 'Edge Case / Boundary';
  else if (/invalid|wrong|error|empty|required|validation|mismatch|non-existent|nonexistent|without|missing|short/.test(t)) cat = 'Negative / Validation';
  else if (/is visible|are visible|visible in|exists|exist |is displayed|displays|is present|placeholder|css|style|attribute|tag name|header|breadcrumb|title|label|icon|layout|logo|hidden by default|has .*button/.test(t)) cat = 'UI Verification';
  else if (/add|create|update|edit|delete|apply|search|filter|reset|upload|save|login|logout|log in|log out|navigate|post|share|like|cancel|select|open|toggle|click/.test(t)) cat = 'Positive Functional';
  else cat = 'UI Verification';
  return cat;
}

// ════════════════════════════════════════════════════════════════════════════
// 4. Result interpretation
// ════════════════════════════════════════════════════════════════════════════
const stripAnsi = s => (s || '').replace(/\x1b\[[0-9;]*m/g, '');
const rel = p => (p ? path.relative(ROOT, p).split(path.sep).join('/') : '');

function classifyError(err) {
  const msg = stripAnsi(err && (err.message || err.value) || '');
  const loc = err && err.location ? `${rel(err.location.file)}:${err.location.line}` : '';
  let m;
  if (/page\.goto: Timeout (\d+)ms exceeded[\s\S]*auth\/login/.test(msg)) {
    return { cat: 'Environment', text: 'the OrangeHRM login page did not finish loading within 30 s (page.goto timeout)', loc };
  }
  if (/waiting for locator\('button\.orangehrm-login-button'\) to be visible/.test(msg)) {
    return { cat: 'Environment', text: 'the login page did not render — the Login button was not visible after 20 s', loc };
  }
  if ((m = msg.match(/locator\.(click|fill|check|hover): Timeout (\d+)ms exceeded[\s\S]*?waiting for (locator\([^\n]*)/))) {
    const ht = m[3].match(/hasText: '([^']+)'/);
    const sel = ht ? `'${ht[1]}'` : (m[3].match(/locator\('([^']+)'\)/) || [])[1] || 'element';
    const stable = /element is visible, enabled and stable/.test(msg);
    return { cat: 'Environment', text: `the ${m[1]} on ${sel} did not complete within ${Number(m[2]) / 1000} s${stable ? ' although the element was visible, enabled and stable (application did not respond in time)' : ''}`, loc };
  }
  if ((m = msg.match(/expect\(locator\)\.(not\.)?(\w+)\(([^)]*)\) failed/))) {
    const locStr = (msg.match(/\n\s*Locator:\s*([^\n]+)/) || [])[1];
    const exp = (msg.match(/\n\s*Expected[^:]*:\s*([^\n]+)/) || [])[1];
    const rec = (msg.match(/\n\s*Received[^:]*:\s*([^\n]+)/) || [])[1] || (msg.match(/\n\s*Error:\s*([^\n]+)/) || [])[1];
    const what = (locStr && locatorLabel(locStr)) || 'expected element';
    const e = exp ? exp.trim() : m[2];
    const notFound = rec && /not found/i.test(rec);
    return { cat: 'Assertion', text: `the ${what} was not ${e === 'visible' ? 'visible' : `as expected (expected: ${e})`}${notFound ? ' – it was not found on the page' : rec ? ` – actual: ${rec.trim()}` : ''}`, loc };
  }
  if ((m = msg.match(/expect\(received\)\.(not\.)?(\w+)\(([^)]*)\)/))) {
    const exp = (msg.match(/\n\s*Expected[^:]*:\s*([^\n]+)/) || [])[1];
    const rec = (msg.match(/\n\s*Received[^:]*:\s*([^\n]+)/) || [])[1];
    const expTxt = exp ? exp.trim() : `${m[1] ? 'not ' : ''}${m[2]}(${m[3]})`.replace('not toBeNull()', 'not null');
    return { cat: 'Assertion', text: `check failed – expected ${expTxt}, but got ${rec ? rec.trim() : 'a different value'}`, loc };
  }
  if (/route\.fulfill: Cannot fulfill with redirect status/.test(msg)) {
    return { cat: 'Test script', text: 'the test simulates the server response with a redirect (HTTP 302), which this browser does not allow in route.fulfill – a test script limitation, not an application defect', loc };
  }
  if ((m = msg.match(/Test timeout of (\d+)ms exceeded/))) return { cat: 'Timeout', text: `test exceeded its ${Number(m[1]) / 1000} s timeout`, loc };
  if ((m = msg.match(/Timeout (\d+)ms exceeded/))) return { cat: 'Environment', text: `${msg.split('\n')[0].trim()}`, loc };
  return { cat: 'Script / Other', text: msg.split('\n')[0].trim() || 'unknown error', loc };
}

function istString(iso) {
  if (!iso) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .formatToParts(new Date(iso)).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} IST`;
}

function evidenceFor(result, attemptNo) {
  const items = [];
  (result.attachments || []).forEach(a => {
    if (!a.path) return;
    const exists = fs.existsSync(a.path);
    let note = '';
    if (a.name === 'screenshot' && exists && fs.statSync(a.path).size < 6000) note = ' (blank page)';
    items.push(`Attempt ${attemptNo} ${a.name}: ${rel(a.path)}${note}${exists ? '' : ' [FILE MISSING]'}`);
  });
  return items;
}

// ════════════════════════════════════════════════════════════════════════════
// 5. Build records
// ════════════════════════════════════════════════════════════════════════════
function buildRecords(data) {
  const runStart = data.stats && data.stats.startTime;
  const review = REVIEWS[runStart] || { notes: {}, categories: {} };
  const flat = [];
  const walk = (s, chain) => {
    (s.specs || []).forEach(sp => sp.tests.forEach(t => flat.push({ sp, t, suite: chain })));
    (s.suites || []).forEach(x => walk(x, chain.concat(x.title)));
  };
  data.suites.forEach(s => walk(s, [s.title]));

  // failures per file (for BLOCKED attribution in serial groups)
  const failedByFile = {};
  flat.forEach(({ sp, t }) => {
    if (t.status === 'unexpected') (failedByFile[`${sp.file}|${t.projectName}`] = failedByFile[`${sp.file}|${t.projectName}`] || []).push({ id: sp.title.match(/TC_[A-Z0-9_]+/)[0], line: sp.line });
  });

  const records = [];
  for (const { sp, t } of flat) {
    const id = (sp.title.match(/TC_[A-Z0-9_]+/) || [sp.title])[0];
    const title = sp.title.replace(/^TC_[A-Z0-9_]+\s*:\s*/, '');
    const cleanTitle = title.replace(/\s*\((positive|negative|edge case)\)\s*$/i, '');
    const module = MODULE_NAMES[sp.file] || cap(sp.file.replace('.spec.js', ''));
    const ctx = loadSpec(sp.file);
    const { body, actualLine } = findTestBody(ctx, sp.line, id);
    const bodyStmts = splitStatements(body || '');
    const setupStmts = splitStatements(ctx.beforeEach || '').map(s => ({ ...s, cond: false }));
    const info = buildVarInfo(setupStmts.concat(bodyStmts));
    const asserts = analyseAssertions(bodyStmts, info, ctx);
    const setupSteps = deriveSteps(setupStmts, info, ctx);
    const testSteps = deriveSteps(bodyStmts, info, ctx);
    const allSteps = setupSteps.concat(testSteps);
    allSteps.push('Verify the expected result');
    const steps = allSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');

    const effective = asserts.filter(a => !a.weak && !a.cond);
    const weak = asserts.filter(a => a.weak);
    const cond = asserts.filter(a => a.cond && !a.weak);
    // Expected Result: derived from the test's checks; checks that read like code are replaced
    // by the requirement stated in the test title.
    const intent = (() => { const s = cleanTitle.replace(/^verify\s+(that\s+)?/i, '').trim(); return cap(s) + (/[.!?]$/.test(s) ? '' : '.'); })();
    const readable = asserts.map(a => a.sentence).filter(s => !/The expression \(|should (not )?be defined|check( on the [\w ]+)? should return|should satisfy|\(\(|computed value/.test(s));
    const expectedLines = Array.from(new Set([...(readable.length < asserts.length || !asserts.length ? [intent] : []), ...readable]));
    let expected = expectedLines.map(s => `- ${s}`).join('\n');
    let verification;
    if (!asserts.length) verification = 'Not Verified – no assertion';
    else if (!effective.length && cond.length) verification = 'Not Verified – conditional assertion';
    else if (!effective.length) verification = 'Not Verified – always-true assertion';
    else if (weak.length || cond.length) verification = 'Verified (partially weak)';
    else verification = 'Verified';

    const results = t.results || [];
    // console output of the test (kept internally for analysis, not printed in the report)
    const logText = results.flatMap(r => [...(r.stdout || []), ...(r.stderr || [])].map(o => stripAnsi(o.text || ''))).join('\n');

    let status, actual, failureReason = '', failureCategory = '', blockedBy = '';
    const flaky = t.status === 'flaky';
    const passedAttempt = results.findIndex(r => r.status === 'passed');
    // plain-language description of each failed attempt
    const failedAttempts = results.map((r, i) => ({ r, i })).filter(x => x.r.status !== 'passed' && x.r.status !== 'skipped')
      .map(({ r, i }) => {
        const e = classifyError(r.error || (r.errors || [])[0]);
        const shot = (r.attachments || []).find(a => a.name === 'screenshot' && a.path && fs.existsSync(a.path));
        return { n: i + 1, cat: e.cat, text: e.text + (shot && fs.statSync(shot.path).size < 6000 ? ' (screenshot shows a blank page)' : '') };
      });
    const plainWeak = reason => /hard-coded fallback/.test(reason) ? 'the checked value has a built-in default, so it can never be empty'
      : /always >= 0/.test(reason) ? 'a count of 0 or more is always true'
        : 'it only confirms the element is defined in code, not that it is shown on the page';
    const describeFails = () => {
      if (!failedAttempts.length) return '';
      const same = failedAttempts.every(f => f.text === failedAttempts[0].text);
      return same ? `${failedAttempts.length > 1 ? `Failed on all ${failedAttempts.length} attempts` : `Failed on attempt ${failedAttempts[0].n}`}: ${failedAttempts[0].text}.`
        : failedAttempts.map(f => `Attempt ${f.n} failed: ${f.text}.`).join(' ');
    };

    if (t.status === 'expected' || flaky) {
      status = 'PASS';
      if (verification.startsWith('Not Verified')) {
        const why = !asserts.length ? 'it contains no check'
          : verification.includes('conditional') ? 'its check only runs under a condition that may not have been met'
            : `its check cannot fail (${plainWeak(weak[0].weakReason)})`;
        actual = `Not Verified – the test ran without errors, but ${why}. The expected behaviour was not confirmed.`;
      } else {
        actual = asserts.length === 1 ? 'As expected – the check passed.' : `As expected – all ${asserts.length} checks passed.`;
        if (weak.length) actual += ` (${weak.length} of these check(s) cannot fail and do not confirm the behaviour.)`;
      }
      if (flaky) {
        failureCategory = 'Flaky';
        actual += passedAttempt === 0
          ? ` Passed on attempt 1; the automatic re-run then failed: ${failedAttempts.map(f => f.text).join('; ')}.`
          : ` Passed on attempt ${passedAttempt + 1} after attempt 1 failed: ${failedAttempts[0].text}.`;
      }
    } else if (t.status === 'unexpected') {
      status = 'FAIL';
      const cats = failedAttempts.map(f => f.cat);
      const allEnv = cats.length && cats.every(c => c === 'Environment');
      failureCategory = cats.includes('Assertion') ? 'Assertion (behaviour mismatch)' : allEnv ? 'Environment (site unavailable / not responding)' : cats[cats.length - 1] || 'Unknown';
      actual = `${allEnv ? 'Not Verified – the test could not reach its checks. ' : ''}${describeFails()}`;
      const last = failedAttempts[failedAttempts.length - 1];
      failureReason = allEnv ? `Environment issue: ${last.text}.`
        : last.cat === 'Test script' ? `Test script issue: ${last.text}.`
          : last.cat === 'Assertion' ? `Application behaviour did not match: ${last.text}.`
            : `Test could not complete: ${last.text}.`;
    } else if (t.status === 'skipped') {
      const skipAnn = (t.annotations || []).find(a => a.type === 'skip' || a.type === 'fixme');
      if (skipAnn) {
        status = 'SKIPPED';
        actual = `Not executed – skipped automatically: ${skipAnn.description || 'no reason given'}.`;
        failureReason = `Skipped: ${skipAnn.description || 'no reason given'}.`;
      } else if (ctx.serial && failedByFile[`${sp.file}|${t.projectName}`]) {
        const fbf = failedByFile[`${sp.file}|${t.projectName}`];
        const blockers = fbf.filter(f => f.line < sp.line);
        const b = blockers.length ? blockers[blockers.length - 1] : fbf[0];
        status = 'BLOCKED';
        blockedBy = b.id;
        actual = `Not executed – blocked because ${b.id} failed earlier in the same test sequence.`;
        failureReason = `Blocked by ${b.id} (tests in this module run in sequence).`;
        failureCategory = 'Blocked (dependency)';
      } else {
        status = 'SKIPPED';
        actual = 'Not executed – skipped (no reason recorded).';
        failureReason = 'Skipped: no reason recorded.';
      }
    } else {
      status = 'FAIL';
      actual = `Not Verified – run ended as "${t.status}". ${describeFails()}`;
      failureReason = `Run ended as "${t.status}".`;
    }
    // evidence-review notes for this specific run (see REVIEWS)
    const note = review.notes[id];
    if (typeof note === 'string') actual += ` ${note}`;
    else if (note) {
      if (note.actual) actual = note.actual;
      if (note.append) actual += ` ${note.append}`;
      if (note.reason && status === 'FAIL') failureReason = note.reason;
    }
    if (review.categories[id] && status === 'FAIL') failureCategory = review.categories[id];

    // Evidence: concise artefact list (screenshots / traces / videos of failed attempts)
    const evidence = [];
    results.forEach((r, i) => (r.attachments || []).forEach(a => {
      if (!a.path || !['screenshot', 'trace', 'video'].includes(a.name) || !fs.existsSync(a.path)) return;
      evidence.push(`${cap(a.name)} (attempt ${i + 1}): ${rel(a.path)}`);
    }));
    if (status === 'PASS' && !evidence.length) evidence.push('Playwright HTML report: Results/Reports/HTML/playwright-report/index.html');
    if (status === 'BLOCKED' || status === 'SKIPPED') evidence.push('Not executed – no run evidence.');

    const executed = results.some(r => r.status !== 'skipped' || r.duration > 0);
    const firstRun = results.find(r => r.status !== 'skipped' || r.duration > 0);
    const totalDur = results.reduce((s, r) => s + (r.duration || 0), 0) / 1000;

    records.push({
      id, module, scenario: deriveScenario(module, title), description: cleanTitle,
      moduleKey: sp.file.replace('.spec.js', ''),
      precondition: derivePrecondition(ctx, body), steps,
      postCondition: derivePostCondition(ctx, body, cleanTitle, sp.file.replace('.spec.js', ''), deriveScenario(module, title)),
      testData: deriveTestData(bodyStmts, buildVarInfo(bodyStmts), ctx, body || '', /loginPage\.login\(/.test(ctx.beforeEach)),
      expected, actual, status, failureReason,
      executionDate: executed && status !== 'BLOCKED' && status !== 'SKIPPED' ? istString(firstRun.startTime) : 'Not executed',
      evidence: evidence.join('\n'),
      verification: status === 'PASS' ? verification : status === 'FAIL' ? 'Failed' : 'Not executed',
      failureCategory, flaky: flaky ? 'Yes' : 'No',
      attempts: results.length ? `${results.filter(r => r.status !== 'skipped').length} run / ${results.length} scheduled` : '0',
      attemptHistory: results.map(r => r.status).join(' → '),
      duration: Number(totalDur.toFixed(2)), browser: t.projectName || '', specLocation: `tests/${sp.file}:${actualLine}`,
      pwOutcome: t.status, blockedBy, logText,
      // what utils/zipReports.js would report from this same results.json (it reads only the last attempt)
      legacyStatus: (() => { const last = results[results.length - 1]; const s = last ? last.status : 'skipped'; return s === 'passed' ? 'PASS' : s === 'failed' ? 'FAIL' : 'SKIPPED'; })(), weakAssertions: weak.map(w => w.weakReason), bodyFound: body !== null,
      assertionCount: asserts.length, effectiveCount: effective.length, condCount: cond.length,
    });
  }
  return records;
}

// ════════════════════════════════════════════════════════════════════════════
// 6. Previous-report comparison
// ════════════════════════════════════════════════════════════════════════════
async function loadOldReport() {
  if (!fs.existsSync(OLD_XLSX)) return null;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(OLD_XLSX);
  const ws = wb.worksheets.find(w => w.getRow(1).values.some(v => /^test case id$/i.test(String(v || ''))));
  if (!ws) return null;
  const header = ws.getRow(1).values.map(v => String(v || ''));
  const idCol = header.findIndex(h => /^test case id$/i.test(h));
  const stCol = header.findIndex(h => /^status/i.test(h));
  if (idCol < 0 || stCol < 0) return null;
  const map = {};
  ws.eachRow((r, i) => { if (i > 1) map[r.getCell(idCol).value] = String(r.getCell(stCol).value || ''); });
  return { map, mtime: fs.statSync(OLD_XLSX).mtime };
}

// ════════════════════════════════════════════════════════════════════════════
// 7. Writers
// ════════════════════════════════════════════════════════════════════════════
// Test-case template columns (company QA format) – same order in CSV and Excel
const COLUMNS = [
  ['TEST CASE ID', 'id', 16], ['TEST SCENARIO', 'scenario', 22], ['TEST CASE', 'description', 40],
  ['PRE-CONDITION', 'precondition', 32], ['TEST STEPS', 'steps', 50], ['TEST DATA', 'testData', 28],
  ['EXPECTED RESULT', 'expected', 44], ['POST CONDITION', 'postCondition', 34], ['ACTUAL RESULT', 'actual', 48],
  ['STATUS (PASS/FAIL)', 'status', 13],
];
const HEADER_NAVY = 'FF002060';
const colLetter = key => { let n = COLUMNS.findIndex(c => c[1] === key) + 1, s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const STATUS_ORDER = ['PASS', 'FAIL', 'SKIPPED', 'BLOCKED'];
const STATUS_STYLE = {
  PASS: { font: 'FF0B6B32', fill: 'FFD7F0DF' }, FAIL: { font: 'FF9B1C1C', fill: 'FFF9D9D9' },
  SKIPPED: { font: 'FF4B5563', fill: 'FFE5E7EB' }, BLOCKED: { font: 'FF8A4B00', fill: 'FFFCE8C8' },
};
const FONT = 'Arial';
const BRAND = 'FFFF7919';   // OrangeHRM orange (used by the original reports)
const DARK = 'FF1F2937';

function csvEscape(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function writeCsv(file, records) {
  const lines = [COLUMNS.map(c => csvEscape(c[0])).join(',')];
  records.forEach(r => lines.push(COLUMNS.map(c => csvEscape(r[c[1]])).join(',')));
  fs.writeFileSync(file, '﻿' + lines.join('\r\n') + '\r\n', 'utf8');
}

const thin = { style: 'thin', color: { argb: 'FFD9D9D9' } };
const box = { top: thin, bottom: thin, left: thin, right: thin };
function styleHeader(row, fill) {
  row.height = 40;
  const edge = { style: 'thin', color: { argb: 'FF000000' } };
  row.eachCell(c => {
    c.font = { name: FONT, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    c.alignment = { vertical: 'bottom', horizontal: 'center', wrapText: true };
    c.border = { top: edge, bottom: edge, left: edge, right: edge };
  });
}
function paintStatus(cell) {
  const st = STATUS_STYLE[cell.value];
  if (!st) return;
  cell.font = { name: FONT, size: 9, bold: true, color: { argb: st.font } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.fill } };
  cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
}
const lineCount = (v, width) => String(v || '').split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / Math.max(8, width * 1.1))), 0);

function addTableSheet(wb, name, cols, rows, opts = {}) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1, xSplit: opts.freezeCol || 0 }], properties: opts.tab ? { tabColor: { argb: opts.tab } } : {} });
  ws.columns = cols.map(([header, key, width]) => ({ header, key, width }));
  styleHeader(ws.getRow(1), opts.headerFill || HEADER_NAVY);
  rows.forEach((r, idx) => {
    const row = ws.addRow(cols.map(c => r[c[1]]));
    row.eachCell({ includeEmpty: true }, (cell, n) => {
      cell.font = { name: FONT, size: 9 };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      cell.border = box;
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
      if (cols[n - 1] && cols[n - 1][1] === 'status') paintStatus(cell);
    });
    row.height = Math.min(320, Math.max(30, 12 * Math.max(...cols.map(c => lineCount(r[c[1]], c[2])))));
  });
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: cols.length } };
  return ws;
}

async function writeXlsx(file, sheetName, records, summary, issues) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OrangeHRM QA Automation';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true; // Excel recalculates the summary formulas on open
  const DETAILS = sheetName.substring(0, 31); // keeps the existing test-case sheet name
  const n = records.length;
  const rng = key => `'${DETAILS}'!$${colLetter(key)}$2:$${colLetter(key)}$${n + 1}`;

  // ── Sheet 1: Execution Summary ──
  const ws = wb.addWorksheet('Execution Summary', { properties: { tabColor: { argb: BRAND } }, views: [{ showGridLines: false }] });
  ws.columns = [{ width: 30 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
  const put = (r, c, v, st = {}) => {
    const cell = ws.getCell(r, c);
    cell.value = v;
    cell.font = { name: FONT, size: st.size || 10, bold: !!st.bold, color: { argb: st.color || 'FF111827' } };
    cell.alignment = { vertical: 'middle', horizontal: st.h || 'left', wrapText: !!st.wrap };
    if (st.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.fill } };
    if (st.fmt) cell.numFmt = st.fmt;
    if (st.border !== false && st.box) cell.border = box;
    return cell;
  };
  const section = (r, text) => { put(r, 1, text, { bold: true, size: 12, color: 'FF111827' }); ws.getRow(r).height = 22; ws.mergeCells(r, 1, r, 7); };
  const headRow = (r, labels) => labels.forEach((h, i) => put(r, i + 1, h, { bold: true, color: 'FFFFFFFF', fill: HEADER_NAVY, box: true, h: i ? 'center' : 'left' }));
  let r = 1;
  put(r, 1, summary.title, { bold: true, size: 16, color: 'FFFFFFFF', fill: BRAND }); ws.mergeCells(r, 1, r, 7); ws.getRow(r).height = 32; r++;
  put(r, 1, 'Automated test execution report (Playwright)', { color: 'FF6B7280' }); ws.mergeCells(r, 1, r, 7); r += 2;

  section(r, 'Test Run Details'); r++;
  summary.runInfo.forEach(([k, v]) => {
    put(r, 1, k, { bold: true, box: true, fill: 'FFF3F4F6' });
    put(r, 2, v, { box: true, wrap: true }); ws.mergeCells(r, 2, r, 7);
    ws.getRow(r).height = String(v).length > 95 ? 30 : 18; r++;
  });
  r++;

  section(r, 'Results Summary'); r++;
  headRow(r, ['Status', 'Test Cases', '% of Total']); r++;
  const totalRow = r + 4;
  STATUS_ORDER.forEach(s => {
    const label = { PASS: 'Passed', FAIL: 'Failed', SKIPPED: 'Skipped', BLOCKED: 'Blocked' }[s];
    put(r, 1, label, { box: true, bold: true, color: STATUS_STYLE[s].font, fill: STATUS_STYLE[s].fill });
    put(r, 2, { formula: `COUNTIF(${rng('status')},"${s}")`, result: summary.counts[s] }, { box: true, h: 'center' });
    put(r, 3, { formula: `IF($B$${totalRow}=0,0,B${r}/$B$${totalRow})`, result: summary.total ? summary.counts[s] / summary.total : 0 }, { box: true, h: 'center', fmt: '0.0%' });
    r++;
  });
  put(r, 1, 'Total', { box: true, bold: true, fill: 'FFF3F4F6' });
  put(r, 2, { formula: `COUNTA(${rng('id')})`, result: summary.total }, { box: true, bold: true, h: 'center', fill: 'FFF3F4F6' });
  put(r, 3, { formula: `IF(B${r}=0,0,1)`, result: summary.total ? 1 : 0 }, { box: true, bold: true, h: 'center', fmt: '0.0%', fill: 'FFF3F4F6' });
  r += 2;
  put(r, 1, 'Pass %', { bold: true, box: true, fill: 'FFF3F4F6' });
  put(r, 2, { formula: `IF(B${totalRow}=0,0,B${totalRow - 4}/B${totalRow})`, result: summary.passPct / 100 }, { box: true, bold: true, h: 'center', fmt: '0.0%', color: STATUS_STYLE.PASS.font }); r++;
  put(r, 1, 'Fail %', { bold: true, box: true, fill: 'FFF3F4F6' });
  put(r, 2, { formula: `IF(B${totalRow}=0,0,B${totalRow - 3}/B${totalRow})`, result: summary.failPct / 100 }, { box: true, bold: true, h: 'center', fmt: '0.0%', color: STATUS_STYLE.FAIL.font }); r += 2;

  section(r, summary.modules.length > 1 ? 'Module-wise Results' : 'Module Result'); r++;
  headRow(r, ['Module', 'Total', 'Passed', 'Failed', 'Skipped', 'Blocked', 'Pass %']); r++;
  const modStart = r;
  summary.modules.forEach(m => {
    // modules are counted by their test-case ID prefix (e.g. "TC_LOGIN_*"), since the sheet has no Module column
    const prefixes = Array.from(new Set(records.filter(x => x.module === m.module).map(x => x.id.replace(/\d+$/, ''))));
    const pre = prefixes.length === 1 ? prefixes[0] : null;
    put(r, 1, m.module, { box: true });
    put(r, 2, pre ? { formula: `COUNTIF(${rng('id')},"${pre}*")`, result: m.total } : m.total, { box: true, h: 'center' });
    STATUS_ORDER.forEach((s, i) => put(r, 3 + i, pre ? { formula: `COUNTIFS(${rng('id')},"${pre}*",${rng('status')},"${s}")`, result: m[s] } : m[s], { box: true, h: 'center' }));
    put(r, 7, { formula: `IF(B${r}=0,0,C${r}/B${r})`, result: m.total ? m.PASS / m.total : 0 }, { box: true, h: 'center', fmt: '0.0%' });
    r++;
  });
  if (summary.modules.length > 1) {
    put(r, 1, 'Total', { box: true, bold: true, fill: 'FFF3F4F6' });
    ['B', 'C', 'D', 'E', 'F'].forEach((col, i) => {
      const key = ['total', 'PASS', 'FAIL', 'SKIPPED', 'BLOCKED'][i];
      put(r, 2 + i, { formula: `SUM(${col}${modStart}:${col}${r - 1})`, result: summary.modules.reduce((s, m) => s + m[key], 0) }, { box: true, bold: true, h: 'center', fill: 'FFF3F4F6' });
    });
    put(r, 7, { formula: `IF(B${r}=0,0,C${r}/B${r})`, result: summary.passPct / 100 }, { box: true, bold: true, h: 'center', fmt: '0.0%', fill: 'FFF3F4F6' });
    r++;
  }
  r++;

  section(r, 'Key Observations'); r++;
  summary.critical.forEach(t => { put(r, 1, `•  ${t}`, { wrap: true }); ws.mergeCells(r, 1, r, 7); ws.getRow(r).height = Math.max(18, 15 * Math.ceil(t.length / 105)); r++; });
  r++;
  section(r, 'Status Legend'); r++;
  LEGEND.forEach(([k, v]) => {
    const s = STATUS_STYLE[k];
    put(r, 1, k, { bold: true, box: true, color: s ? s.font : 'FF111827', fill: s ? s.fill : 'FFF3F4F6' });
    put(r, 2, v, { box: true, wrap: true }); ws.mergeCells(r, 2, r, 7); ws.getRow(r).height = v.length > 95 ? 30 : 18; r++;
  });

  // ── Sheet 2: Test Cases (existing sheet name) ──
  addTableSheet(wb, DETAILS, COLUMNS, records, { freezeCol: 1, tab: DARK });

  // ── Sheet 3: Failed Test Cases ──
  // same template columns, plus the failure analysis and evidence for each failed test
  const failCols = COLUMNS.concat([['FAILURE REASON', 'failureReason', 50], ['EVIDENCE', 'evidence', 60]]);
  const fails = records.filter(x => x.status === 'FAIL');
  const fws = addTableSheet(wb, 'Failed Test Cases', failCols, fails.length ? fails : [{ id: 'None', description: 'No test case failed.' }], { freezeCol: 1, tab: 'FF9B1C1C' });
  if (!fails.length) fws.autoFilter = undefined;

  // ── Sheet 4: Observations & Recommendations (consolidated workbook only) ──
  if (issues) {
    const issCols = [['#', 'n', 5], ['SEVERITY', 'severity', 11], ['AREA', 'area', 20], ['OBSERVATION', 'issue', 70], ['RECOMMENDATION', 'rec', 70]];
    addTableSheet(wb, 'Observations & Recommendations', issCols, issues.map((x, i) => ({ n: i + 1, ...x })), { tab: 'FF1E3A8A' });
  }

  await wb.xlsx.writeFile(file);
}

const LEGEND = [
  ['PASS', 'Actual behaviour matched the expected result.'],
  ['FAIL', 'Actual behaviour did not match the expected result, or the test could not complete.'],
  ['SKIPPED', 'Not executed: the test skipped itself because its condition was not met (reason given).'],
  ['BLOCKED', 'Not executed: an earlier test in the same sequence failed.'],
  ['Not Verified', 'Shown in Actual Result when the test ran but could not confirm the behaviour (for example, a check that cannot fail).'],
];

function escapeHtml(s) {
  return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function writeHtml(file, title, records, summary, issues) {
  const nl = s => escapeHtml(s).replace(/\n/g, '<br>');
  const card = (label, val, cls) => `<div class="card ${cls}"><div class="lbl">${label}</div><div class="val">${val}</div></div>`;
  const rows = records.map(x => `
<tr data-status="${x.status}" data-module="${escapeHtml(x.module)}">
<td class="id">${x.id}</td><td>${escapeHtml(x.module)}</td><td>${escapeHtml(x.description)}</td>
<td><span class="st ${x.status}">${x.status}</span></td>
<td>${nl(x.expected)}</td><td>${nl(x.actual)}</td><td>${nl(x.failureReason || '–')}</td>
<td><details><summary>View</summary><dl>
<dt>Test Scenario</dt><dd>${escapeHtml(x.scenario)}</dd><dt>Preconditions</dt><dd>${escapeHtml(x.precondition)}</dd>
<dt>Test Steps</dt><dd>${nl(x.steps)}</dd><dt>Test Data</dt><dd>${nl(x.testData)}</dd><dt>Post Condition</dt><dd>${escapeHtml(x.postCondition)}</dd>
<dt>Execution Date</dt><dd>${escapeHtml(x.executionDate)}</dd><dt>Evidence</dt><dd class="small">${nl(x.evidence)}</dd></dl></details></td></tr>`).join('');
  const modRows = summary.modules.map(m => `<tr><td>${escapeHtml(m.module)}</td><td>${m.total}</td><td>${m.PASS}</td><td>${m.FAIL}</td><td>${m.SKIPPED}</td><td>${m.BLOCKED}</td><td>${m.total ? ((m.PASS / m.total) * 100).toFixed(1) : '0.0'}%</td></tr>`).join('');
  const issueRows = (issues || []).map((x, i) => `<tr><td>${i + 1}</td><td><span class="sev ${x.severity}">${x.severity}</span></td><td>${escapeHtml(x.area)}</td><td>${nl(x.issue)}</td><td>${nl(x.rec)}</td></tr>`).join('');
  const info = summary.runInfo.map(([k, v]) => `<div><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`).join('');
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{--bg:#f4f5f7;--panel:#fff;--ink:#111827;--muted:#6b7280;--line:#e5e7eb;--brand:#ea6a10;--head:#1f2937;
--pass:#0b6b32;--passbg:#d7f0df;--fail:#9b1c1c;--failbg:#f9d9d9;--skip:#4b5563;--skipbg:#e5e7eb;--blk:#8a4b00;--blkbg:#fce8c8}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0f1115;--panel:#171a21;--ink:#e5e7eb;--muted:#9ca3af;--line:#2a2f3a;--head:#0b0d12;
--pass:#6ee7a0;--passbg:#12351f;--fail:#fca5a5;--failbg:#3b1414;--skip:#cbd5e1;--skipbg:#262b35;--blk:#fcd38d;--blkbg:#3a2a10}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 Arial,Helvetica,sans-serif}
header{background:var(--brand);color:#fff;padding:20px 16px}header .in,.wrap{max-width:1400px;margin:0 auto}
header h1{margin:0;font-size:22px}header p{margin:4px 0 0;opacity:.9}
.wrap{padding:20px 16px}h2{font-size:17px;margin:26px 0 10px}
.info{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:6px 18px;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 16px}
.info span{display:block;font-size:12px;color:var(--muted)}.info b{font-weight:600}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:16px}
.card{background:var(--panel);border:1px solid var(--line);border-top:4px solid var(--muted);border-radius:8px;padding:12px}
.card .lbl{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}.card .val{font-size:26px;font-weight:700}
.card.PASS{border-top-color:var(--pass)}.card.FAIL{border-top-color:var(--fail)}.card.BLOCKED{border-top-color:var(--blk)}.card.TOTAL{border-top-color:var(--brand)}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:4px 0;overflow-x:auto}
.panel.text{padding:12px 16px}.panel ul{margin:0;padding-left:18px}.panel li{margin:4px 0}
table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
th{font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:#fff;background:var(--head)}
.st{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-size:12px}
.st.PASS{color:var(--pass);background:var(--passbg)}.st.FAIL{color:var(--fail);background:var(--failbg)}.st.SKIPPED{color:var(--skip);background:var(--skipbg)}.st.BLOCKED{color:var(--blk);background:var(--blkbg)}
.sev{font-weight:700}.sev.Critical,.sev.High{color:var(--fail)}.sev.Medium{color:var(--blk)}
.id{font-family:Consolas,Menlo,monospace;white-space:nowrap}.small{font-size:12px;word-break:break-all}
details summary{cursor:pointer;color:var(--brand);font-weight:600}dl{margin:8px 0 0}dt{font-size:12px;color:var(--muted);margin-top:6px}dd{margin:0}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}.filters button,.filters select,.filters input{font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink)}
.filters button.on{border-color:var(--brand);color:var(--brand);font-weight:600}
#tc td:nth-child(5),#tc td:nth-child(6){min-width:240px}#tc td:nth-child(3){min-width:180px}
.legend{display:grid;grid-template-columns:110px 1fr;gap:6px 12px;align-items:start}
footer{color:var(--muted);font-size:12px;margin:24px 0 8px}
</style></head><body>
<header><div class="in"><h1>${escapeHtml(title)}</h1><p>Automated test execution report (Playwright)</p></div></header>
<div class="wrap">
<div class="info">${info}</div>
<div class="cards">
${card('Total', summary.total, 'TOTAL')}${card('Passed', summary.counts.PASS, 'PASS')}${card('Failed', summary.counts.FAIL, 'FAIL')}
${card('Skipped', summary.counts.SKIPPED, 'SKIPPED')}${card('Blocked', summary.counts.BLOCKED, 'BLOCKED')}
${card('Pass %', summary.passPct.toFixed(1) + '%', 'PASS')}${card('Fail %', summary.failPct.toFixed(1) + '%', 'FAIL')}
</div>
<h2>Key Observations</h2><div class="panel text"><ul>${summary.critical.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>
<h2>${summary.modules.length > 1 ? 'Module-wise Results' : 'Module Result'}</h2>
<div class="panel"><table><thead><tr><th>Module</th><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Blocked</th><th>Pass %</th></tr></thead><tbody>${modRows}</tbody></table></div>
<h2>Test Case Details</h2>
<div class="filters" id="filters">
<button data-f="ALL" class="on">All (${summary.total})</button><button data-f="PASS">Passed (${summary.counts.PASS})</button><button data-f="FAIL">Failed (${summary.counts.FAIL})</button><button data-f="SKIPPED">Skipped (${summary.counts.SKIPPED})</button><button data-f="BLOCKED">Blocked (${summary.counts.BLOCKED})</button>
${summary.modules.length > 1 ? `<select id="mod"><option value="">All modules</option>${summary.modules.map(m => `<option>${escapeHtml(m.module)}</option>`).join('')}</select>` : '<select id="mod" hidden><option value=""></option></select>'}
<input id="q" type="search" placeholder="Search test cases">
</div>
<div class="panel"><table id="tc"><thead><tr><th>Test Case ID</th><th>Module</th><th>Test Case Description</th><th>Status</th><th>Expected Result</th><th>Actual Result</th><th>Failure Reason</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table></div>
${issues ? `<h2>Observations &amp; Recommendations</h2><div class="panel"><table><thead><tr><th>#</th><th>Severity</th><th>Area</th><th>Observation</th><th>Recommendation</th></tr></thead><tbody>${issueRows}</tbody></table></div>` : ''}
<h2>Status Legend</h2><div class="panel text legend">${LEGEND.map(([k, v]) => `<span class="st ${k.replace(' ', '')}">${k}</span><span>${escapeHtml(v)}</span>`).join('')}</div>
<footer>Generated ${escapeHtml(istString(new Date().toISOString()))} from Playwright results.</footer>
</div>
<script>
(function(){var f='ALL',rows=[].slice.call(document.querySelectorAll('#tc tbody tr')),mod=document.getElementById('mod'),q=document.getElementById('q');
function apply(){var m=mod.value,t=q.value.toLowerCase();rows.forEach(function(r){var ok=(f==='ALL'||r.dataset.status===f)&&(!m||r.dataset.module===m)&&(!t||r.textContent.toLowerCase().indexOf(t)>=0);r.style.display=ok?'':'none';});}
document.getElementById('filters').addEventListener('click',function(e){if(e.target.tagName!=='BUTTON')return;f=e.target.dataset.f;[].forEach.call(this.querySelectorAll('button'),function(b){b.classList.toggle('on',b===e.target);});apply();});
mod.addEventListener('change',apply);q.addEventListener('input',apply);})();
</script></body></html>`;
  fs.writeFileSync(file, html, 'utf8');
}

// ════════════════════════════════════════════════════════════════════════════
// 8. Main
// ════════════════════════════════════════════════════════════════════════════
// Combine the per-browser results of each test case into one row.
// STATUS: FAIL if any browser failed; otherwise BLOCKED if any browser was blocked; SKIPPED only if
// every browser skipped it; otherwise PASS. ACTUAL RESULT shows each browser's own result.
function mergeBrowsers(raw, browsers) {
  const order = b => browsers.indexOf(b);
  const groups = new Map();
  raw.forEach(r => { if (!groups.has(r.id)) groups.set(r.id, []); groups.get(r.id).push(r); });
  const merged = [];
  for (const [, list] of groups) {
    list.sort((a, b) => order(a.browser) - order(b.browser));
    const st = list.map(r => r.status);
    const status = st.includes('FAIL') ? 'FAIL' : st.includes('BLOCKED') ? 'BLOCKED' : st.every(s => s === 'SKIPPED') ? 'SKIPPED' : 'PASS';
    const name = r => browserName(r.browser);
    const sameActual = list.every(r => r.actual === list[0].actual && r.status === list[0].status);
    const actual = sameActual
      ? `All browsers (${list.map(name).join(', ')}) – ${list[0].status}: ${list[0].actual}`
      : list.map(r => `${name(r)} – ${r.status}: ${r.actual}`).join('\n');
    const notPassed = list.filter(r => r.status !== 'PASS');
    const failing = list.filter(r => r.status === 'FAIL');
    const pick = failing[0] || notPassed[0] || list[0];
    merged.push({
      ...list[0],
      status, actual,
      failureReason: notPassed.map(r => `${name(r)}: ${r.failureReason}`).join('\n'),
      failureCategory: pick.failureCategory,
      blockedBy: (list.find(r => r.status === 'BLOCKED') || {}).blockedBy || '',
      blockedDetail: list.filter(r => r.status === 'BLOCKED').map(r => ({ browser: name(r), by: r.blockedBy })),
      flaky: list.some(r => r.flaky === 'Yes') ? 'Yes' : 'No',
      verification: pick.verification,
      evidence: list.map(r => (r.status === 'PASS' && /^Playwright HTML report/.test(r.evidence) ? '' : `${name(r)}:\n${r.evidence}`)).filter(Boolean).join('\n')
        || 'Playwright HTML report: Results/Reports/HTML/playwright-report/index.html',
      executionDate: (list.find(r => r.executionDate !== 'Not executed') || list[0]).executionDate,
      browser: list.map(r => r.browser).join(', '),
      browserResults: list.map(r => ({ browser: r.browser, status: r.status })),
      legacyStatus: pick.legacyStatus, pwOutcome: list.map(r => r.pwOutcome).join(', '),
      attemptHistory: list.map(r => `${name(r)}: ${r.attemptHistory}`).join('; '),
    });
  }
  return merged;
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) throw new Error(`results.json not found: ${JSON_PATH}`);
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const rawRecords = buildRecords(data);
  const browsers = Array.from(new Set(rawRecords.map(r => r.browser)));
  // one row per test case: results of all browsers are combined into that row
  const records = browsers.length > 1 ? mergeBrowsers(rawRecords, browsers) : rawRecords;

  // integrity checks
  const rowKeys = records.map(r => `${r.id}|${r.browser}`); // one row per test (per browser when only one browser ran)
  const dups = rowKeys.filter((x, i) => rowKeys.indexOf(x) !== i);
  if (dups.length) throw new Error(`Duplicate test case IDs: ${dups.join(', ')}`);
  const useNotes = data.stats && data.stats.startTime === REVIEWED_RUN_START;
  const reviewedNow = !!REVIEWS[data.stats && data.stats.startTime];
  const missingBody = records.filter(r => !r.bodyFound).map(r => r.id);
  if (missingBody.length) console.warn(`⚠ Could not locate source for: ${missingBody.join(', ')}`);

  const counts = { PASS: 0, FAIL: 0, SKIPPED: 0, BLOCKED: 0 };
  records.forEach(r => { counts[r.status]++; });
  const total = records.length;
  const pct = n => (total ? (n / total) * 100 : 0);
  const modules = Object.values(MODULE_NAMES).filter(m => records.some(r => r.module === m)).map(m => {
    const rs = records.filter(r => r.module === m);
    const o = { module: m, total: rs.length, notVerified: rs.filter(r => r.status === 'PASS' && r.verification.startsWith('Not Verified')).length };
    STATUS_ORDER.forEach(s => { o[s] = rs.filter(r => r.status === s).length; });
    return o;
  });
  const st = data.stats || {};
  const configured = (data.config && data.config.projects || []).map(p => p.name);
  const retries = (data.config && data.config.projects && data.config.projects[0] && data.config.projects[0].retries);
  const envFails = records.filter(r => r.status === 'FAIL' && r.failureCategory.startsWith('Environment')).length;
  const assertFails = records.filter(r => r.status === 'FAIL' && r.failureCategory.startsWith('Assertion')).length;
  const scriptFails = records.filter(r => r.status === 'FAIL' && r.failureCategory.startsWith('Test script')).length;
  const notVerified = records.filter(r => r.status === 'PASS' && r.verification.startsWith('Not Verified')).length;
  const flaky = records.filter(r => r.flaky === 'Yes').length;
  const runEnd = st.startTime ? new Date(new Date(st.startTime).getTime() + st.duration).toISOString() : '';

  // Old report comparison
  const old = await loadOldReport();
  let corrections = null;
  let staleNote = '';
  if (old && browsers.length === 1) {
    const jsonMtime = fs.statSync(JSON_PATH).mtime;
    const norm = s => ({ PASSED: 'PASS', FAILED: 'FAIL', SKIPPED: 'SKIPPED', PASS: 'PASS', FAIL: 'FAIL', BLOCKED: 'BLOCKED' }[String(s).toUpperCase()] || s);
    const stale = old.mtime < jsonMtime;
    if (stale) staleNote = `Previous report (${rel(OLD_XLSX)}) was written ${((jsonMtime - old.mtime) / 1000).toFixed(1)} s BEFORE results.json, so it could not reflect this run.`;
    corrections = records.filter(r => old.map[r.id] !== undefined && norm(old.map[r.id]) !== r.status).map(r => {
      const o = norm(old.map[r.id]);
      let why, cause;
      if (o !== r.legacyStatus) {
        cause = 'stale';
        why = `Stale data: results.json for this run records "${r.pwOutcome}" (${r.attemptHistory}); even the old generator would report ${r.legacyStatus} from it. The previous report shows ${o} because it was generated before this run's results were written.`;
      } else if (r.status === 'BLOCKED') {
        cause = 'logic';
        why = `Relabelled: not executed because ${r.blockedBy} failed earlier in the serial group (BLOCKED, not an intentional skip).`;
      } else if (r.flaky === 'Yes') {
        cause = 'logic';
        why = `Generator logic: passed on attempt ${r.attemptHistory.split(' → ').indexOf('passed') + 1} and failed on another attempt (${r.attemptHistory}). The old generator reads only the last attempt.`;
      } else {
        cause = 'logic';
        why = `Generator logic: attempt history is ${r.attemptHistory}. The automatic retry of the serial group was skipped, and the old generator reads only that last (skipped) attempt, hiding the real ${r.status === 'FAIL' ? 'failure' : 'pass'}.`;
      }
      return { id: r.id, module: r.module, old: old.map[r.id], status: r.status, pwOutcome: r.pwOutcome, why, cause };
    });
    // also record unchanged-but-renamed statuses? (PASSED→PASS etc. are vocabulary only, not listed)
  }
  const staleList = corrections ? corrections.filter(c => c.cause === 'stale') : [];
  const staleCount = staleList.length;
  const stalePassedButFailed = staleList.filter(c => c.status === 'FAIL' && /PASS/i.test(c.old)).length;
  const logicList = corrections ? corrections.filter(c => c.cause === 'logic' && c.status !== 'BLOCKED') : [];
  const logicFlaky = logicList.filter(c => /Generator logic: passed on attempt/.test(c.why)).length;
  const logicHiddenPass = logicList.filter(c => c.status === 'PASS' && !/passed on attempt/.test(c.why)).length;
  const logicHiddenFail = logicList.filter(c => c.status === 'FAIL').length;
  const blockedFiles = Array.from(new Set(records.filter(r => r.status === 'BLOCKED').map(r => `${r.module} (${records.filter(x => x.module === r.module && x.status === 'BLOCKED').length}, blocked by ${r.blockedBy})`)));
  const weakIds = records.filter(r => r.status === 'PASS' && r.verification.includes('always-true')).map(r => r.id);
  const condIds = records.filter(r => r.status === 'PASS' && r.verification.includes('conditional')).map(r => r.id);
  const noAssertIds = records.filter(r => r.status === 'PASS' && r.verification.includes('no assertion')).map(r => r.id);
  const failList = records.filter(r => r.status === 'FAIL');

  // ── Key observations in plain language (used for the consolidated and the module reports) ──
  const ids = list => list.map(r => r.id).join(', ');
  const observations = recs => {
    const c = { PASS: 0, FAIL: 0, SKIPPED: 0, BLOCKED: 0 };
    recs.forEach(r => { c[r.status]++; });
    const fl = recs.filter(r => r.status === 'FAIL');
    const byCat = pre => fl.filter(r => r.failureCategory.startsWith(pre));
    const env = byCat('Environment'), data = byCat('Test script'), app = byCat('Assertion');
    const other = fl.filter(r => !env.includes(r) && !data.includes(r) && !app.includes(r));
    const out = [];
    if (!fl.length) out.push(c.PASS ? 'All executed test cases passed.' : 'No test case was executed.');
    else {
      if (!app.length && !other.length) out.push('No application defect was found in this run.');
      if (data.length) out.push(`${data.length} test case(s) failed because of a test data / test script issue, not an application defect: ${data.map(r => `${r.id} (${r.description})`).join('; ')}.`);
      if (env.length) out.push(`${env.length} test case(s) failed because the demo site did not load or respond in time (environment issue): ${ids(env)}.`);
      if (app.length) out.push(`${app.length} test case(s) failed because the application did not behave as expected and need investigation: ${app.map(r => `${r.id} (${r.description})`).join('; ')}.`);
      if (other.length) out.push(`${other.length} test case(s) failed for other reasons: ${ids(other)}.`);
    }
    // one line per (browser, blocking test): blocking happens separately on each browser
    const pairs = {};
    recs.filter(r => (r.blockedDetail || []).length || r.status === 'BLOCKED').forEach(r => {
      const det = r.blockedDetail || [{ browser: '', by: r.blockedBy }];
      det.forEach(d => { const k = d.by + '|' + d.browser; (pairs[k] = pairs[k] || { ...d, module: r.module, n: 0 }).n++; });
    });
    Object.values(pairs).forEach(p => out.push(`${p.n} ${p.module} test case(s) were not executed${p.browser ? ` on ${p.browser}` : ''} (Blocked) because ${p.by} failed first${p.browser ? ' on that browser' : ''}; these tests run in sequence.`));
    const sk = recs.filter(r => r.status === 'SKIPPED');
    if (sk.length) out.push(`${sk.length} test case(s) were skipped automatically because the feature is not available for this user profile: ${ids(sk)}.`);
    const fk = recs.filter(r => r.flaky === 'Yes');
    if (fk.length) out.push(`${fk.length} test case(s) failed on the first attempt and passed on the automatic re-run${browsers.length > 1 ? ' (on at least one browser)' : ''}: ${ids(fk)}.`);
    const nv = recs.filter(r => r.status === 'PASS' && r.verification.startsWith('Not Verified'));
    if (nv.length) out.push(`${nv.length} passed test case(s) are marked "Not Verified": their check cannot fail, so the behaviour was not actually confirmed. These tests need stronger checks.`);
    return out.map(grammar);
  };

  const durationMin = (st.duration / 60000).toFixed(1);
  const baseInfo = [
    ['Project', 'OrangeHRM – Playwright Test Automation'],
    ['Application URL', BASE_URL],
    ['Browser', browsers.map(browserName).join(', ')],
    ['Execution Start', istString(st.startTime)],
    ['Execution End', istString(runEnd)],
    ['Duration', `${durationMin} minutes`],
  ];
  const summary = {
    title: 'OrangeHRM – Test Execution Report',
    total, counts, modules, flaky, notVerified, envFails, assertFails, scriptFails,
    passPct: pct(counts.PASS), failPct: pct(counts.FAIL),
    runInfo: baseInfo.concat([
      ['Modules Covered', `${modules.length} – ${modules.map(m => m.module).join(', ')}`],
      ['Total Test Cases', String(total)],
      ['Report Generated', istString(new Date().toISOString())],
    ]),
    critical: observations(records),
  };

  const readText = p => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return ''; } };
  const teardownBug = /globalTeardown:\s*require\.resolve\(['"]\.\/utils\/zipReports\.js['"]\)/.test(readText('playwright.config.js'));
  const pw02 = records.find(r => r.id === 'TC_PASSWORD_02');
  const pw02Weak = /requiredMessages\.count\(\)/.test(readText('tests/changePassword.spec.js'));
  const leaveSwallow = /catch \(e\) \{\s*console\.error\('Failed to setup leave entitlement/.test(readText('tests/leave.spec.js'));
  const leaveHardcodedYear = /fromDate:\s*["']2026-01-01["'][\s\S]{0,60}toDate:\s*["']2026-12-31["']/.test(readText('tests/leave.spec.js'));
  const lockFiles = fs.existsSync(XLSX_DIR) ? fs.readdirSync(XLSX_DIR).filter(f => f.startsWith('~$')) : [];
  const readmeCount = (readText('README.md').match(/\*\*(\d+) Test Cases\*\*/) || [])[1];
  const blockedModules = Array.from(new Set(records.filter(r => r.status === 'BLOCKED').map(r => r.module)));
  const leave01 = records.find(r => r.id === 'TC_LEAVE_01');

  // ── Observations & Recommendations (plain language; each item is backed by run evidence or code review) ──
  const issues = [
    (staleNote || teardownBug) && {
      severity: staleNote ? 'Critical' : 'High', area: 'Reporting',
      issue: `The automatic report step runs before the final test results are saved, so the reports produced during a test run show the previous run's results.${staleNote ? ` In this run ${staleCount} statuses were wrong${stalePassedButFailed ? `, including ${stalePassedButFailed} real failures shown as passed` : ''}.` : ''}`,
      rec: 'Generate the reports after the test run has finished (run "node utils/generateQAReport.js" after "npx playwright test") and remove the report step from globalTeardown in playwright.config.js.',
    },
    envFails > 0 && {
      severity: 'High', area: 'Test environment',
      issue: `${envFails} test case(s) failed because the public demo site did not load or respond in time. These are not application defects.`,
      rec: 'Run the suite against a dedicated, stable test environment and check that the site is available before the run starts.',
    },
    reviewedNow && leaveHardcodedYear && leave01 && leave01.status === 'FAIL' && {
      severity: 'High', area: 'Test data – Leave',
      issue: 'TC_LEAVE_01 assigns leave only for 2026 but applies for dates in 2027, and it enters dates as yyyy-mm-dd while the demo site uses yyyy-dd-mm. The leave request is rejected, so the test fails and blocks the remaining Leave tests.',
      rec: 'Assign the leave entitlement for the same year as the leave dates, and enter dates in the format the application uses (or pick them with the date picker).',
    },
    counts.BLOCKED > 0 && {
      severity: 'High', area: 'Test design',
      issue: `${counts.BLOCKED} test case(s) in ${blockedModules.join(', ')} were not executed because these tests run in sequence and stop after the first failure. Most of them are independent checks.`,
      rec: 'Run only truly dependent tests in sequence, and let independent checks run on their own so that one failure does not block them.',
    },
    notVerified > 0 && {
      severity: 'High', area: 'Test quality',
      issue: `${notVerified} passing test case(s) cannot detect a problem: their check always passes (for example, it confirms an element exists in code rather than on the page). They are marked "Not Verified" in the Actual Result.`,
      rec: 'Replace these checks with real visibility or content checks, for example await expect(locator).toBeVisible() or toHaveText(...).',
    },
    pw02Weak && pw02 && pw02.status !== 'PASS' || pw02Weak && pw02 && pw02.flaky === 'Yes' ? {
      severity: 'Medium', area: 'Test stability',
      issue: 'TC_PASSWORD_02 can fail intermittently: it counts the validation messages before they appear on the page.',
      rec: 'Wait for the validation messages to be visible before counting them.',
    } : null,
    leaveSwallow && {
      severity: 'Medium', area: 'Test setup – Leave',
      issue: 'If the Leave setup step fails, the error is only logged and the Leave tests still run, which makes a setup problem look like an application failure.',
      rec: 'Stop the Leave tests with a clear message when the setup step fails.',
    },
    {
      severity: 'Medium', area: 'Reporting',
      issue: 'The original report script (utils/zipReports.js) reads only the last attempt of each test and reports blocked tests as skipped, so some statuses can be wrong.',
      rec: 'Use utils/generateQAReport.js to produce the Excel, CSV and HTML reports.',
    },
    browsers.length < configured.length && {
      severity: 'Medium', area: 'Coverage',
      issue: `Only ${browsers.map(browserName).join(', ')} was tested; ${configured.filter(c => !browsers.includes(c)).map(browserName).join(' and ')} are configured but were not run.`,
      rec: 'Run the other configured browsers as well, or remove them from the configuration.',
    },
    readmeCount && Number(readmeCount) !== total && {
      severity: 'Low', area: 'Documentation',
      issue: `README states ${readmeCount} test cases (25 per module), but the suite contains ${total}.`,
      rec: 'Update the test counts in README.md.',
    },
    useNotes && {
      severity: 'Low', area: 'Test data',
      issue: 'The shared public demo site is changed by other users (user names, date format), so tests that depend on existing data are not stable.',
      rec: 'Use an isolated test environment with prepared test data.',
    },
    lockFiles.length > 0 && {
      severity: 'Low', area: 'Reporting',
      issue: `A report workbook was open in Excel (${lockFiles.join(', ')}), which can stop the reports from being updated.`,
      rec: 'Close the report files in Excel before running the tests.',
    },
  ].filter(Boolean).map(x => ({ ...x, issue: grammar(x.issue).trim(), rec: grammar(x.rec) }));
  const SEV = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  issues.sort((a, b) => SEV[a.severity] - SEV[b.severity]); // stable: keeps order within a severity
  records.forEach(r => { r.actual = grammar(r.actual); });

  // ── per-module summary (same shape as the consolidated one) ──
  const moduleSummary = (mrecs, title) => {
    const c = { PASS: 0, FAIL: 0, SKIPPED: 0, BLOCKED: 0 };
    mrecs.forEach(r => { c[r.status]++; });
    const t = mrecs.length;
    const p = n => (t ? (n / t) * 100 : 0);
    const modName = mrecs[0] ? mrecs[0].module : '';
    return {
      title: `OrangeHRM – ${title} Module – Test Execution Report`,
      total: t, counts: c, passPct: p(c.PASS), failPct: p(c.FAIL),
      modules: [{ module: modName, total: t, ...c }],
      runInfo: baseInfo.concat([['Module', modName], ['Total Test Cases', String(t)], ['Report Generated', istString(new Date().toISOString())]]),
      critical: observations(mrecs),
    };
  };

  // ── Target files: the EXISTING report files (same folders and names as utils/zipReports.js) ──
  const targets = [];
  for (const [key, title] of MODULE_FILES) {
    const mrecs = records.filter(r => r.moduleKey === key);
    if (!mrecs.length) continue;
    targets.push({ key, sheet: `${title} Module`, htmlTitle: `OrangeHRM - ${title} Module`, recs: mrecs, summary: moduleSummary(mrecs, title), issues: null,
      csv: path.join(CSV_DIR, `${key}_TestCases.csv`), xlsx: path.join(XLSX_DIR, `${key}_TestCases.xlsx`), html: path.join(HTML_DIR, `${key}_ExecutionReport.html`) });
  }
  targets.push({ key: 'master', sheet: 'OrangeHRM Test Cases', htmlTitle: 'OrangeHRM - Consolidated Execution Report', recs: records, summary, issues,
    csv: path.join(CSV_DIR, 'OrangeHRM_TestCases.csv'), xlsx: path.join(XLSX_DIR, 'OrangeHRM_TestCases.xlsx'), html: path.join(HTML_DIR, 'ExecutionReport.html') });

  // Refuse to start if any target is locked (e.g. open in Excel), so files are never left half-updated.
  const locked = targets.flatMap(t => [t.csv, t.xlsx, t.html]).filter(p => {
    if (!fs.existsSync(p)) return false;
    try { fs.closeSync(fs.openSync(p, 'r+')); return false; } catch (e) { return true; }
  });
  if (locked.length) throw new Error(`These files are open in another program (close them and re-run):\n  ${locked.map(rel).join('\n  ')}`);

  [CSV_DIR, XLSX_DIR, HTML_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));
  for (const t of targets) {
    writeCsv(t.csv, t.recs);
    await writeXlsx(t.xlsx, t.sheet, t.recs, t.summary, t.issues);
    writeHtml(t.html, t.summary.title, t.recs, t.summary, t.issues);
  }

  console.log(`Records: ${total} | PASS ${counts.PASS} (flaky ${flaky}, not verified ${notVerified}) | FAIL ${counts.FAIL} (env ${envFails}, test-data ${scriptFails}, assertion ${assertFails}) | SKIPPED ${counts.SKIPPED} | BLOCKED ${counts.BLOCKED}`);
  if (corrections) console.log(`Status corrections vs previous report: ${corrections.length}`);
  console.log(`✔ Updated ${targets.length * 3} existing report files (${targets.length} CSV, ${targets.length} XLSX, ${targets.length} HTML) in ${rel(CSV_DIR)}, ${rel(XLSX_DIR)}, ${rel(HTML_DIR)}`);
  if (MAKE_ZIP) await rebuildZip(targets);
}

// Rebuilds Results/Reports/HTML/Report.zip with the same layout as utils/zipReports.js.
// Staging happens in the OS temp folder; the existing Report.zip is replaced only after a successful build.
async function rebuildZip(targets) {
  const os = require('os');
  const { execFileSync } = require('child_process');
  const zipPath = path.join(HTML_DIR, 'Report.zip');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'orangehrm-report-'));
  const stage = path.join(work, 'stage');
  const tmpZip = path.join(work, 'Report.zip');
  try {
    const put = (src, dest) => { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(src, dest); };
    for (const t of targets) {
      if (t.key === 'master') put(t.html, path.join(stage, 'ExecutionReport.html'));
      else put(t.html, path.join(stage, 'HTMLReports', path.basename(t.html)));
      put(t.csv, path.join(stage, 'TestCases/CSV', path.basename(t.csv)));
      put(t.xlsx, path.join(stage, 'TestCases/XLSX', path.basename(t.xlsx)));
    }
    const pw = path.join(HTML_DIR, 'playwright-report');
    if (fs.existsSync(pw)) fs.cpSync(pw, path.join(stage, 'playwright-report'), { recursive: true });
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (fs.existsSync(tmpZip)) fs.unlinkSync(tmpZip);
        execFileSync('powershell', ['-NoProfile', '-Command', `$ErrorActionPreference='Stop'; Compress-Archive -Path '${stage}\\*' -DestinationPath '${tmpZip}' -Force`], { stdio: 'pipe' });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        await new Promise(r => setTimeout(r, 3000)); // antivirus / indexer may briefly lock freshly copied files
      }
    }
    if (lastErr) throw new Error(`Compress-Archive failed: ${String(lastErr.stderr || lastErr.message).split('\n')[0]}`);
    fs.copyFileSync(tmpZip, zipPath);
    console.log(`✔ Updated ${rel(zipPath)} (${(fs.statSync(zipPath).size / 1048576).toFixed(1)} MB)`);
  } catch (e) {
    console.error(`⚠ Report.zip was NOT updated (existing file left unchanged): ${e.message}`);
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true }); } catch (e) { /* temp only */ }
  }
}

main().catch(e => { console.error('❌', e.stack || e.message); process.exit(1); });
