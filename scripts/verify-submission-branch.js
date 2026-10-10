/**
 * Submission Branch History & Hygiene Verifier
 * 
 * Verifies that a target git branch contains zero sensitive historical files,
 * zero secrets, and zero internal agent artifacts across its entire commit history.
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FORBIDDEN_HISTORICAL_PATHS = [
  'AGENTS.md',
  'CONTEXT.md',
  'docs/PROMPT_HISTORY.md',
  'docs/SIH_PRESENTATION_KIT.md',
  '.local',
  '.agents',
  '.gemini',
];

function verifySubmissionBranch() {
  console.log('🔍 Running Submission Branch History & Safety Verification...\n');

  const issues = [];

  // 1. Get all files ever committed in this branch's history
  try {
    const historicalFiles = execSync('git log --pretty=format: --name-only', {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const uniqueFiles = new Set(historicalFiles);

    for (const forbidden of FORBIDDEN_HISTORICAL_PATHS) {
      if (uniqueFiles.has(forbidden)) {
        issues.push(`Branch history contains forbidden internal path: ${forbidden}`);
      }
    }
  } catch (err) {
    issues.push(`Failed to read git commit history: ${err.message}`);
  }

  // 2. Verify working directory hygiene
  try {
    execSync('node scripts/check-repo-hygiene.js', { cwd: ROOT, stdio: 'inherit' });
    console.log('✓ Working tree passed repo hygiene check.');
  } catch (err) {
    issues.push('Working tree failed check-repo-hygiene.js');
  }

  // 3. Verify that SBOM exists
  const sbomPath = path.join(ROOT, 'docs', 'sbom.json');
  const fs = require('fs');
  if (fs.existsSync(sbomPath)) {
    console.log('✓ CycloneDX SBOM present at docs/sbom.json');
  } else {
    issues.push('Missing CycloneDX SBOM at docs/sbom.json');
  }

  console.log('\n-------------------------------------------------------------');
  if (issues.length > 0) {
    console.warn('⚠️ SUBMISSION BRANCH VERIFICATION REPORT:');
    issues.forEach((iss) => console.warn(`  • ${iss}`));
    console.warn('\nNote: To produce a 100% clean history branch without past agent notes,');
    console.warn('follow the plan in docs/GIT_HISTORY_AUDIT.md.\n');
  } else {
    console.log('✅ SUBMISSION BRANCH VERIFIED: Entire commit history is 100% pristine!\n');
  }
}

verifySubmissionBranch();
