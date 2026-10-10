const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const DIRS = [
  'apps/web',
  'apps/api',
  'packages/optimizer',
  'packages/shared',
  'packages/sim',
  'scripts',
  'benchmarks',
  'deploy',
  'docs',
];

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /\.git/,
  /\.gemini/,
  /docs[\\\/]bugs[\\\/]overflow-report/,
  /\.png$/,
  /\.jpg$/,
  /\.webp$/,
  /\.pdf$/,
  /\.ico$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.lock$/,
  /\.local/,
  /scratch/,
  /out[\\\/]/,
];

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (IGNORE_PATTERNS.some((pattern) => pattern.test(fullPath))) return;

    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const allInventory = [];

DIRS.forEach((relDir) => {
  const absDir = path.join(ROOT, relDir);
  const files = getAllFiles(absDir);
  files.forEach((f) => {
    const relPath = path.relative(ROOT, f).replace(/\\/g, '/');
    let content = '';
    let loc = 0;
    try {
      content = fs.readFileSync(f, 'utf8');
      loc = content.split('\n').length;
    } catch (e) {
      loc = 0;
    }

    let owner = 'Repository Root';
    if (relPath.startsWith('apps/web')) owner = '@air-power/web';
    else if (relPath.startsWith('apps/api')) owner = '@air-power/api';
    else if (relPath.startsWith('packages/optimizer')) owner = '@air-power/optimizer';
    else if (relPath.startsWith('packages/shared')) owner = '@air-power/shared';
    else if (relPath.startsWith('packages/sim')) owner = '@air-power/sim';
    else if (relPath.startsWith('scripts')) owner = 'Tooling / QA';
    else if (relPath.startsWith('benchmarks')) owner = 'Benchmarks & Rigour';
    else if (relPath.startsWith('deploy')) owner = 'Deployment / Docker';
    else if (relPath.startsWith('docs')) owner = 'Documentation / Architecture';

    let purpose = 'General implementation';
    if (relPath.includes('test')) purpose = 'Automated test suite';
    else if (relPath.endsWith('.md')) purpose = 'Documentation / Architecture specs';
    else if (relPath.endsWith('.json')) purpose = 'Configuration / Mock data / Manifest';
    else if (relPath.includes('components/')) purpose = 'UI Component';
    else if (relPath.includes('optimizer/src')) purpose = 'Optimization algorithm / heuristic';
    else if (relPath.includes('sim/src')) purpose = 'Simulation / Sensor / Wargame model';
    else if (relPath.includes('shared/src')) purpose = 'Shared types, schemas, utilities, i18n';
    else if (relPath.includes('api/src')) purpose = 'Fastify backend endpoint / routes';

    allInventory.push({
      path: relPath,
      loc,
      owner,
      purpose,
    });
  });
});

allInventory.sort((a, b) => b.loc - a.loc);

let totalLoc = allInventory.reduce((acc, f) => acc + f.loc, 0);

let md = `# INVENTORY.md — Complete Codebase Source Inventory v2\n`;
md += `*Generated during Full Codebase Audit v2 (${new Date().toISOString()})*\n\n`;
md += `## 1. Summary Statistics\n`;
md += `- **Total Tracked Files**: ${allInventory.length}\n`;
md += `- **Total Lines of Code (LOC)**: ${totalLoc.toLocaleString()}\n\n`;

// Group by owner
const grouped = {};
allInventory.forEach((f) => {
  grouped[f.owner] = grouped[f.owner] || { files: 0, loc: 0, list: [] };
  grouped[f.owner].files += 1;
  grouped[f.owner].loc += f.loc;
  grouped[f.owner].list.push(f);
});

md += `### Breakdown by Module\n`;
md += `| Owner Module | Total Files | Total LOC | Purpose & Responsibility |\n`;
md += `|---|---|---|---|\n`;
Object.entries(grouped).forEach(([owner, data]) => {
  md += `| **${owner}** | ${data.files} | ${data.loc.toLocaleString()} | Subsystem code, tests, configs |\n`;
});
md += `\n---\n\n## 2. Complete File Inventory\n\n`;
md += `| File Path | LOC | Owner Module | Purpose / Functionality |\n`;
md += `|---|---|---|---|\n`;

allInventory.forEach((f) => {
  md += `| \`${f.path}\` | ${f.loc} | ${f.owner} | ${f.purpose} |\n`;
});

const outPath = path.join(ROOT, 'docs', 'audit', 'INVENTORY.md');
fs.writeFileSync(outPath, md, 'utf8');
console.log(`Inventory successfully written to ${outPath} (${allInventory.length} files, ${totalLoc} total LOC).`);
