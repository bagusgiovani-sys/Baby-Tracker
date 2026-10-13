import { registerHooks } from 'node:module';
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (specifier !== 'zod' || error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
      return { url: new URL('../.tooling/node_modules/zod/index.js', import.meta.url).href, shortCircuit: true };
    }
  },
});
