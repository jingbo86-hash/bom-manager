import { execSync, spawn } from 'child_process';
import { resolve } from 'path';

const cwd = resolve(import.meta.dirname, '..');
const port = process.env.DEPLOY_RUN_PORT || process.env.PORT || '5000';

console.log(`Starting dev server on port ${port}...`);

// Start Next.js dev server
const next = spawn('pnpm', ['next', 'dev', '--port', port], {
  cwd,
  stdio: 'inherit',
  shell: true,
});

// Start server.ts watcher
const server = spawn('pnpm', ['tsx', 'watch', 'src/server.ts'], {
  cwd,
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => {
  next.kill();
  server.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  next.kill();
  server.kill();
  process.exit();
});