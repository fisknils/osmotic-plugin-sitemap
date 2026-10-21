import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Osmotic } from 'osmotic';
import sitemap = require('../src/index.cjs');
import { assertValid, blog, openSite, scrape, tempDir, warnings } from './helpers/index.js';

before(() => Osmotic.plugins([sitemap]));

const archive = (url: string) =>
	Osmotic.get(url)
		.find('.post')
		.set({ loc: 'a@href', lastmod: 'time@datetime', changefreq: '@data-changefreq', priority: '@data-priority' });

test('writes a urlset with one url per row, its fields in protocol order, tab-indented', async (t) => {
	const site = await openSite(t, blog);
	const file = join(tempDir(t), 'sitemap.xml');
	const warned = warnings(t);
	await scrape(archive(site.url()).export('sitemap', file));
	const o = site.origin;
	assert.equal(
		readFileSync(file, 'utf8'),
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
			'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
			'\t<url>\n' +
			`\t\t<loc>${o}/posts/hello-world</loc>\n` +
			'\t\t<lastmod>2026-09-01</lastmod>\n' +
			'\t\t<changefreq>monthly</changefreq>\n' +
			'\t\t<priority>0.8</priority>\n' +
			'\t</url>\n' +
			'\t<url>\n' +
			`\t\t<loc>${o}/tags?name=node&amp;sort=new</loc>\n` +
			'\t\t<lastmod>2026-10-20T08:30:00+02:00</lastmod>\n' +
			'\t\t<changefreq>weekly</changefreq>\n' +
			'\t\t<priority>1.0</priority>\n' +
			'\t</url>\n' +
			'\t<url>\n' +
			`\t\t<loc>${o}/posts/what&apos;s-new</loc>\n` +
			'\t</url>\n' +
			'\t<url>\n' +
			`\t\t<loc>${o}/inl%C3%A4gg/gl%C3%B6gg%20recept</loc>\n` +
			'\t\t<lastmod>2025-12-24</lastmod>\n' +
			'\t\t<priority>0.3</priority>\n' +
			'\t</url>\n' +
			'</urlset>\n',
	);
	assert.deepEqual(warned, [], 'missing optional fields are left out without a warning');
	await assertValid(file);
});

test('optional fields that are null or empty are left out without a warning', async (t) => {
	const site = await openSite(t, { '/': '<a href="/a">A</a>' });
	const file = join(tempDir(t), 'sitemap.xml');
	const warned = warnings(t);
	await scrape(
		Osmotic.get(site.url())
			.set({ loc: 'a@href', lastmod: 'time', changefreq: '.freq' })
			.use((ctx, next) => next({ ...ctx, data: { ...ctx.data, priority: null } }))
			.export('sitemap', file),
	);
	assert.equal(
		readFileSync(file, 'utf8'),
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
			'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
			'\t<url>\n' +
			`\t\t<loc>${site.origin}/a</loc>\n` +
			'\t</url>\n' +
			'</urlset>\n',
	);
	assert.deepEqual(warned, []);
	await assertValid(file);
});
