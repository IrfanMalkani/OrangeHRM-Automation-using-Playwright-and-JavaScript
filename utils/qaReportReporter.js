/**
 * Playwright reporter that builds the QA reports (Excel / CSV / HTML / Report.zip) after a test run.
 *
 * It runs in onExit(), which Playwright calls after every reporter has finished – so the JSON
 * reporter has already written Results/Reports/JSON/results.json and the reports show this run.
 * (A globalTeardown runs before the reporters finish and would read the previous run's results.)
 */
const { spawnSync } = require('child_process');
const path = require('path');

class QAReportReporter {
  printsToStdio() {
    return false;
  }

  async onExit() {
    const script = path.join(__dirname, 'generateQAReport.js');
    console.log('\nGenerating QA reports (Excel / CSV / HTML)...');
    const res = spawnSync(process.execPath, [script], { stdio: 'inherit' });
    if (res.status !== 0) console.error(`QA report generation failed (exit code ${res.status}). Run "node utils/generateQAReport.js" manually.`);
  }
}

module.exports = QAReportReporter;
