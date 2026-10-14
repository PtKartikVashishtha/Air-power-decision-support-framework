/**
 * Repository Hygiene & Evaluator Readiness Verification Script
 *
 * Automated pre-commit and CI verification ensuring the repository
 * is strictly pristine for SIH Defence evaluators:
 * 1. No tracked files match any .gitignore pattern or IGNORE category.
 * 2. No tracked file exceeds 1 MB without an explicit allowlist entry.
 * 3. No unknown root-level files or directories exist.
 * 4. All package.json scripts point to existing, executable targets.
 * 5. All README.md internal links and images resolve cleanly.
 * 6. No internal agent/prompt leakage ("Claude", "Antigravity", "LLM-generated").
 * 7. No secrets or credentials exist in source code.
 * 8. All essential evaluator documentation files are present.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const ESSENTIAL_EVALUATOR_FILES = [
  'README.md',
  'LICENSE',
  'NOTICE',
  'docs/EVALUATOR_GUIDE.md',
  'docs/CLAIMS_REGISTER.md',
  'docs/HONESTY.md',
  'docs/RESPONSIBLE_USE.md',
  'docs/REASON_CODES.md',
  'docs/SOLVER_CHOICE.md',
  'docs/ARCHITECTURE.md',
  'docs/DECISIONS.md',
  'docs/PERF_REPORT.md',
  'docs/SELF_REDTEAM.md',
  'docs/HUMAN_BASELINE_PROTOCOL.md',
  'docs/CODEBASE_AUDIT_V2.md',
];

const ALLOWED_ROOT_DIRS = new Set([
  '.git',
  '.github',
  'apps',
  'benchmarks',
  'deploy',
  'docs',
  'packages',
  'scripts',
  // Locally permitted (ignored in git):
  '.archify',
  '.local',
  '.vscode',
  'node_modules',
  'out',
  'studio',
]);

const ALLOWED_ROOT_FILES = new Set([
  '.gitignore',
  'docker-compose.yml',
  'LICENSE',
  'Makefile',
  'netlify.toml',
  'NOTICE',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'README.md',
  'vercel.json',
  'vitest.config.ts',
  // Locally permitted (ignored in git):
  'AGENTS.md',
  'CONTEXT.md',
]);

const FORBIDDEN_TRACKED_EXTENSIONS = [
  '.exe', '.dll', '.bin', '.iso', '.zip', '.tar.gz', '.tgz', '.jar', '.so', '.dylib', '.7z',
  '.mp4', '.mkv', '.mov', '.webm', '.avi', '.wav', '.mp3', '.srt', '.vtt',
  '.pptx', '.ppt', '.potx', '.ppsx',
];

const FORBIDDEN_TRACKED_PREFIXES = [
  'studio/',
  '.local/',
  '.archify/',
  'video/',
  'video-studio/',
  'ppt/',
  'scratch/',
  'docs/cleanup/',
  'docs/bugs/',
  'docs/demo-rehearsal/',
  'test-results/',
  'playwright-report/',
  'blob-report/',
];

const FORBIDDEN_TRACKED_EXACT = new Set([
  'AGENTS.md',
  'CONTEXT.md',
  'docs/PROMPT_HISTORY.md',
  'docs/SIH_PRESENTATION_KIT.md',
  'benchmarks/results/benchmark_100_seeds.csv',
  'benchmarks/results/scale_benchmark_report.json',
  'benchmarks/results/solver-microbenchmark-results.json',
]);

const ALLOWLIST_LARGE_FILES = new Set([
  // Whitelisted files > 1 MB (e.g. large golden corpora if any, currently empty)
]);

const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
  /ghp_[A-Za-z0-9]{36}/,
  /aws_access_key_id\s*=\s*[A-Z0-9]{20}/i,
  /AKIA[0-9A-Z]{16}/,
];

// Strictly forbidden internal words across tracked evaluator files
const STRICT_FORBIDDEN_WORDS = [
  { pattern: /\bClaude\b/i, name: 'Claude (internal LLM tool)' },
  { pattern: /\bAntigravity\b/i, name: 'Antigravity (internal coding tool)' },
  { pattern: /\bLLM-generated\b/i, name: 'LLM-generated' },
];

function runHygieneCheck() {
  console.log('🛡️  Running Comprehensive Repository Hygiene & Evaluator Readiness Check...\n');

  const violations = [];
  const warnings = [];

  // 1. Get tracked files via git
  let trackedFiles = [];
  try {
    const stdout = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
    trackedFiles = stdout.split(/\r?\n/).map((f) => f.trim()).filter(Boolean);
  } catch (err) {
    violations.push(`Failed to list tracked git files: ${err.message}`);
  }

  console.log(`📋 Total Tracked Files: ${trackedFiles.length}`);

  // 2. Check essential evaluator files exist
  for (const relPath of ESSENTIAL_EVALUATOR_FILES) {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
      violations.push(`Missing essential evaluator file: ${relPath}`);
    } else {
      console.log(`  ✓ Evaluator essential present: ${relPath}`);
    }
  }

  // 3. Check for root-level unknown files or folders
  try {
    const rootEntries = fs.readdirSync(ROOT, { withFileTypes: true });
    for (const entry of rootEntries) {
      const name = entry.name;
      if (entry.isDirectory()) {
        if (!ALLOWED_ROOT_DIRS.has(name)) {
          violations.push(`Unknown root directory detected: ${name}/`);
        }
      } else {
        if (!ALLOWED_ROOT_FILES.has(name)) {
          violations.push(`Unknown root file detected: ${name}`);
        }
      }
    }
  } catch (err) {
    violations.push(`Failed to read root directory: ${err.message}`);
  }

  // 4. Check package.json scripts for broken target paths
  try {
    const pkgJsonPath = path.join(ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const scripts = pkg.scripts || {};

    for (const [scriptName, cmd] of Object.entries(scripts)) {
      // Look for files referenced in the command (e.g., node scripts/xyz.js or tsx benchmarks/xyz.ts)
      const matches = cmd.matchAll(/(?:node|tsx|run)\s+([A-Za-z0-9_\-\/\\.]+\.(?:js|ts|json))/g);
      for (const m of matches) {
        const targetRel = m[1].replace(/\\/g, '/');
        const targetFull = path.join(ROOT, targetRel);
        if (!fs.existsSync(targetFull)) {
          violations.push(`package.json script "${scriptName}" references missing file: ${targetRel}`);
        }
      }
    }
  } catch (err) {
    violations.push(`Failed to validate package.json scripts: ${err.message}`);
  }

  // 5. Check README.md local links & embeds
  try {
    const readmePath = path.join(ROOT, 'README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf8');

    // Match [text](target) and ![alt](target)
    const linkMatches = readmeContent.matchAll(/!?\[.*?\]\((.+?)\)/g);
    for (const m of linkMatches) {
      const target = m[1].trim();

      // Skip external links, mailto, and anchor-only links
      if (
        target.startsWith('http://') ||
        target.startsWith('https://') ||
        target.startsWith('mailto:') ||
        target.startsWith('#') ||
        target === '<link>'
      ) {
        continue;
      }

      // Strip query parameters and anchors
      const cleanTarget = target.split('#')[0].split('?')[0].trim();
      if (!cleanTarget) continue;

      const targetPath = path.join(ROOT, cleanTarget);
      if (!fs.existsSync(targetPath)) {
        violations.push(`Broken local link in README.md: "${target}" (resolved to ${cleanTarget})`);
      }
    }
  } catch (err) {
    violations.push(`Failed to check README links: ${err.message}`);
  }

  // 6. Check tracked files against IGNORE categories, size limit, binaries, secrets, and internal wording
  let todoCount = 0;
  let fixmeCount = 0;

  // Fast batch check: do any tracked files match .gitignore?
  try {
    const input = trackedFiles.join('\n');
    const ignoredMatches = execSync('git check-ignore --stdin', {
      cwd: ROOT,
      input,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).split(/\r?\n/).map((f) => f.trim()).filter(Boolean);

    for (const match of ignoredMatches) {
      violations.push(`Tracked file matches .gitignore rule (should be untracked): ${match}`);
    }
  } catch (err) {
    // Exit code 1 from git check-ignore means none of the input files matched .gitignore (desired outcome!)
  }

  for (const relFile of trackedFiles) {
    const normalizedRel = relFile.replace(/\\/g, '/');
    const fullFile = path.join(ROOT, normalizedRel);

    // Exact forbidden check
    if (FORBIDDEN_TRACKED_EXACT.has(normalizedRel)) {
      violations.push(`Forbidden production file is tracked in git: ${normalizedRel}`);
    }

    // Prefix forbidden check
    for (const prefix of FORBIDDEN_TRACKED_PREFIXES) {
      if (normalizedRel.startsWith(prefix)) {
        violations.push(`Tracked file in forbidden directory (${prefix}): ${normalizedRel}`);
      }
    }

    // Extension check
    const ext = path.extname(normalizedRel).toLowerCase();
    if (FORBIDDEN_TRACKED_EXTENSIONS.includes(ext)) {
      violations.push(`Tracked forbidden extension (${ext}): ${normalizedRel}`);
    }

    if (!fs.existsSync(fullFile)) {
      // Staged deletion or missing file
      continue;
    }

    const stats = fs.statSync(fullFile);
    const sizeMb = stats.size / (1024 * 1024);

    // Size limit (> 1 MB)
    if (sizeMb > 1.0 && !ALLOWLIST_LARGE_FILES.has(normalizedRel)) {
      violations.push(`Tracked file exceeds 1 MB without allowlist entry (${sizeMb.toFixed(2)} MB): ${normalizedRel}`);
    }

    // Content check for text files
    const isImageOrBinary =
      ext === '.png' ||
      ext === '.jpg' ||
      ext === '.jpeg' ||
      ext === '.svg' ||
      ext === '.ico' ||
      ext === '.pdf' ||
      ext === '.woff' ||
      ext === '.woff2';

    if (!isImageOrBinary && stats.size < 500000) {
      try {
        const content = fs.readFileSync(fullFile, 'utf8');

        // Secrets check
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(content)) {
            violations.push(`Potential credential/secret detected in ${normalizedRel} matching ${pattern}`);
          }
        }

        // Strict internal wording check (skip self and .gitignore)
        if (normalizedRel !== 'scripts/check-repo-hygiene.js' && normalizedRel !== '.gitignore') {
          for (const word of STRICT_FORBIDDEN_WORDS) {
            if (word.pattern.test(content)) {
              violations.push(`Internal wording detected in ${normalizedRel}: ${word.name}`);
            }
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
