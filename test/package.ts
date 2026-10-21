// Runs against the build in dist/, the only place the two entry points can be checked together
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('require and import of the build share one plugin factory, which require() returns itself', async () => {
	const cjs: unknown = require('../dist/index.cjs');
	const esm: { default: unknown } = await import('../dist/index.mjs');
	assert.equal(typeof cjs, 'function');
	assert.equal(esm.default, cjs);
});

test('the factory called with options returns a plugin with the export type', () => {
	const sitemap: (options?: { type?: string }) => {
		name: string;
		exporters: Record<string, unknown>;
	} = require('../dist/index.cjs');
	assert.equal(sitemap().name, 'osmotic-plugin-sitemap');
	const plugin = sitemap({ type: 'sitemap-news' });
	assert.equal(plugin.name, 'osmotic-plugin-sitemap:sitemap-news');
	assert.deepEqual(Object.keys(plugin.exporters), ['sitemap-news']);
});
