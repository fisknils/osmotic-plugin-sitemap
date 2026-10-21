import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Osmotic } from 'osmotic';
import sitemap = require('../src/index.cjs');
import { blog, entries, locs, openSite, rows, scrape, tempDir, warnings } from './helpers/index.js';

before(() => Osmotic.plugins([sitemap]));

test('rows without an absolute http(s) loc are skipped, with one warning', async (t) => {
	const file = join(tempDir(t), 'sitemap.xml');
	const warned = warnings(t);
	await scrape(
		rows([
			{ loc: '/relative' },
			{ loc: 'mailto:editor@example.com' },
			{ title: 'no loc' },
			{ loc: 'not a url' },
			{ loc: ['https://example.com/in-a-list'] },
			{ loc: 'https://example.com/ok' },
		]).export('sitemap', file),
	);
	assert.deepEqual(entries(file), [{ loc: 'https://example.com/ok' }]);
	assert.equal(warned.length, 1);
	assert.match(warned[0], /sitemap\.xml/);
	assert.match(warned[0], /\bloc\b/);
});

test('a loc that was already written is skipped without a warning', async (t) => {
	const file = join(tempDir(t), 'sitemap.xml');
	const warned = warnings(t);
	await scrape(
		rows([
			{ loc: 'https://example.com/a', priority: 1 },
			{ loc: 'https://example.com/a#comments', priority: 0.5 },
			{ loc: 'HTTPS://EXAMPLE.COM/a' },
			{ loc: 'https://example.com/b' },
		]).export('sitemap', file),
	);
	assert.deepEqual(entries(file), [
		{ loc: 'https://example.com/a', priority: '1.0' },
		{ loc: 'https://example.com/b' },
	]);
	assert.deepEqual(warned, []);
});

test('a crawl reaching pages under several URLs lists each canonical URL once', async (t) => {
	const site = await openSite(t, blog);
	const file = join(tempDir(t), 'sitemap.xml');
	const warned = warnings(t);
	await scrape(Osmotic.get(site.url()).recurse().set({ loc: 'link[rel="canonical"]@href' }).export('sitemap', file));
	const o = site.origin;
	assert.deepEqual(
		locs(file),
		[
			`${o}/`,
			`${o}/inl%C3%A4gg/gl%C3%B6gg%20recept`,
			`${o}/posts/hello-world`,
			`${o}/posts/what&apos;s-new`,
			`${o}/tags?name=node&amp;sort=new`,
		].sort(),
	);
	assert.deepEqual(warned, []);
});

test('lastmod takes a Date or a W3C Datetime string; anything else is left out, with one warning', async (t) => {
	const file = join(tempDir(t), 'sitemap.xml');
	const warned = warnings(t);
	const at = (path: string, lastmod: unknown) => ({ loc: `https://example.com/${path}`, lastmod });
	await scrape(
		rows([
			at('date', new Date(Date.UTC(2026, 9, 21, 12, 0, 0))),
			at('year', '2026'),
			at('month', ' 2026-10 '),
			at('minutes', '2026-10-21T14:05+02:00'),
			at('fraction', '2026-10-21T12:00:00.25Z'),
			at('words', 'yesterday'),
			at('no-zone', '2026-10-21T12:00:00'),
			at('month-13', '2026-13-01'),
			at('invalid-date', new Date('nope')),
			at('number', 1792584000000),
		]).export('sitemap', file),
	);
	assert.deepEqual(
		entries(file).map((e) => e.lastmod),
		[
			'2026-10-21T12:00:00.000Z',
			'2026',
			'2026-10',
			'2026-10-21T14:05+02:00',
			'2026-10-21T12:00:00.25Z',
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		],
	);
	assert.equal(warned.length, 1);
	assert.match(warned[0], /lastmod/);
});

test('changefreq is lowercased and trimmed; other values are left out, with one warning', async (t) => {
	const file = join(tempDir(t), 'sitemap.xml');
	const warned = warnings(t);
	const at = (path: string, changefreq: unknown) => ({ loc: `https://example.com/${path}`, changefreq });
	await scrape(
		rows([
			at('always', 'always'),
			at('weekly', ' Weekly '),
			at('never', 'NEVER'),
			at('sometimes', 'sometimes'),
			at('number', 7),
		]).export('sitemap', file),
	);
	assert.deepEqual(
		entries(file).map((e) => e.changefreq),
		['always', 'weekly', 'never', undefined, undefined],
	);
	assert.equal(warned.length, 1);
	assert.match(warned[0], /changefreq/);
});

test('priority takes a number from 0 to 1, or a string of one; other values are left out, with one warning', async (t) => {
	const file = join(tempDir(t), 'sitemap.xml');
	const warned = warnings(t);
	const at = (path: string, priority: unknown) => ({ loc: `https://example.com/${path}`, priority });
	await scrape(
		rows([
			at('half', 0.5),
			at('one', '1'),
			at('zero', 0),
			at('fine', ' 0.75 '),
			at('too-high', 1.5),
			at('negative', -0.1),
			at('words', 'high'),
			at('not-a-number', NaN),
		]).export('sitemap', file),
	);
	assert.deepEqual(
		entries(file).map((e) => e.priority),
		['0.5', '1.0', '0.0', '0.75', undefined, undefined, undefined, undefined],
	);
	assert.equal(warned.length, 1);
	assert.match(warned[0], /priority/);
});
