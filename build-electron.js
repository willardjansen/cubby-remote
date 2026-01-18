#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building for Electron...');

const ROUTE_FILE = path.join(__dirname, 'src', 'app', 'api', 'expression-maps', 'route.ts');
const ROUTE_TEMP = path.join(__dirname, 'src', 'app', 'api', 'expression-maps', 'route.ts.dev');

try {
  // Step 1: Temporarily rename route.ts to hide it from Next.js
  if (fs.existsSync(ROUTE_FILE)) {
    console.log('Temporarily hiding API route from Next.js build...');
    try {
      fs.renameSync(ROUTE_FILE, ROUTE_TEMP);
    } catch (renameError) {
      console.log('Could not rename file (might be open in editor). Trying to continue anyway...');
    }
  }

  // Step 2: Run Next.js build
  console.log('Running Next.js build...');
  execSync('next build', { stdio: 'inherit' });

  // Step 3: Run electron-builder
  const args = process.argv.slice(2).join(' ');
  const builderCmd = args ? `electron-builder ${args}` : 'electron-builder';
  console.log(`Running ${builderCmd}...`);
  execSync(builderCmd, { stdio: 'inherit' });

  console.log('Build complete!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
} finally {
  // Step 4: Restore route.ts
  if (fs.existsSync(ROUTE_TEMP)) {
    console.log('Restoring API route...');
    fs.renameSync(ROUTE_TEMP, ROUTE_FILE);
  }
}
