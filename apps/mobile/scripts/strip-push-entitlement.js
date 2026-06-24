#!/usr/bin/env node
/**
 * Removes the aps-environment entitlement from the iOS project after prebuild.
 *
 * expo-notifications ships app.plugin.js which Expo auto-detects during
 * prebuild and injects `aps-environment = development` into the entitlements
 * plist. That key requires a paid Apple push notification provisioning profile,
 * which breaks local development builds and Simulator runs.
 *
 * This script strips the key so the project stays buildable without a push
 * cert while keeping the expo-notifications JS API fully functional.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const entitlementsPath = path.join(
  __dirname,
  '../ios/mobile/mobile.entitlements',
);

if (!fs.existsSync(entitlementsPath)) {
  console.log('⚠️  Entitlements file not found — skipping push capability removal.');
  process.exit(0);
}

try {
  execSync(`plutil -remove aps-environment "${entitlementsPath}"`, {
    stdio: 'pipe',
  });
  console.log('✅ Removed aps-environment from mobile.entitlements.');
  console.log('   Push notifications are disabled for local/Simulator builds.');
} catch {
  // plutil exits non-zero when the key doesn't exist — that's fine.
  console.log('ℹ️  aps-environment was not present in entitlements — nothing to remove.');
}
