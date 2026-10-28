import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Osmotic } from 'osmotic';
import sitemap = require('../src/index.cjs');
import { assertValid, openSite, scrape, tempDir } from './helpers/index.js';

before(() => Osmotic.plugins([sitemap]));

const entries = (file: string) =>
	readFileSync(file, 'utf8')
		.split('\n')
		.filter((l) => l.includes('<loc>'));

test('ampersands and apostrophes, which URLs keep, are written as entities', async (t) => {
	const site = await openSite(t, { '/': `<a href="/a&amp;b">x</a><a href="/it's?q=it's&amp;r=2">y</a>` });
	const file = join(tempDir(t), 'sitemap.xml');
	await scrape(Osmotic.get(site.url()).find('a').set({ loc: '@href' }).export('sitemap', file));
	assert.deepEqual(entries(file), [
		`\t\t<loc>${site.origin}/a&amp;b</loc>`,
		// The query of an http(s) URL percent-encodes the apostrophe; the path keeps it
		`\t\t<loc>${site.origin}/it&apos;s?q=it%27s&amp;r=2</loc>`,
	]);
	await assertValid(file);
});

test('characters URLs cannot hold are percent-encoded, hosts punycoded and fragments dropped', async (t) => {
	const site = await openSite(t, {
		'/': `<a href='http://bücher.example/a <b>"c"'>x</a><a href="https://example.com/sök?q=å#top">y</a>`,
	});
	const file = join(tempDir(t), 'sitemap.xml');
	await scrape(Osmotic.get(site.url()).find('a').set({ loc: '@href' }).export('sitemap', file));
	assert.deepEqual(entries(file), [
		'\t\t<loc>http://xn--bcher-kva.example/a%20%3Cb%3E%22c%22</loc>',
		'\t\t<loc>https://example.com/s%C3%B6k?q=%C3%A5</loc>',
	]);
	await assertValid(file);
});
