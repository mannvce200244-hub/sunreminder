import { mkdir, copyFile, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const publicFiles = ['index.html','app.js','engine.js','data.js','analytics.js','sharing.js','profile.js','profile-ui.js','user-account.js','recovery-ui.js','usage.js','background.js','notification-store.js','admin-session.js','admin-data.js','styles.css','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png','admin.html','admin.js','admin.css'];
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'cloudflare', 'public');
await mkdir(output, { recursive: true });
// Only explicitly approved assets enter the deployment; never copy the web directory wholesale.
for (const entry of await readdir(output, { withFileTypes: true })) {
  if (!entry.isFile()) throw new Error('Unexpected directory in generated assets; inspect before building.');
  if (!publicFiles.includes(entry.name)) await unlink(path.join(output, entry.name));
}
for (const name of publicFiles) await copyFile(path.join(root, 'web', name), path.join(output, name));
console.log(`Prepared ${publicFiles.length} public assets. Private data and server files excluded.`);
