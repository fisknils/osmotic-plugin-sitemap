import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Osmotic } from 'osmotic';
import sitemap = require('../src/index.cjs');
import { assertValid, blog, entries, openSite, rows, scrape, tempDir, warnings } from './helpers/index.js';

before(() =>
	Osmotic.plugins([
		sitemap,
		sitemap({
			type: 'sitemap-rules-posts',
			rules: [{ match: /^\/posts\//, changefreq: 'monthly', priority: 0.6 }],
		}),
	]),
);

const archive = (url: string) => Osmotic.get(url).find('.post').set({ loc: 'a@href' });

test('rules set changefreq and priority by path or function; the first rule that sets a field wins', async (t) => {
	const site = await openSite(t, blog);
	const file = join(tempDir(t), 'sitemap.xml');
	await scrape(
		archive(site.url()).export('sitemap', file, {
			changefreq: 'never',
			priority: 0.1,
			rules: [
				{ match: /^\/posts\//, changefreq: 'monthly' },
				// Sets only priority, so the rule above still decides changefreq
				{ match: /^\/posts\/hello/, priority: 0.9 },
				{ match: (url) => url.searchParams.get('sort') === 'new', changefreq: 'daily', priority: 0.4 },
				{ match: /^\/posts\//, changefreq: 'yearly', priority: 0.5 },
			],
		}),
	);
	const o = site.origin;
	assert.deepEqual(entries(file), [
		{ loc: `${o}/posts/hello-world`, changefreq: 'monthly', priority: '0.9' },
		{ loc: `${o}/tags?name=node&amp;sort=new`, changefreq: 'daily', priority: '0.4' },
		{ loc: `${o}/posts/what&apos;s-new`, changefreq: 'monthly', priority: '0.5' },
		// Matches no rule, so the plain options apply
		{ loc: `${o}/inl%C3%A4gg/gl%C3%B6gg%20recept`, changefreq: 'never', priority: '0.1' },
	]);
	await assertValid(file);
});

test('a RegExp with the global flag matches every URL, not every other one', async (t) => {
	const file = join(tempDir(t), 'sitemap.xml');
	await scrape(
		rows([{ loc: 'https://example.com/a' }, { loc: 'https://example.com/b' }, { loc: 'https://example.com/c' }]).export(
			'sitemap',
			file,
			{ rules: [{ match: /^\//g, priority: 0.7 }] },
		),
	);
	assert.deepEqual(
		entries(file).map((e) => e.priority),
		['0.7', '0.7', '0.7'],
	);
});

test('a valid row value wins over rules; an invalid one falls back to them', async (t) => {
	const file = join(tempDir(t), 'sitemap.xml');
	warnings(t);
	await scrape(
		rows([
			{ loc: 'https://example.com/posts/a', changefreq: 'hourly', priority: '1' },
			{ loc: 'https://example.com/posts/b', changefreq: 'sometimes', priority: 'high' },
		]).export('sitemap', file, { rules: [{ match: /^\/posts\//, changefreq: 'weekly', priority: 0.3 }] }),
	);
	assert.deepEqual(entries(file), [
		{ loc: 'https://example.com/posts/a', changefreq: 'hourly', priority: '1.0' },
		{ loc: 'https://example.com/posts/b', changefreq: 'weekly', priority: '0.3' },
	]);
	await assertValid(file);
});

test('rules passed to export() are checked before the plugin’s', async (t) => {
	const file = join(tempDir(t), 'sitemap.xml');
	await scrape(
		rows([{ loc: 'https://example.com/posts/hello' }, { loc: 'https://example.com/posts/other' }]).export(
			'sitemap-rules-posts',
			file,
			{ rules: [{ match: /hello/, priority: 1 }] },
		),
	);
	assert.deepEqual(entries(file), [
		{ loc: 'https://example.com/posts/hello', changefreq: 'monthly', priority: '1.0' },
		{ loc: 'https://example.com/posts/other', changefreq: 'monthly', priority: '0.6' },
	]);
	await assertValid(file);
});

// Each is invalid on its own; the casts get them past the type checker
const invalid = [
	{ rules: { match: /a/ } },
	{ rules: [null] },
	{ rules: [{ priority: 0.5 }] },
	{ rules: [{ match: '/posts/', priority: 0.5 }] },
	{ rules: [{ match: /a/, changefreq: 'often' }] },
	{ rules: [{ match: /a/, priority: 2 }] },
	{ rules: [{ match: /a/, lastmod: '2026-10-21' }] },
] as unknown as sitemap.SitemapOptions[];

test('invalid rules throw a TypeError, from the plugin or as a failed run', async (t) => {
	const file = join(tempDir(t), 'sitemap.xml');
	for (const options of invalid) {
		assert.throws(() => sitemap(options), TypeError, JSON.stringify(options));
		await assert.rejects(
			scrape(rows([{ loc: 'https://example.com/a' }]).export('sitemap', file, options)),
			TypeError,
			JSON.stringify(options),
		);
	}
});
