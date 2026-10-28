import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** A directory from `fs.mkdtempSync()`, removed with everything in it when test `t` ends. */
export function tempDir(t: { after(fn: () => unknown): void }): string {
	const dir = mkdtempSync(join(tmpdir(), 'osmotic-plugin-sitemap-'));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	return dir;
}
