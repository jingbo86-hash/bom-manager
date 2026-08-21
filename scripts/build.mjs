import { execSync } from 'child_process';
import { resolve } from 'path';

const cwd = resolve(import.meta.dirname, '..');
const run = (cmd) => execSync(cmd, { cwd, stdio: 'inherit' });

console.log('Installing dependencies...');
run('pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only');

console.log('Building the Next.js project...');
run('pnpm next build');

console.log('Bundling server with tsup...');
run('pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify');

console.log('Build completed successfully!');