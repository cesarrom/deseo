const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// ── Monorepo watch ─────────────────────────────────────────────────────────
// Watch the whole monorepo so Metro picks up changes in workspace packages.
config.watchFolders = [monorepoRoot];

// ── Module resolution ──────────────────────────────────────────────────────
// Resolution order: mobile-local node_modules first, then monorepo root.
// pnpm hoists shared deps to the root; workspace symlinks live in both.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// pnpm uses symlinks into its .pnpm/ virtual store — Metro must follow them.
config.resolver.unstable_enableSymlinks = true;

// Respect the `exports` field in package.json (tRPC, superjson, etc. ship
// separate ESM/CJS bundles keyed under `exports`). Without this Metro falls
// back to `main` and may pick the wrong entry point.
config.resolver.unstable_enablePackageExports = true;

// React Native field order: prefer RN-specific bundles, then browser shims,
// then the CJS `main` entry. Keeps server-only code out of the bundle.
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// ── Block list ─────────────────────────────────────────────────────────────
// @deseo/api-client does `import type { AppRouter }` from @deseo/api.
// Babel strips type-only imports before Metro resolves them, so api's
// server deps (Temporal, postgres, drizzle) are never bundled. The block
// list below is a safety net in case a future change turns that import
// into a value import, preventing a hard bundling failure at runtime.
const { exclusionList } = require('metro-config');
config.resolver.blockList = exclusionList([
  /@temporalio\//,
  /\/packages\/db\//,
  /\/packages\/integrations\//,
  // Ignore the api app itself — only @deseo/api-client is needed on mobile.
  /\/apps\/api\/src\//,
]);

// ── Cache ──────────────────────────────────────────────────────────────────
// Place Metro's transform cache outside the monorepo root so it survives
// workspace package changes that would otherwise bust it unnecessarily.
config.cacheStores = [
  new FileStore({ root: path.join(projectRoot, '.metro-cache') }),
];

module.exports = config;
