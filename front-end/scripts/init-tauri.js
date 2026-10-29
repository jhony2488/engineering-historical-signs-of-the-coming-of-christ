/**
 * Tauri initialization script
 * Checks if src-tauri/ exists and initializes it if not.
 * Used in CI/CD workflows to avoid re-initializing on every build.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const tauriDir = path.join(__dirname, '..', 'src-tauri');

if (fs.existsSync(tauriDir)) {
  console.log('Tauri already initialized (src-tauri/ exists)');
  process.exit(0);
}

console.log('Initializing Tauri...');

try {
  // Initialize Tauri with non-interactive flags
  execSync(
    'npx @tauri-apps/cli init ' +
    '--app-name "Sinais Históricos" ' +
    '--window-title "Sinais Históricos" ' +
    '--dist-dir ../.next ' +
    '--dev-url http://localhost:3000',
    {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    }
  );

  console.log('Tauri initialized successfully');
} catch (error) {
  console.error('Failed to initialize Tauri:', error.message);
  process.exit(1);
}
