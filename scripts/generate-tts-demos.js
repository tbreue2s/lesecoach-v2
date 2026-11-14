#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tsScript = path.resolve(__dirname, 'generate-tts-demos.ts');

const child = spawn(
  'npx',
  ['vite-node', '--script', tsScript, '--', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    shell: true,
  }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
