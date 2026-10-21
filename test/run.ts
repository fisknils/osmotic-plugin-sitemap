import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Osmotic } from 'osmotic';
import sitemap = require('../src/index.cjs');
import { assertValid, blog, openSite, scrape, tempDir } from './helpers/index.js';

before(() => Osmotic.plugins([sitemap]));

const posts = (url: string, file: string) =>
	Osmotic.get(url).find('.post').set({ loc: 'a@href' }).export('sitemap', file);

test('each run starts the file over', async (t) => {
	const site = await openSite(t, blog);
	const file = join(tempDir(t), 'sitemap.xml');
	const chain = posts(site.url(), file);
	await scrape(chain);
	await scrape(chain);
	const o = site.origin;
	assert.equal(
		readFileSync(file, 'utf8'),
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
			'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
			`\t<url>\n\t\t<loc>${o}/posts/hello-world</loc>\n\t</url>\n` +
			`\t<url>\n\t\t<loc>${o}/tags?name=node&amp;sort=new</loc>\n\t</url>\n` +
			`\t<url>\n\t\t<loc>${o}/posts/what&apos;s-new</loc>\n\t</url>\n` +
			`\t<url>\n\t\t<loc>${o}/inl%C3%A4gg/gl%C3%B6gg%20recept</loc>\n\t</url>\n` +
			'</urlset>\n',
	);
	await assertValid(file);
});

test('a file that cannot be opened fails the run instead of crashing', async (t) => {
	const site = await openSite(t, blog);
	const file = join(tempDir(t), 'missing-dir', 'sitemap.xml');
	await assert.rejects(scrape(posts(site.url(), file)), /ENOENT/);
});
