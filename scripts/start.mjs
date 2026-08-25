import { spawn } from 'child_process';
import { resolve } from 'path';

const cwd = resolve(import.meta.dirname, '..');
const port = process.env.DEPLOY_RUN_PORT || process.env.PORT || '5000';

console.log(`Starting server on port ${port}...`);

const child = spawn('pnpm', ['next', 'start', '--port', port], {
  cwd,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code ?? 0);
});