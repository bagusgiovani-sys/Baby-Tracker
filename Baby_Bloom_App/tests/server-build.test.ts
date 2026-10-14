import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
test('production server TypeScript emits a bootable Node function and denies unsupported and unauthenticated requests', async () => {
  const cache = resolve('node_modules/.cache');
  await mkdir(cache, { recursive: true });
  const output = await mkdtemp(join(cache, 'babybloom-server-build-'));
  const config = ts.readConfigFile(resolve('api/tsconfig.json'), ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    resolve('api'),
    { outDir: output },
    resolve('api/tsconfig.json'),
  );
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const emitted = program.emit();
  const diagnostics = [
    ...parsed.errors,
    ...ts.getPreEmitDiagnostics(program),
    ...emitted.diagnostics,
  ];
  assert.equal(
    diagnostics.length,
    0,
    diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'),
  );
  const require = createRequire(import.meta.url);
  const handler = require(join(output, 'api/reports.js')).default;
  const invoke = async (method: string, body?: unknown, length = 0) => {
    const headers: Record<string, string> = {};
    let result = '';
    const response = {
      statusCode: 0,
      setHeader: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
      },
      end: (text: string) => {
        result = text;
      },
    };
    await handler({ method, body, headers: { 'content-length': String(length) } }, response);
    return { status: response.statusCode, headers, body: JSON.parse(result) };
  };
  const get = await invoke('GET');
  assert.equal(get.status, 405);
  assert.equal(get.headers['content-type'], 'application/json');
  const post = await invoke('POST', {
    babyId: 'a0000000-0000-4000-8000-000000000001',
    days: 7,
    endDay: '2026-10-14',
    consent: true,
  });
  assert.equal(post.status, 401);
  assert.equal(post.body.error, 'unauthorized');
  assert.ok(post.headers['cache-control']!.includes('no-store'));
  assert.equal((await invoke('POST', {}, 5000)).status, 413);
});
