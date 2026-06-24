#!/usr/bin/env node
/**
 * Post-prebuild cleanup for iOS. Runs two fixes:
 *
 * 1. Remove aps-environment from the entitlements plist.
 *    expo-notifications' app.plugin.js injects `aps-environment = development`
 *    which requires a paid Apple push-notification provisioning profile and
 *    breaks Simulator/local builds. Strip it so development builds work freely.
 *
 * 2. Pin all Pods to SWIFT_VERSION = 5.0.
 *    Xcode 26 / Swift 6 enforces SE-0409 ("AccessLevelOnImport") as a hard
 *    error. Expo/RN pods mix implicit and explicit internal import access
 *    levels, which Swift 6 rejects. Pinning to Swift 5 keeps SE-0409 as an
 *    opt-in upcoming feature. The Podfile post_install hook applies this on
 *    a fresh `pod install`; this script patches the existing Pods project
 *    directly so a full reinstall is not required.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// ── 1. Strip push-notification entitlement ────────────────────────────────

const entitlementsPath = path.join(root, 'ios/mobile/mobile.entitlements');

if (!fs.existsSync(entitlementsPath)) {
  console.log('⚠️  Entitlements file not found — skipping push capability removal.');
} else {
  try {
    execSync(`plutil -remove aps-environment "${entitlementsPath}"`, { stdio: 'pipe' });
    console.log('✅ Removed aps-environment from mobile.entitlements.');
  } catch {
    console.log('ℹ️  aps-environment was not present in entitlements — nothing to remove.');
  }
}

// ── 2. Downgrade Pods SWIFT_VERSION 5.9 → 5.0 ────────────────────────────

const podsPbxproj = path.join(root, 'ios/Pods/Pods.xcodeproj/project.pbxproj');

if (!fs.existsSync(podsPbxproj)) {
  console.log('ℹ️  Pods project not found — skipping Swift version patch (run pod install first).');
} else {
  const before = fs.readFileSync(podsPbxproj, 'utf8');
  const after = before.replaceAll('SWIFT_VERSION = 5.9;', 'SWIFT_VERSION = 5.0;');

  if (before === after) {
    console.log('ℹ️  No Swift 5.9 targets found in Pods project — nothing to patch.');
  } else {
    const count = (before.match(/SWIFT_VERSION = 5\.9;/g) ?? []).length;
    fs.writeFileSync(podsPbxproj, after);
    console.log(`✅ Downgraded ${count} pod target(s) from Swift 5.9 → 5.0 (SE-0409 fix).`);
  }
}
