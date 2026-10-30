import { mkdir, open } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
await mkdir('runtime', { recursive: true });
const file = await open('runtime/demo-access.json', 'wx', 0o600);
try { await file.writeFile(JSON.stringify({ version: 1, token: randomBytes(32).toString('hex') })); await file.sync(); } finally { await file.close(); }
console.log('Created ignored runtime/demo-access.json. Copy its token into the local demo sign-in field. No credentials were printed.');
