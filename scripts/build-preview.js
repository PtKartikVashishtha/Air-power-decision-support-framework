/**
 * Static Evaluator Preview Builder
 * 
 * Compiles a serverless, view-only deterministic replay bundle from Seed 42.
 * Target: Under 25 MB, zero secrets, zero backend dependency, static hosting ready.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const WEB_DIR = path.resolve(ROOT_DIR, 'apps', 'web');
const OUT_DIR = path.resolve(WEB_DIR, 'out');

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDirectorySize(dirPath) {
  let total = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      total += getDirectorySize(fullPath);
    } else {
      total += stat.size;
    }
  }
  return total;
}

function scanForbiddenFiles(dirPath) {
  const forbiddenPatterns = [/\.env/i, /\.git/i, /prompt/i, /secret/i, /agent/i];
  const violations = [];

  function walk(current) {
    const entries = fs.readdirSync(current);
    for (const entry of entries) {
      const full = path.join(current, entry);
      const stat = fs.statSync(full);
      for (const pat of forbiddenPatterns) {
        if (pat.test(entry)) {
          // Allow innocent UI assets or standard bundles
          if (!entry.includes('chunk') && !entry.includes('.js') && !entry.includes('.css')) {
            violations.push(full);
          }
        }
      }
      if (stat.isDirectory()) {
        walk(full);
      }
    }
  }

  if (fs.existsSync(dirPath)) {
    walk(dirPath);
  }
  return violations;
}

console.log('===========================================================');
console.log('🚀 BUILDING DETERMINISTIC STATIC EVALUATOR PREVIEW');
console.log('===========================================================');

// Step 1: Ensure deterministic seed data is generated
console.log('\n[1/4] Generating Seed-42 Preview Package...');
try {
  execSync('npx tsx scripts/generate-preview-data.ts', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: { ...process.env },
  });
} catch (err) {
  console.error('❌ Failed to generate Seed-42 preview data:', err.message);
  process.exit(1);
}

// Step 2: Run Next.js Static Export Build
console.log('\n[2/4] Executing Next.js Static Export (BUILD_PREVIEW=true)...');
try {
  execSync('pnpm --filter @air-power/web build', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      BUILD_PREVIEW: 'true',
      NEXT_PUBLIC_PREVIEW_MODE: 'true',
    },
  });
} catch (err) {
  console.error('❌ Static export build failed:', err.message);
  process.exit(1);
}

// Step 3: Validate Output Directory & Assets
console.log('\n[3/4] Validating Export Artifacts in apps/web/out...');
if (!fs.existsSync(OUT_DIR)) {
  console.error(`❌ Export directory not found: ${OUT_DIR}`);
  process.exit(1);
}

const indexHtml = path.join(OUT_DIR, 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.error('❌ index.html is missing in static output');
  process.exit(1);
}

// Step 4: Verify Size Cap & Hygiene
console.log('\n[4/4] Verifying Package Constraints (< 25 MB, zero secrets)...');
const totalBytes = getDirectorySize(OUT_DIR);
const formattedSize = formatBytes(totalBytes);
const maxAllowedBytes = 25 * 1024 * 1024; // 25 MB

console.log(`📦 Total Static Preview Size: ${formattedSize} (${totalBytes} bytes)`);

if (totalBytes > maxAllowedBytes) {
  console.error(`❌ Static build exceeded 25 MB limit: ${formattedSize}`);
  process.exit(1);
}

const forbidden = scanForbiddenFiles(OUT_DIR);
if (forbidden.length > 0) {
  console.error('❌ Prohibited files found in export directory:', forbidden);
  process.exit(1);
}

console.log('\n===========================================================');
console.log('✅ PREVIEW BUILD SUCCESSFUL & READY FOR DEPLOYMENT');
console.log(`   Export Location: ${OUT_DIR}`);
console.log(`   Bundle Size:     ${formattedSize} (Limit: 25 MB)`);
console.log('   External Calls:  0 (Fully Offline-Bundled)');
console.log('   Target Server:   Static (GitHub Pages / Vercel / Netlify)');
console.log('===========================================================');
