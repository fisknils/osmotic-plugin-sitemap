import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Osmotic } from 'osmotic';
import sitemap = require('../src/index.cjs');
import { blog, entries, openSite, rows, scrape, tempDir } from './helpers/index.js';

before(() =>
	Osmotic.plugins([
		sitemap,
		sitemap({
			type: 'sitemap-options-weekly',
			changefreq: 'weekly',
			priority: 0.5,
			fields: { loc: 'url', lastmod: 'updated' },
		}),
	]),
);

test('fields reads the sitemap fields from other data keys', async (t) => {
	const site = await openSite(t, blog);
	const file = join(tempDir(t), 'sitemap.xml');
	await scrape(
		Osmotic.get(site.url())
			.find('.post')
			.set({ link: 'a@href', updated: 'time@datetime', freq: '@data-changefreq', loc: 'h1' })
			.export('sitemap', file, { fields: { loc: 'link', lastmod: 'updated', changefreq: 'freq' } }),
	);
	const o = site.origin;
	assert.deepEqual(entries(file), [
		{ loc: `${o}/posts/hello-world`, lastmod: '2026-09-01', changefreq: 'monthly' },
		{ loc: `${o}/tags?name=node&amp;sort=new`, lastmod: '2026-10-20T08:30:00+02:00', changefreq: 'weekly' },
		{ loc: `${o}/posts/what&apos;s-new` },
		{ loc: `${o}/inl%C3%A4gg/gl%C3%B6gg%20recept`, lastmod: '2025-12-24' },
	]);
});

test('changefreq and priority fill in entries without one; the row value wins', async (t) => {
	const file = join(tempDir(t), 'sitemap.xml');
	await scrape(
		rows([
			{ loc: 'https://example.com/a' },
			{ loc: 'https://example.com/b', changefreq: 'daily', priority: '0.9' },
			{ loc: 'https://example.com/c', changefreq: 'sometimes', priority: '' },
		]).export('sitemap', file, { changefreq: 'monthly', priority: 0.2 }),
	);
	assert.deepEqual(entries(file), [
		{ loc: 'https://example.com/a', changefreq: 'monthly', priority: '0.2' },
		{ loc: 'https://example.com/b', changefreq: 'daily', priority: '0.9' },
		// An invalid or empty row value falls back to the default, like a missing one
		{ loc: 'https://example.com/c', changefreq: 'monthly', priority: '0.2' },
	]);
});

test('plugin options are the defaults of their type, and export options override them', async (t) => {
	const dir = tempDir(t);
	const data = [{ url: 'https://example.com/a', updated: '2026-10-01', loc: 'https://example.com/ignored' }];
	await scrape(rows(data).export('sitemap-options-weekly', join(dir, 'weekly.xml')));
	await scrape(
		rows(data).export('sitemap-options-weekly', join(dir, 'daily.xml'), {
			changefreq: 'daily',
			fields: { lastmod: 'missing' },
		}),
	);
	await scrape(rows(data).export('sitemap', join(dir, 'plain.xml')));
	assert.deepEqual(entries(join(dir, 'weekly.xml')), [
		{ loc: 'https://example.com/a', lastmod: '2026-10-01', changefreq: 'weekly', priority: '0.5' },
	]);
	// fields merge with the defaults, so loc still comes from url
	assert.deepEqual(entries(join(dir, 'daily.xml')), [
		{ loc: 'https://example.com/a', changefreq: 'daily', priority: '0.5' },
	]);
	assert.deepEqual(entries(join(dir, 'plain.xml')), [{ loc: 'https://example.com/ignored' }]);
});

test('invalid plugin options throw a TypeError when the plugin is created', () => {
	assert.throws(() => sitemap({ changefreq: 'often' as 'daily' }), TypeError);
	assert.throws(() => sitemap({ priority: 2 }), TypeError);
	assert.throws(() => sitemap({ fields: { loc: 1 as unknown as string } }), TypeError);
});

test('invalid export options fail the run with a TypeError', async (t) => {
	const file = join(tempDir(t), 'sitemap.xml');
	const chain = rows([{ loc: 'https://example.com/a' }]);
	await assert.rejects(scrape(chain.export('sitemap', file, { priority: -1 })), TypeError);
	await assert.rejects(
		scrape(rows([{ loc: 'https://example.com/a' }]).export('sitemap', file, { changefreq: 'often' as 'daily' })),
		TypeError,
	);
});
