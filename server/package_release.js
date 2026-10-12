import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const parentDir = path.resolve(projectRoot, '..');

const zipDest1 = path.join(parentDir, 'ideathon-2.0-release.zip');
const zipDest2 = path.join(parentDir, 'ideathon-2026-release.zip');

console.log('====================================================');
console.log(' PACKAGING CLEAN DEPLOYMENT RELEASE ZIP');
console.log('====================================================');

// Use PowerShell Compress-Archive or tar.exe with strict exclusion list
// We will copy clean files to a temporary staging folder first to guarantee 100% exclusion:
const stagingDir = path.join(parentDir, 'temp_release_stage');

if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

function copySafeFiles(srcDir, destDir) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    // CRITICAL EXCLUSIONS
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === '.git' ||
      entry.name === '.vite' ||
      entry.name === '.env' ||
      (entry.name.startsWith('.env.') && entry.name !== '.env.example') ||
      entry.name.endsWith('.log') ||
      entry.name.endsWith('.zip') ||
      (entry.name.endsWith('.csv') && !entry.name.includes('.example.')) ||
      (entry.name.endsWith('.json') && (entry.name.includes('registration') || entry.name.includes('sequence')))
    ) {
      console.log(`[Excluded Safe Filter] ${entry.name}`);
      continue;
    }

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copySafeFiles(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('[Staging] Copying project files to clean staging environment...');
copySafeFiles(projectRoot, stagingDir);

// Verify that .env and private files were NOT copied
const leakedEnv = fs.existsSync(path.join(stagingDir, '.env'));
const leakedJson = fs.existsSync(path.join(stagingDir, 'server', 'data', 'registrations.json'));
const leakedCsv = fs.existsSync(path.join(stagingDir, 'server', 'data', 'registrations.csv'));

if (leakedEnv || leakedJson || leakedCsv) {
  console.error('FATAL: Secret or private data found in staging directory!');
  process.exit(1);
}

// Remove old zips
if (fs.existsSync(zipDest1)) fs.unlinkSync(zipDest1);
if (fs.existsSync(zipDest2)) fs.unlinkSync(zipDest2);

console.log('[Archiving] Creating zip archive with PowerShell Compress-Archive...');
execSync(
  `powershell -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipDest1}' -Force"`
);

// Also copy to zipDest2 for backwards compatibility
fs.copyFileSync(zipDest1, zipDest2);

// Clean up staging directory
fs.rmSync(stagingDir, { recursive: true, force: true });

console.log('[Success] Release ZIP created at:');
console.log(`  1. ${zipDest1} (${fs.statSync(zipDest1).size} bytes)`);
console.log(`  2. ${zipDest2} (${fs.statSync(zipDest2).size} bytes)`);

// Inspect archive contents using tar or PowerShell to verify safety
console.log('\n[Verification] Verifying zip contents for zero leaked secrets:');
const checkScript = `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('${zipDest1}').Entries | Where-Object { $_.FullName -match '(\\\\.env$|\\\\.env\\\\.local|registrations\\\\.(json|csv)|node_modules)' } | Select-Object -ExpandProperty FullName"`;
const leaks = execSync(checkScript).toString().trim();

if (leaks) {
  console.error('WARNING: Leaks detected in zip archive:', leaks);
} else {
  console.log('✅ VERIFIED: No .env, node_modules, or private registrations exist in the zip archive.');
}
console.log('====================================================');
