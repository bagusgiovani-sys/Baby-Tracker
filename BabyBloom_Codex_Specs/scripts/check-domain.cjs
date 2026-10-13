const fs = require('node:fs');
const path = require('node:path');
let ts;
try { ts = require('typescript'); } catch { ts = require('../.tooling/node_modules/typescript'); }
const folders = ['src/domain', 'src/data/local', 'src/data/sync'];
const files = folders.flatMap(folder => fs.readdirSync(folder).filter(f => f.endsWith('.ts') && !f.startsWith('open')).map(f => path.join(folder,f)));
const options = { strict:true, noUncheckedIndexedAccess:true, noEmit:true, target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext, moduleResolution:ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions:true, skipLibCheck:true, baseUrl:'.', paths:{ zod:['.tooling/node_modules/zod','node_modules/zod'] } };
const program = ts.createProgram(files,options);
const diagnostics = ts.getPreEmitDiagnostics(program);
for (const d of diagnostics) console.log(ts.flattenDiagnosticMessageText(d.messageText,'\n') + (d.file ? ` (${d.file.fileName}:${d.file.getLineAndCharacterOfPosition(d.start).line+1})` : ''));
// Independently parse every client TS/TSX file even when native package types are unavailable.
function inspect(folder) {
  for (const item of fs.readdirSync(folder,{ withFileTypes:true })) {
    const name = path.join(folder,item.name);
    if (item.isDirectory()) inspect(name);
    else if (/\.tsx?$/.test(name)) {
      const source = ts.createSourceFile(name,fs.readFileSync(name,'utf8'),ts.ScriptTarget.Latest,true,name.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      for (const d of source.parseDiagnostics) { diagnostics.push(d); console.log(name+': '+ts.flattenDiagnosticMessageText(d.messageText,'\n')); }
    }
  }
}
inspect('src'); inspect('app');
console.log(diagnostics.length ? `${diagnostics.length} diagnostics` : 'Strict domain/repository/worker typecheck and client syntax check passed.');
process.exitCode = diagnostics.length ? 1 : 0;
