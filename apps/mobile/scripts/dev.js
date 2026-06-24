#!/usr/bin/env node
/**
 * Starts the Metro bundler bound to a specific host IP so that a device
 * on the same network can reach it.
 *
 * Usage:
 *   pnpm dev                          # reads host from EXPO_PUBLIC_API_URL in .env
 *   pnpm dev -- 192.168.1.55          # explicit IP (overrides .env)
 *   METRO_HOST=192.168.1.55 pnpm dev  # env-var override
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Resolve host ───────────────────────────────────────────────────────────

function readDotEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .flatMap((line) => {
        const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
        return m ? [[m[1], m[2].replace(/^["']|["']$/g, '')]] : [];
      }),
  );
}

const cliArg = process.argv[2];            // pnpm dev -- <ip>
const envVar = process.env.METRO_HOST;     // METRO_HOST=x pnpm dev

let host = cliArg || envVar;

if (!host) {
  const env = readDotEnv();
  const apiUrl = env.EXPO_PUBLIC_API_URL;
  if (apiUrl) {
    try { host = new URL(apiUrl).hostname; } catch { /* ignore */ }
  }
}

if (!host) {
  console.error('❌  Could not determine Metro host.\n');
  console.error('    Pass it explicitly:  pnpm dev -- 192.168.x.x');
  console.error('    Or set in .env:      EXPO_PUBLIC_API_URL=http://192.168.x.x:3001');
  process.exit(1);
}

// ── Print banner ───────────────────────────────────────────────────────────

const line = '─'.repeat(50);
console.log(`\n${line}`);
console.log(`  Metro bundler`);
console.log(`  Host  : ${host}`);
console.log(`  Bundle: http://${host}:8081`);
console.log(`  Status: http://${host}:8081/status`);
console.log(`\n  Device MUST be on the same WiFi as this machine.`);
console.log(`  In Xcode → Debug build → no Release bundle needed.`);
console.log(`${line}\n`);

// ── Launch Metro ───────────────────────────────────────────────────────────

// expo start --host only accepts 'lan'|'tunnel'|'localhost'.
// REACT_NATIVE_PACKAGER_HOSTNAME overrides the IP Metro advertises,
// so the device QR code and dev-menu URL point at the right address.
const expo = path.join(__dirname, '../node_modules/.bin/expo');
const child = spawn(expo, ['start', '--host', 'lan'], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: host },
});

child.on('error', (err) => {
  console.error('Failed to start Metro:', err.message);
  process.exit(1);
});

// Forward signals so Ctrl-C cleanly stops Metro
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', (code) => process.exit(code ?? 0));
