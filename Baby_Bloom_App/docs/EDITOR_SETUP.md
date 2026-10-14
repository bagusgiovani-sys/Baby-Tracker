# TypeScript errors in the editor

The application root is `C:\Exodus\Projects\Baby_Tracker\Baby_Bloom_App`, the folder containing package.json. Open that folder in VS Code for its editor settings to apply.

## Diagnosis on 2026-10-14

**Current state:** dependency installation is complete in Baby_Bloom_App, with its generated lockfile. Full application TypeScript, ESLint, formatting and all four component tests now pass. The missing-dependency diagnosis below describes the earlier state. If VS Code retains old red underlines, open the renamed app folder, select its workspace TypeScript and restart the TS server. See IMPLEMENTATION_STATUS.md for current test/build results.

The app has no installed root node_modules. `npm run typecheck` cannot find tsc. Running the isolated TypeScript compiler against the app configuration reproduced unresolved React, React Native and Expo imports, a missing `expo/tsconfig.base`, and cascading JSX/standard-library errors. These are dependency/setup errors, not hundreds of independently established component bugs.

The `.tooling` directory is an isolated fallback for a limited set of core tests. It is not the app's dependency installation. Actual cached React declarations were used for an additional partial source inspection; native package declarations remain unavailable, so that inspection is not full app verification.

Essential JSX, module, modern-library and no-emit options are now explicit in tsconfig.json, while retaining the official Expo base and strict checks. They match the relevant [Expo SDK 57 base settings](https://github.com/expo/expo/blob/sdk-57/packages/expo/tsconfig.base.json). Missing packages still produce errors rather than being replaced with fake declarations. A genuine browser-lock callback type mismatch was corrected separately.

## Restore the development environment

1. Use Node 22.15 or newer in the Node 22 release line.
2. Open a normal terminal with npm registry access and change into the application folder.
3. Run `npm install`. It must finish successfully and generate package-lock.json. Do not use `--force` or suppress type errors to bypass failures.
4. Run `npm run doctor`. This checks the installed pinned packages and Expo base configuration without requiring dependencies itself.
5. Run `npx expo install --check`, then `npm run typecheck`. Resolve actual compatibility/compiler errors reported after installation.
6. In VS Code, open a TSX file, run **TypeScript: Select TypeScript Version**, and select **Use Workspace Version**. Then run **TypeScript: Restart TS Server**.
7. Run `npm run web` for the browser preview. Full lint, UI tests and build still need to pass before deployment.

The app's .vscode/settings.json selects its local TypeScript. It cannot supply missing packages. If you open the outer workspace instead, explicitly select the app's installed compiler or open the application folder directly.

The latest npm registry probe from this agent environment failed with ECONNREFUSED through its configured proxy. No global proxy settings were changed. Dependency installation must happen in an environment with registry access; otherwise missing-module errors will remain.
