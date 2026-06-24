const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Xcode 26 / Swift 6 ships SE-0409 "AccessLevelOnImport" as a hard error.
 * Several Expo pods (expo-notifications, ExpoModulesCore, etc.) mix
 * `import Expo` (implicit internal) with `internal import Expo` (explicit),
 * which Swift 6 rejects as "ambiguous implicit access level".
 *
 * The fix: force all pod targets to compile under Swift 5 mode, where
 * SE-0409 is still an opt-in upcoming feature and not enforced.
 * This is safe — every Expo/React Native pod targets Swift 5.x.
 */
const SWIFT_FIX = `
  # ── Swift 6 / SE-0409 fix ─────────────────────────────────────────────────
  # "Ambiguous implicit access level for import" is a hard error in Swift 6.
  # Pin all pod targets to Swift 5 so this remains an opt-in upcoming feature.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |cfg|
      cfg.build_settings['SWIFT_VERSION'] = '5.0'
    end
  end
  # ─────────────────────────────────────────────────────────────────────────`;

module.exports = function withSwiftImportFix(config) {
  return withDangerousMod(config, [
    'ios',
    (c) => {
      const podfilePath = path.join(c.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Idempotent — skip if already patched.
      if (podfile.includes('SE-0409 fix')) {
        return c;
      }

      // Insert our block right before the closing `end` of the post_install block.
      // The generated Podfile always ends with:
      //   )           ← closing paren of react_native_post_install(...)
      //   end         ← closes post_install do
      // end           ← closes target 'mobile' do
      podfile = podfile.replace(
        /(\n  end\nend\n?)$/,
        `${SWIFT_FIX}\n  end\nend\n`,
      );

      fs.writeFileSync(podfilePath, podfile);
      console.log('[with-swift-import-fix] Patched Podfile with Swift 5 pod fix.');
      return c;
    },
  ]);
};
