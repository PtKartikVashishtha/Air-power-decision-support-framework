const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SRC_DIRS = [
  'packages/shared/src',
  'packages/optimizer/src',
  'packages/sim/src',
  'apps/api/src',
  'apps/web/src',
];

function getTsFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getTsFiles(full));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(full);
    }
  });
  return results;
}

const fileMap = new Map();
const allFiles = [];

SRC_DIRS.forEach((d) => {
  const abs = path.join(ROOT, d);
  getTsFiles(abs).forEach((f) => {
    allFiles.push(f);
  });
});

// Build dependency graph
const graph = new Map();

allFiles.forEach((f) => {
  const content = fs.readFileSync(f, 'utf8');
  const dir = path.dirname(f);
  const imports = [];
  const importRegex = /(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      // Relative import
      const resolvedBase = path.resolve(dir, importPath);
      let resolvedFile = null;
      const candidates = [
        resolvedBase + '.ts',
        resolvedBase + '.tsx',
        path.join(resolvedBase, 'index.ts'),
        path.join(resolvedBase, 'index.tsx'),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          resolvedFile = c;
          break;
        }
      }
      if (resolvedFile) {
        imports.push(resolvedFile);
      }
    }
  }
  graph.set(f, imports);
});

// Detect cycles via DFS
const cycles = [];
const visited = new Set();
const recStack = [];

function dfs(node) {
  visited.add(node);
  recStack.push(node);

  const neighbors = graph.get(node) || [];
  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      dfs(neighbor);
    } else if (recStack.includes(neighbor)) {
      const cycleStart = recStack.indexOf(neighbor);
      const cyclePath = recStack.slice(cycleStart).concat(neighbor);
      cycles.push(cyclePath);
    }
  }

  recStack.pop();
}

allFiles.forEach((f) => {
  if (!visited.has(f)) {
    dfs(f);
  }
});

console.log('--- CIRCULAR DEPENDENCY AUDIT RESULTS ---');
console.log(`Analyzed ${allFiles.length} source TypeScript files.`);
if (cycles.length === 0) {
  console.log('✓ ZERO circular dependencies detected across codebase!');
} else {
  console.log(`⚠️ Found ${cycles.length} circular dependency cycles:`);
  cycles.forEach((c, idx) => {
    console.log(`Cycle #${idx + 1}:`);
    c.forEach((node) => console.log('  -> ' + path.relative(ROOT, node).replace(/\\/g, '/')));
  });
}
