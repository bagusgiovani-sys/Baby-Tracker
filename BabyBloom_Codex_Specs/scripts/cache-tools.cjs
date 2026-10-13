// Sandbox-safe offline bootstrap: copy only public package cache entries.
const path = require('node:path');
const { createRequire } = require('node:module');
const npmRequire = createRequire(path.join(process.env.APPDATA, 'npm/node_modules/npm/package.json'));
const cache = npmRequire('cacache');
const source = path.join(process.env.LOCALAPPDATA, 'npm-cache/_cacache');
const target = path.resolve('.npm-cache/_cacache');
const packages = ['zod/-/zod-4.3.6.tgz', 'typescript/-/typescript-5.9.3.tgz', '@electric-sql/pglite/-/pglite-0.5.8.tgz'];
(async () => {
  for (const pkg of packages) {
    const key = 'make-fetch-happen:request-cache:https://registry.npmjs.org/' + pkg;
    const entry = await cache.get(source, key);
    await cache.put(target, key, entry.data, { metadata: entry.metadata });
  }
  console.log('Copied three public package archives into the workspace cache.');
})().catch(() => { console.error('Offline tool cache unavailable.'); process.exitCode = 1; });
