// The sitemap export type's options, as a CommonJS caller sees them
import { Osmotic } from 'osmotic';
import sitemap = require('../src/index.cjs');

const options: sitemap.SitemapOptions = { fields: { loc: 'url' }, changefreq: 'weekly', priority: 0.5 };
const fields: sitemap.SitemapFields = { lastmod: 'updated' };
const freq: sitemap.Changefreq = 'never';
const rule: sitemap.SitemapRule = { match: /^\/blog\//, changefreq: 'monthly' };
new Osmotic().get('https://example.com').export('sitemap', 'sitemap.xml', options).export('sitemap', 'other.xml');
new Osmotic().export('sitemap', 'sitemap.xml', { fields, changefreq: freq });
new Osmotic().export('sitemap', 'sitemap.xml', {
	rules: [rule, { match: (url) => url.searchParams.has('page'), priority: 0.2 }],
	maxUrls: 10_000,
	maxBytes: 10_000_000,
	url: 'https://example.com/sitemap.xml',
});

// @ts-expect-error: changefreq is one of the protocol's values
new Osmotic().export('sitemap', 'sitemap.xml', { changefreq: 'often' });

// @ts-expect-error: priority is a number
new Osmotic().export('sitemap', 'sitemap.xml', { priority: '0.5' });

// @ts-expect-error: fields only maps the four sitemap fields
new Osmotic().export('sitemap', 'sitemap.xml', { fields: { title: 'name' } });

// @ts-expect-error: match is a RegExp or a function, not a string
new Osmotic().export('sitemap', 'sitemap.xml', { rules: [{ match: '/blog/', priority: 0.5 }] });

// @ts-expect-error: a rule sets only changefreq and priority
new Osmotic().export('sitemap', 'sitemap.xml', { rules: [{ match: /a/, lastmod: '2026-10-21' }] });

// @ts-expect-error: maxUrls is a number
new Osmotic().export('sitemap', 'sitemap.xml', { maxUrls: '50000' });
