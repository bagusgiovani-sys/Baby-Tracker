# Dependency review

Updated 2026-10-14 after fresh online audits. No dependency versions or overrides were changed.

## Verified results

| Audit | Moderate | High | Critical | Total |
| --- | --- | --- | --- | --- |
| All dependencies | 15 | 49 | 0 | 64 |
| Excluding development dependencies | 15 | 45 | 0 | 60 |

Both online commands completed with exit code 1 because findings exist. Formatting, lint, strict TypeScript, 44 test results and guarded web export pass; these do not clear security findings.

The sandbox sets NPM_CONFIG_OFFLINE=true. Plain npm audit returned zero without contacting the registry, which is inconclusive. Explicit online mode initially failed through the sandbox proxy; approved execution outside the sandbox obtained both fresh reports. Use the new scripts:

```powershell
npm run audit:dependencies
npm run audit:runtime
```

Both use --offline=false --audit-level=high; the second also uses --omit=dev. They fail on high/critical findings or registry errors. Moderate findings are still reported. Audit counts include propagated dependency findings. Expo production dependencies include build tools, and optional peers can retain test tooling: omit-dev does not prove browser runtime exposure.

## Underlying advisories and paths

Immediate parents were verified against package-lock.json. Inclusion does not establish exploitability in application flows.

| Package | Installed | Immediate parent | Advisory and remediation |
| --- | --- | --- | --- |
| braces | 3.0.3 | micromatch, through Metro/Jest | High stack-exhaustion finding. [Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version. |
| node-forge | 1.4.0 | Expo CLI and code-signing-certificates | High signature-verification finding. [Advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) lists no patched version. |
| uuid | 7.0.3 | xcode, through Expo config plugins | Moderate external-buffer bounds finding in v3/v5/v6. [Advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) identifies patched 11.1.1, 12.0.1 and 13.0.1. xcode declares ^7.0.3 and uses v4 for project IDs; a major override needs compatibility validation. |
| sprintf-js | 1.0.3 | argparse, through js-yaml/Jest | Moderate precision-specifier denial of service. [Advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) lists no patched version. |
| decode-uri-component | 0.2.2 | query-string 7.1.3, through expo-router 57.0.26 | Moderate malformed-input denial of service. [Advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) identifies patched 0.5.0. |

query-string 7.1.3 calls its CommonJS require of decode-uri-component as a function. The patched decoder [declares ESM exports](https://github.com/SamVerschueren/decode-uri-component/blob/v0.5.0/package.json); a direct override changes that module interface. No override was installed. A coordinated upgrade needs router, Metro, native and auth callback validation.

The report proposes Expo 44.0.6 and React Native 0.72.17 downgrades for some propagated findings, plus Jest 30.5.2 and Expo Router 58.0.18 upgrades for other paths. This is not a verified compatible remediation set for the pinned SDK 57 app. Do not apply npm audit fix --force based solely on those suggestions.

## CI and next action

The outer repository's .github/workflows/checks.yml now targets Baby_Bloom_App, uses its lockfile, runs full checks and guarded export with synthetic backend settings, and executes both online audits. YAML/path validation and local checks/export pass; GitHub execution remains pending. High findings will fail its audit gate; no findings are suppressed.

Validate coordinated compatible updates, assess actual exposure, and monitor upstream fixes for packages without published patches. After changes rerun checks, web export and online audits. Browser/device authentication and offline acceptance remain required before release.
