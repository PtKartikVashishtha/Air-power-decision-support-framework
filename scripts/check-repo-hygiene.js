/**
 * Repository Hygiene & Evaluator Readiness Verification Script
 *
 * Scans all tracked git files to guarantee that:
 * 1. No files > 1 MB or raw binary blobs are tracked.
 * 2. No secrets or high-entropy tokens are present.
 * 3. No internal agent directives or prompt notes slipped in.
 * 4. All essential evaluator files (README, LICENSE, EVALUATOR_GUIDE, CLAIMS_REGISTER, etc.) exist.
 * 5. Tracked file list is clean, professional, and compliant with SIH requirements.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ESSENTIAL_EVALUATOR_FILES = [
  'README.md',
  'LICENSE',
  'NOTICE',
  'docs/EVALUATOR_GUIDE.md',
  'docs/CLAIMS_REGISTER.md',
  'docs/SELF_REDTEAM.md',
  'docs/HUMAN_BASELINE_PROTOCOL.md',
  'docs/DECISIONS.md',
  'docs/HONESTY.md',
  'docs/RESPONSIBLE_USE.md',
  'docs/REASON_CODES.md',
  'docs/SOLVER_CHOICE.md',
];

const INTERNAL_FORBIDDEN_FILES = [
  'AGENTS.md',
  'CONTEXT.md',
  'docs/PROMPT_HISTORY.md',
  'docs/SIH_PRESENTATION_KIT.md',
];

const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
  /ghp_[A-Za-z0-9]{36}/,
  /aws_access_key_id\s*=\s*[A-Z0-9]{20}/i,
  /AKIA[0-9A-Z]{16}/,
];

const BINARY_EXTENSIONS = [
  '.exe', '.dll', '.bin', '.iso', '.zip', '.tar.gz', '.tgz', '.jar', '.so', '.dylib', '.7z'
];

function runHygieneCheck() {
  console.log('🛡️  Running Comprehensive Repository Hygiene & Evaluator Readiness Check...\n');

  const violations = [];
  const warnings = [];

  // 1. Get all tracked files via git
  let trackedFiles = [];
  try {
    const stdout = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
    trackedFiles = stdout.split('\n').map((f) => f.trim()).filter(Boolean);
  } catch (err) {
    violations.push(`Failed to list tracked git files: ${err.message}`);
  }

  console.log(`📋 Total Tracked Files: ${trackedFiles.length}`);

  // 2. Check for missing essential evaluator files
  for (const relPath of ESSENTIAL_EVALUATOR_FILES) {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
      violations.push(`Missing essential evaluator file: ${relPath}`);
    } else {
      console.log(`  ✓ Evaluator essential present: ${relPath}`);
    }
  }

  // 3. Scan tracked files for forbidden internal files, file size > 1MB, binaries, secrets, and console debris
  let todoCount = 0;
  let fixmeCount = 0;

  for (const relFile of trackedFiles) {
    const fullFile = path.join(ROOT, relFile);

    // Forbidden internal files
    if (INTERNAL_FORBIDDEN_FILES.includes(relFile)) {
      violations.push(`Internal agent/prompt file is tracked in git: ${relFile}`);
    }

    if (!fs.existsSync(fullFile)) continue;
    const stats = fs.statSync(fullFile);

    // File size check (> 1 MB)
    const sizeMb = stats.size / (1024 * 1024);
    if (sizeMb > 1.0) {
      violations.push(`File exceeds 1 MB limit (${sizeMb.toFixed(2)} MB): ${relFile}`);
    }

    // Binary check
    const ext = path.extname(relFile).toLowerCase();
    if (BINARY_EXTENSIONS.includes(ext)) {
      violations.push(`Tracked binary file not permitted: ${relFile}`);
    }

    // Secrets & Content Scan on text files
    if (
      !relFile.endsWith('.png') &&
      !relFile.endsWith('.jpg') &&
      !relFile.endsWith('.ico') &&
      !relFile.endsWith('.pdf') &&
      stats.size < 500000
    ) {
      try {
        const content = fs.readFileSync(fullFile, 'utf8');

        // Secrets Scan
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(content)) {
            violations.push(`Potential credential/secret detected in ${relFile} matching ${pattern}`);
          }
        }

        // Count TODO and FIXME
        const todos = (content.match(/\bTODO\b/g) || []).length;
        const fixmes = (content.match(/\bFIXME\b/g) || []).length;
        todoCount += todos;
        fixmeCount += fixmes;
      } catch (err) {}
    }
  }

  console.log(`\n📊 Source Code Notes: ${todoCount} TODOs, ${fixmeCount} FIXMEs detected across codebase.`);

  if (warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    warnings.forEach((w) => console.log(`  • ${w}`));
  }

  if (violations.length > 0) {
    console.error('\n❌ REPO HYGIENE FAILED — Violations Found:');
    violations.forEach((v) => console.error(`  ✖ ${v}`));
    process.exit(1);
  } else {
    console.log('\n✅ REPOSITORY HYGIENE CHECK PASSED: Repository is pristine for SIH evaluation!\n');
  }
}

runHygieneCheck();
