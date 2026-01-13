import React from 'react';
import './QuotaSetupGuidePage.css';

const QuotaSetupGuidePage: React.FC = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="docs-page">
      <header className="docs-header">
        <h1>Quota Management Setup Guide</h1>
        <p className="docs-intro">
          This guide explains how to properly configure quotas in Voxco so they display correctly in the Quota Management portal.
        </p>
      </header>

      <nav className="docs-nav">
        <span className="docs-nav-label">Contents</span>
        <div className="docs-nav-links">
          <a onClick={() => scrollToSection('section-overview')}>1 Overview</a>
          <a onClick={() => scrollToSection('section-naming')}>2 Project Naming Conventions</a>
          <a onClick={() => scrollToSection('section-stype')}>3 STYPE Values (Sample Types)</a>
          <a onClick={() => scrollToSection('section-criterion')}>4 Criterion Field Setup</a>
          <a onClick={() => scrollToSection('section-label')}>5 Label Field Setup</a>
          <a onClick={() => scrollToSection('section-grouping')}>6 Quota Grouping Logic</a>
          <a onClick={() => scrollToSection('section-totals')}>7 Total Row Setup</a>
          <a onClick={() => scrollToSection('section-status')}>8 Status Mapping</a>
          <a onClick={() => scrollToSection('section-example')}>9 Complete Example</a>
          <a onClick={() => scrollToSection('section-skipped')}>10 Criteria That Cause Quotas to be Skipped</a>
          <a onClick={() => scrollToSection('section-troubleshooting')}>11 Troubleshooting</a>
          <a onClick={() => scrollToSection('section-reference')}>12 Quick Reference</a>
        </div>
      </nav>

      <main className="docs-content">
        <section id="section-overview">
          <h2>Overview</h2>
          <p>The Quota Management system pulls data from two sources:</p>
          <ul>
            <li><strong>Phone Quotas</strong>: From Voxco's strata/quota system (Landline and Cell projects)</li>
            <li><strong>Web Quotas</strong>: From A4Survey web projects (Panel, T2W, Email, Mailer)</li>
          </ul>
          <p>The system uses the <strong>Criterion</strong> field in Voxco to determine how quotas are grouped and categorized.</p>
        </section>

        <section id="section-naming">
          <h2>Project Naming Conventions</h2>
          <p>The system identifies project types by their name suffix:</p>
          <table className="docs-table">
            <thead>
              <tr>
                <th>Suffix</th>
                <th>Type</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>C</code></td><td>Cell</td><td><code>25001C</code></td></tr>
              <tr><td><code>COM</code></td><td>Combined (internal)</td><td><code>25001COM</code></td></tr>
              <tr><td><em>(none)</em></td><td>Landline</td><td><code>25001</code></td></tr>
            </tbody>
          </table>
          <p><strong>Important</strong>: Projects ending in <code>COM</code> are processed first and contain internal-only data.</p>
        </section>

        <section id="section-stype">
          <h2>STYPE Values (Sample Types)</h2>
          <p>Quotas are categorized by STYPE in the Criterion field:</p>
          <table className="docs-table">
            <thead>
              <tr>
                <th>STYPE</th>
                <th>Type</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Landline</td><td>Phone</td></tr>
              <tr><td>2</td><td>Cell</td><td>Phone</td></tr>
              <tr><td>3</td><td>Panel</td><td>Web</td></tr>
              <tr><td>4</td><td>T2W (Text-to-Web)</td><td>Web</td></tr>
              <tr><td>5</td><td>Email</td><td>Web</td></tr>
              <tr><td>6</td><td>Mailer</td><td>Web</td></tr>
            </tbody>
          </table>
        </section>

        <section id="section-criterion">
          <h2>Criterion Field Setup</h2>
          <p>The <strong>Criterion</strong> field is the key to proper quota mapping. Here's how to structure it:</p>

          <h3>Basic Format</h3>
          <code className="docs-code">VARIABLE=VALUE</code>

          <h3>Multiple Conditions</h3>
          <code className="docs-code">VARIABLE1=VALUE1 AND VARIABLE2=VALUE2</code>

          <h3>Adding STYPE to Quotas</h3>
          <p>To specify which sample type a quota belongs to, append <code>AND STYPE=X</code>:</p>
          <code className="docs-code">REGION=1 AND STYPE=1        # Landline quota for Region 1</code>
          <code className="docs-code">REGION=1 AND STYPE=2        # Cell quota for Region 1</code>
          <code className="docs-code">AGE=1 AND STYPE=3           # Panel quota for Age group 1</code>

          <h3>VTYPE for Internal Quotas</h3>
          <p>Add <code>AND VTYPE=1</code> for quotas that should only appear internally:</p>
          <code className="docs-code">REGION=1 AND VTYPE=1        # Internal-only quota</code>
        </section>

        <section id="section-label">
          <h2>Label Field Setup</h2>
          <p>The <strong>Label</strong> field controls display and total objectives.</p>

          <h3>Including Total Objectives</h3>
          <p>Add the total objective in parentheses at the end of the label:</p>
          <code className="docs-code">Region: Northeast (T:500)    # Total objective of 500</code>
          <code className="docs-code">Age: 18-34 (MIN:100)         # Minimum of 100</code>
          <code className="docs-code">Gender: Male (MAX:200)       # Maximum of 200</code>
          <code className="docs-code">Region: South (250)          # Simple total of 250</code>
          <p>The system extracts the last number in parentheses as the <code>TotalObjective</code>.</p>

          <h3>Excluding Rows from Calculations</h3>
          <p>Add <code>*</code> to exclude a row from status calculations:</p>
          <code className="docs-code">*Tracker Row (100)           # Won't affect Open/Closed status</code>

          <h3>Hiding from External Users</h3>
          <p>Add <code>!</code> to hide a row from external users:</p>
          <code className="docs-code">!Internal Tracking (50)      # Only visible to internal users</code>
        </section>

        <section id="section-grouping">
          <h2>Quota Grouping Logic</h2>

          <h3>How Quotas Are Grouped</h3>
          <ol>
            <li><strong>Same Criterion (minus STYPE/VTYPE)</strong> = Same row in the table</li>
            <li><strong>Different STYPE values</strong> = Different columns within that row</li>
          </ol>

          <p><strong>Example</strong>: These three quotas will appear as ONE row with three columns:</p>
          <table className="docs-table">
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Label</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>REGION=1 AND STYPE=1</code></td><td>Northeast (100)</td><td>Landline column</td></tr>
              <tr><td><code>REGION=1 AND STYPE=2</code></td><td>Northeast (100)</td><td>Cell column</td></tr>
              <tr><td><code>REGION=1 AND STYPE=3</code></td><td>Northeast (50)</td><td>Panel column</td></tr>
            </tbody>
          </table>

          <h3>Phone vs Web Separation</h3>
          <ul>
            <li>STYPE 1-2 appear under <strong>Phone</strong> section</li>
            <li>STYPE 3-6 appear under <strong>Web</strong> section</li>
          </ul>
        </section>

        <section id="section-totals">
          <h2>Total Row Setup</h2>
          <p>The total row is calculated from quotas with criterion <code>STYPE&gt;0</code> or individual <code>STYPE=X</code> entries.</p>
          <p>To properly populate totals:</p>
          <ol>
            <li>Create a quota with criterion <code>STYPE=1</code> for Landline totals</li>
            <li>Create a quota with criterion <code>STYPE=2</code> for Cell totals</li>
            <li>For web: Create quotas with <code>STYPE=3</code>, <code>STYPE=4</code>, etc.</li>
          </ol>
        </section>

        <section id="section-status">
          <h2>Status Mapping</h2>
          <p>Quota statuses are mapped as follows:</p>
          <table className="docs-table">
            <thead>
              <tr>
                <th>Voxco Status</th>
                <th>Portal Display</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>0 or "Open"</td><td>O (Open)</td></tr>
              <tr><td>1 or "Half Open"</td><td>H (Half Open)</td></tr>
              <tr><td>2 or "Closed"</td><td>C (Closed)</td></tr>
            </tbody>
          </table>
          <p><strong>Auto-calculated Status</strong>: The Total column status is automatically calculated:</p>
          <ul>
            <li><strong>Open (O)</strong>: If <code>TotalObjective - Frequency &gt; 0</code></li>
            <li><strong>Closed (C)</strong>: If quota is met or <code>TotalObjective = 0</code></li>
          </ul>
        </section>

        <section id="section-example">
          <h2>Complete Example</h2>

          <h3>Voxco Quota Setup</h3>
          <table className="docs-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Criterion</th>
                <th>Quota</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Total Landline (T:500)</td><td><code>STYPE=1</code></td><td>500</td><td>Open</td></tr>
              <tr><td>Total Cell (T:300)</td><td><code>STYPE=2</code></td><td>300</td><td>Open</td></tr>
              <tr><td>Northeast (T:200)</td><td><code>REGION=1 AND STYPE=1</code></td><td>100</td><td>Open</td></tr>
              <tr><td>Northeast (T:200)</td><td><code>REGION=1 AND STYPE=2</code></td><td>100</td><td>Open</td></tr>
              <tr><td>Southeast (T:200)</td><td><code>REGION=2 AND STYPE=1</code></td><td>100</td><td>Open</td></tr>
              <tr><td>Southeast (T:200)</td><td><code>REGION=2 AND STYPE=2</code></td><td>100</td><td>Open</td></tr>
              <tr><td>!Tracking (50)</td><td><code>TRACKER=1 AND VTYPE=1</code></td><td>50</td><td>Open</td></tr>
            </tbody>
          </table>

          <h3>Portal Display Result</h3>
          <table className="docs-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Total Obj</th>
                <th>Total Freq</th>
                <th>Landline</th>
                <th>Cell</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>Total</strong></td><td>800</td><td>-</td><td>-</td><td>-</td></tr>
              <tr><td>Northeast</td><td>200</td><td>-</td><td>100</td><td>100</td></tr>
              <tr><td>Southeast</td><td>200</td><td>-</td><td>100</td><td>100</td></tr>
            </tbody>
          </table>
          <p><em>(Tracking row hidden from external users)</em></p>
        </section>

        <section id="section-skipped" className="docs-warning-section">
          <h2>Criteria That Cause Quotas to be Skipped</h2>
          <p className="docs-warning">The system has several conditions that will cause quotas to be <strong>completely skipped</strong> during processing. Understanding these is critical to ensure your quotas appear correctly.</p>

          <h3>Summary Table: What Gets Skipped</h3>
          <table className="docs-table docs-table-warning">
            <thead>
              <tr>
                <th>Condition</th>
                <th>Where Skipped</th>
                <th>Effect</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>STYPE&gt;2</code> in criterion</td><td>Web processing</td><td>Quota ignored entirely</td></tr>
              <tr><td><code>TFLAG</code> in criterion</td><td>Web processing</td><td>Quota ignored entirely</td></tr>
              <tr><td><code>STYPE=1</code> or <code>STYPE=2</code> in web project</td><td>Web processing</td><td>Quota ignored (phone types in web)</td></tr>
              <tr><td><code>STYPE=3,4,5,6</code> in phone project</td><td>Phone processing</td><td>Quota ignored (web types in phone)</td></tr>
              <tr><td><code>STYPE&gt;0</code> criterion</td><td>External users only</td><td>Row removed from display</td></tr>
              <tr><td><code>!</code> in label</td><td>External users only</td><td>Row removed from display</td></tr>
              <tr><td>Non-<code>com</code> rows when <code>com</code> data exists</td><td>External users only</td><td>Rows without com data removed</td></tr>
            </tbody>
          </table>

          <h3>1. STYPE&gt;2 (Web Processing)</h3>
          <p><strong>What it means</strong>: Matches all records where STYPE is greater than 2 (Panel, T2W, Email, Mailer)</p>
          <p><strong>What happens</strong>: Quotas with <code>STYPE&gt;2</code> in their criterion are <strong>completely skipped</strong>.</p>
          <code className="docs-code">{`// From the code:
if (Criterion.includes('STYPE>2') || Criterion.includes('TFLAG')) {
  continue;  // Skip this quota entirely
}`}</code>
          <p><strong>Example that WON'T appear</strong>:</p>
          <code className="docs-code">{`Criterion: REGION=1 AND STYPE>2
Label: Northeast Web (100)`}</code>
          <p><strong>How to fix</strong>: Use specific STYPE values instead:</p>
          <table className="docs-table">
            <thead>
              <tr><th>Instead of...</th><th>Use...</th></tr>
            </thead>
            <tbody>
              <tr><td><code>REGION=1 AND STYPE&gt;2</code></td><td><code>REGION=1 AND STYPE=3</code> (Panel)</td></tr>
              <tr><td></td><td><code>REGION=1 AND STYPE=4</code> (T2W)</td></tr>
              <tr><td></td><td><code>REGION=1 AND STYPE=5</code> (Email)</td></tr>
            </tbody>
          </table>

          <h3>2. TFLAG (Web Processing)</h3>
          <p><strong>What it means</strong>: Internal tracking flag criterion</p>
          <p><strong>What happens</strong>: Any criterion containing <code>TFLAG</code> is skipped entirely.</p>
          <p><strong>Example that WON'T appear</strong>:</p>
          <code className="docs-code">{`Criterion: TFLAG=1
Label: Tracking Flag (50)`}</code>
          <p><strong>Why</strong>: TFLAG is used for internal dialer tracking and shouldn't appear in quota reports.</p>

          <h3>3. Phone STYPEs in Web Projects (STYPE=1 or STYPE=2)</h3>
          <p><strong>What happens</strong>: When processing web project quotas, any quota with <code>STYPE=1</code> (Landline) or <code>STYPE=2</code> (Cell) is skipped.</p>
          <code className="docs-code">{`// From the code:
if (stypeId === '1' || stypeId === '2') {
  continue;  // Skip phone types in web projects
}`}</code>
          <p><strong>Why</strong>: Phone quotas belong in phone projects, not web projects. This prevents double-counting.</p>

          <h3>4. Web STYPEs in Phone Projects (STYPE=3,4,5,6)</h3>
          <p><strong>What happens</strong>: When processing phone project quotas, any quota with Panel, T2W, Email, or Mailer STYPE is skipped.</p>
          <code className="docs-code">{`// From the code:
const webTypes = ['Panel', 'T2W', 'Email', 'Mailer'];
if (webTypes.includes(subType)) {
  continue;  // Skip web types in phone projects
}`}</code>
          <p><strong>Why</strong>: Web quotas belong in web projects, not phone projects.</p>

          <h3>5. STYPE&gt;0 Tracker Row (External Users Only)</h3>
          <p><strong>What happens</strong>: For external users, any row with criterion <code>STYPE&gt;0</code> is removed.</p>
          <code className="docs-code">{`// From the code:
const trackerKey = Object.keys(data).find((key) => key === 'STYPE>0');
if (trackerKey) {
  delete data[trackerKey];
}`}</code>
          <p><strong>Why</strong>: <code>STYPE&gt;0</code> is typically used as an overall tracker row that shouldn't be visible to clients.</p>
          <p><strong>Note</strong>: Internal users will still see this row.</p>

          <h3>6. Exclamation Mark in Label (External Users Only)</h3>
          <p><strong>What happens</strong>: For external users, any row where the label contains <code>!</code> is removed.</p>
          <code className="docs-code">{`// From the code:
if (label.includes('!')) {
  shouldRemoveRow = true;
}`}</code>
          <p><strong>Example</strong>:</p>
          <code className="docs-code">Label: !Internal Tracking (50)</code>
          <p><strong>Why</strong>: The <code>!</code> prefix is a convention to mark internal-only quotas.</p>
          <p><strong>Note</strong>: Internal users will still see these rows.</p>

          <h3>7. COM Data Filtering (External Users Only)</h3>
          <p><strong>What happens</strong>: If ANY quota has data in the <code>com</code> column (from projects ending in "COM"), then for external users, ALL rows that DON'T have <code>com</code> data are removed.</p>
          <code className="docs-code">{`// From the code:
const hasComData = quotaKeys.some(quotaKey => {
  const quotaData = data[quotaKey];
  return quotaData?.Phone?.com || quotaData?.Web?.com;
});

if (hasComData) {
  const rowHasComData = data[quotaKey]?.Phone?.com || data[quotaKey]?.Web?.com;
  if (!rowHasComData) {
    shouldRemoveRow = true;
  }
}`}</code>
          <p><strong>Why</strong>: COM projects are typically used for combined/client-facing data. If COM data exists, external users should only see those specific quotas.</p>
          <p><strong>Important</strong>: This is an all-or-nothing filter. If you have COM data for some quotas, make sure ALL quotas you want external users to see have corresponding COM entries.</p>

          <h3>8. Projects Excluded by Name Pattern</h3>
          <p><strong>What happens</strong>: Phone projects with <code>WOE</code> in the name are excluded from queries entirely.</p>
          <code className="docs-code">{`-- From ProjectInfoServices.js:
WHERE name NOT LIKE '%WOE%'`}</code>
          <p><strong>Why</strong>: WOE (Work Order Entry or similar) projects are typically test or administrative projects.</p>

          <h3>Visual Summary: Processing Flow</h3>
          <code className="docs-code docs-code-block">{`PHONE PROJECT QUOTAS
├── STYPE=3,4,5,6 (web types) → SKIPPED
└── STYPE=1,2 or no STYPE → PROCESSED
    └── Grouped by criterion (minus STYPE/VTYPE)

WEB PROJECT QUOTAS
├── Contains 'STYPE>2' → SKIPPED
├── Contains 'TFLAG' → SKIPPED
├── STYPE=1 or STYPE=2 → SKIPPED
└── STYPE=3,4,5,6 or no STYPE → PROCESSED
    └── Grouped by criterion (minus STYPE/VTYPE)

EXTERNAL USER FILTERING (after processing)
├── Criterion = 'STYPE>0' → REMOVED
├── Label contains '!' → REMOVED
└── If COM data exists anywhere:
    └── Rows without COM data → REMOVED`}</code>
        </section>

        <section id="section-troubleshooting">
          <h2>Troubleshooting</h2>

          <h3>Quotas Not Appearing</h3>
          <ol>
            <li>Check that the project name matches the expected pattern (no <code>WOE</code> in name)</li>
            <li>Verify the Criterion field has valid syntax</li>
            <li>Ensure STYPE values are 1-6</li>
            <li><strong>Check for skip conditions</strong>:
              <ul>
                <li>Does the criterion contain <code>STYPE&gt;2</code>? Use specific values instead</li>
                <li>Does the criterion contain <code>TFLAG</code>? This is always skipped</li>
                <li>Is a phone STYPE (1,2) in a web project? Move to phone project</li>
                <li>Is a web STYPE (3,4,5,6) in a phone project? Move to web project</li>
              </ul>
            </li>
          </ol>

          <h3>Quotas Not Appearing for External Users</h3>
          <ol>
            <li>Does the label contain <code>!</code>? Remove it for external visibility</li>
            <li>Is the criterion <code>STYPE&gt;0</code>? This is hidden from external users</li>
            <li>Do you have COM project data? If so, ensure the quota has COM data too</li>
          </ol>

          <h3>Wrong Column Placement</h3>
          <ul>
            <li>Verify the STYPE value in the Criterion matches the intended type</li>
            <li>Check for typos in <code>STYPE=X</code> syntax</li>
          </ul>

          <h3>Missing Totals</h3>
          <ul>
            <li>Ensure you have quotas with criterion <code>STYPE=1</code>, <code>STYPE=2</code>, etc.</li>
            <li>Check that the Label includes a total objective in parentheses</li>
          </ul>

          <h3>Rows Not Combining</h3>
          <ul>
            <li>The base Criterion (without STYPE/VTYPE) must be exactly the same</li>
            <li>Example: <code>REGION=1</code> must match <code>REGION=1</code>, not <code>Region=1</code></li>
          </ul>
        </section>

        <section id="section-reference">
          <h2>Quick Reference</h2>
          <table className="docs-table">
            <thead>
              <tr>
                <th>Goal</th>
                <th>How To</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Set total objective</td><td>Add <code>(T:XXX)</code> or <code>(XXX)</code> to Label</td></tr>
              <tr><td>Assign to Landline</td><td>Add <code>AND STYPE=1</code> to Criterion</td></tr>
              <tr><td>Assign to Cell</td><td>Add <code>AND STYPE=2</code> to Criterion</td></tr>
              <tr><td>Assign to Panel</td><td>Add <code>AND STYPE=3</code> to Criterion</td></tr>
              <tr><td>Hide from external</td><td>Add <code>!</code> to start of Label</td></tr>
              <tr><td>Exclude from calcs</td><td>Add <code>*</code> to start of Label</td></tr>
              <tr><td>Internal-only quota</td><td>Add <code>AND VTYPE=1</code> to Criterion</td></tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default QuotaSetupGuidePage;
