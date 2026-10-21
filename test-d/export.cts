// The sitemap export type's options, as a CommonJS caller sees them
import { Osmotic } from 'osmotic';
import sitemap = require('../src/index.cjs');

const options: sitemap.SitemapOptions = { fields: { loc: 'url' }, changefreq: 'weekly', priority: 0.5 };
const fields: sitemap.SitemapFields = { lastmod: 'updated' };
const freq: sitemap.Changefreq = 'never';
new Osmotic().get('https://example.com').export('sitemap', 'sitemap.xml', options).export('sitemap', 'other.xml');
new Osmotic().export('sitemap', 'sitemap.xml', { fields, changefreq: freq });

// @ts-expect-error: changefreq is one of the protocol's values
new Osmotic().export('sitemap', 'sitemap.xml', { changefreq: 'often' });

// @ts-expect-error: priority is a number
new Osmotic().export('sitemap', 'sitemap.xml', { priority: '0.5' });

// @ts-expect-error: fields only maps the four sitemap fields
new Osmotic().export('sitemap', 'sitemap.xml', { fields: { title: 'name' } });
