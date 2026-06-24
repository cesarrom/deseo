const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so Metro picks up changes in packages/
config.watchFolders = [monorepoRoot];

// Resolution order: mobile-local node_modules first, then monorepo root.
// This ensures the mobile's pinned package versions win over root hoisted ones.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// pnpm uses symlinks into .pnpm/ virtual store — Metro must follow them.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
