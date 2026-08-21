import { execSync } from 'child_process';
import { resolve } from 'path';

const cwd = resolve(import.meta.dirname, '..');
const run = (cmd) => execSync(cmd, { cwd, stdio: 'inherit' });

const port = process.env.DEPLOY_RUN_PORT || process.env.PORT || '5000';

console.log(`Starting server on port ${port}...`);
run(`pnpm next start --port ${port}`);