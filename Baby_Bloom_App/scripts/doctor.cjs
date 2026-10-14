const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const [major, minor] = process.versions.node.split('.').map(Number);
let failed = false;

console.log(`Application folder: ${root}`);
if (major !== 22 || minor < 15) {
  console.error('Use Node 22.15 or newer in the Node 22 release line.');
  failed = true;
}

const missing = [];
const mismatched = [];
for (const [name, expected] of Object.entries({
  ...manifest.dependencies,
  ...manifest.devDependencies,
})) {
  const filename = path.join(root, 'node_modules', name, 'package.json');
  if (!fs.existsSync(filename)) {
    missing.push(name);
    continue;
  }
  const installed = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (installed.version !== expected)
    mismatched.push(`${name}: expected ${expected}, found ${installed.version}`);
}

if (missing.length) {
  console.error(`Missing app dependencies (${missing.length}): ${missing.join(', ')}`);
  console.error('Run npm install in the application folder from a terminal with registry access.');
  console.error(
    'The isolated .tooling folder runs limited core tests; it does not install the app or its TSX types.',
  );
  failed = true;
}
if (mismatched.length) {
  console.error(`Dependency version mismatches:\n${mismatched.join('\n')}`);
  console.error('Run npm install to reconcile the manifest before checking Expo compatibility.');
  failed = true;
}

if (!fs.existsSync(path.join(root, 'node_modules', 'expo', 'tsconfig.base.json'))) {
  console.error(
    'Expo TypeScript base configuration is missing. This causes errors across TSX files.',
  );
  failed = true;
}
if (!fs.existsSync(path.join(root, 'package-lock.json'))) {
  console.log('No package-lock.json yet; a successful npm install should generate it.');
}

if (failed) {
  console.error('After installation: npm run doctor, npm run typecheck, then npm run web.');
  process.exitCode = 1;
} else {
  console.log(
    'Pinned app dependencies and Expo configuration are present. Run npm run typecheck for source diagnostics.',
  );
}
