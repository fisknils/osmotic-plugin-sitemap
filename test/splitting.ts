import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Osmotic } from 'osmotic';
import sitemap = require('../src/index.cjs');
import { assertValid, entries, rows, scrape, tempDir } from './helpers/index.js';

before(() => Osmotic.plugins([sitemap]));

const HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
const FOOTER = '</urlset>\n';
const entry = (loc: string) => `\t<url>\n\t\t<loc>${loc}</loc>\n\t</url>\n`;

const urls = (count: number, path = (i: number) => String(i)) =>
	Array.from({ length: count }, (_, i) => ({ loc: `https://example.com/${path(i)}` }));

// The loc values of each part file, in file order
const partLocs = (dir: string, name: string, count: number) =>
	Array.from({ length: count }, (_, i) => entries(join(dir, `${name}-${i + 1}.xml`)).map((e) => e.loc));

test('a run within the limits writes a plain sitemap and no part files', async (t) => {
	const dir = tempDir(t);
	const file = join(dir, 'sitemap.xml');
	await scrape(rows(urls(3)).export('sitemap', file, { maxUrls: 3 }));
	assert.deepEqual(readdirSync(dir), ['sitemap.xml']);
	assert.equal(
		readFileSync(file, 'utf8'),
		HEADER +
			urls(3)
				.map((u) => entry(u.loc))
				.join('') +
			FOOTER,
	);
	await assertValid(file);
});

test('a run past maxUrls writes numbered parts and turns the file into an index of them', async (t) => {
	const dir = tempDir(t);
	const file = join(dir, 'sitemap.xml');
	// A duplicate after the first part was closed is still skipped
	const data = [...urls(5), { loc: 'https://example.com/1' }, ...urls(7).slice(5)];
	await scrape(rows(data).export('sitemap', file, { maxUrls: 3, url: 'https://example.com/maps/sitemap.xml' }));
	assert.deepEqual(readdirSync(dir).sort(), ['sitemap-1.xml', 'sitemap-2.xml', 'sitemap-3.xml', 'sitemap.xml']);
	assert.equal(
		readFileSync(file, 'utf8'),
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
			'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
			'\t<sitemap>\n\t\t<loc>https://example.com/maps/sitemap-1.xml</loc>\n\t</sitemap>\n' +
			'\t<sitemap>\n\t\t<loc>https://example.com/maps/sitemap-2.xml</loc>\n\t</sitemap>\n' +
			'\t<sitemap>\n\t\t<loc>https://example.com/maps/sitemap-3.xml</loc>\n\t</sitemap>\n' +
			'</sitemapindex>\n',
	);
	const u = (i: number) => `https://example.com/${i}`;
	assert.deepEqual(partLocs(dir, 'sitemap', 3), [[u(0), u(1), u(2)], [u(3), u(4), u(5)], [u(6)]]);
	await assertValid(file);
	for (let i = 1; i <= 3; i++) await assertValid(join(dir, `sitemap-${i}.xml`));
});

test('without url, the index lists parts at the root of the first URL’s host', async (t) => {
	const dir = tempDir(t);
	const file = join(dir, 'pages.xml');
	await scrape(rows(urls(3, (i) => `docs/${i}`)).export('sitemap', file, { maxUrls: 2 }));
	assert.deepEqual(readdirSync(dir).sort(), ['pages-1.xml', 'pages-2.xml', 'pages.xml']);
	assert.deepEqual(
		[...readFileSync(file, 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]),
		['https://example.com/pages-1.xml', 'https://example.com/pages-2.xml'],
	);
	await assertValid(file);
});

test('a run past maxBytes writes parts of at most maxBytes bytes', async (t) => {
	const dir = tempDir(t);
	const file = join(dir, 'sitemap.xml');
	const data = urls(5);
	// Room for exactly two entries; the URLs are all the same length
	const maxBytes = Buffer.byteLength(HEADER + FOOTER + entry(data[0].loc) + entry(data[1].loc));
	await scrape(rows(data).export('sitemap', file, { maxBytes }));
	const u = (i: number) => `https://example.com/${i}`;
	assert.deepEqual(partLocs(dir, 'sitemap', 3), [[u(0), u(1)], [u(2), u(3)], [u(4)]]);
	for (let i = 1; i <= 3; i++) {
		const part = join(dir, `sitemap-${i}.xml`);
		assert.ok(statSync(part).size <= maxBytes, `${part} is ${statSync(part).size} bytes`);
		await assertValid(part);
	}
	await assertValid(file);
});

test('an entry larger than maxBytes gets a part of its own', async (t) => {
	const dir = tempDir(t);
	const file = join(dir, 'sitemap.xml');
	const long = `https://example.com/${'a'.repeat(500)}`;
	const maxBytes = Buffer.byteLength(HEADER + FOOTER + entry('https://example.com/0'));
	await scrape(
		rows([{ loc: 'https://example.com/0' }, { loc: long }, { loc: 'https://example.com/1' }]).export('sitemap', file, {
			maxBytes,
		}),
	);
	assert.deepEqual(partLocs(dir, 'sitemap', 3), [['https://example.com/0'], [long], ['https://example.com/1']]);
	await assertValid(file);
});

test('without maxUrls, parts hold at most 50,000 URLs', async (t) => {
	const dir = tempDir(t);
	const file = join(dir, 'sitemap.xml');
	await scrape(rows(urls(50_001)).export('sitemap', file));
	assert.deepEqual(
		partLocs(dir, 'sitemap', 2).map((locs) => locs.length),
		[50_000, 1],
	);
	await assertValid(file);
	await assertValid(join(dir, 'sitemap-1.xml'));
});

test('without maxBytes, parts hold at most 52,428,800 bytes', async (t) => {
	const dir = tempDir(t);
	const file = join(dir, 'sitemap.xml');
	// 2,000-character URLs: about 25,900 fit in 50 MB
	const loc = (i: number) => String(i).padStart(6, '0') + 'a'.repeat(2000 - 'https://example.com/'.length - 6);
	await scrape(rows(urls(26_000, loc)).export('sitemap', file));
	assert.deepEqual(readdirSync(dir).sort(), ['sitemap-1.xml', 'sitemap-2.xml', 'sitemap.xml']);
	const first = statSync(join(dir, 'sitemap-1.xml')).size;
	const next = Buffer.byteLength(entry(`https://example.com/${loc(0)}`));
	assert.ok(first <= 52_428_800, `the first part is ${first} bytes`);
	assert.ok(first + next > 52_428_800, `the first part is ${first} bytes, and had room for another entry`);
	const counts = partLocs(dir, 'sitemap', 2).map((locs) => locs.length);
	assert.equal(counts[0] + counts[1], 26_000);
	await assertValid(file);
});

test('a run that fits in one file after one that split writes a plain sitemap', async (t) => {
	const dir = tempDir(t);
	const file = join(dir, 'sitemap.xml');
	await scrape(rows(urls(3)).export('sitemap', file, { maxUrls: 2 }));
	await scrape(rows(urls(1)).export('sitemap', file, { maxUrls: 2 }));
	assert.equal(readFileSync(file, 'utf8'), HEADER + entry('https://example.com/0') + FOOTER);
	await assertValid(file);
});
