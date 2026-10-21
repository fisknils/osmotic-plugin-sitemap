import { escapeXml } from './escape-xml.js';

// A sitemap index listing the sitemaps at locs, in order
export const formatIndex = (locs: string[]): string =>
	'<?xml version="1.0" encoding="UTF-8"?>\n' +
	'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
	locs.map((loc) => `\t<sitemap>\n\t\t<loc>${escapeXml(loc)}</loc>\n\t</sitemap>\n`).join('') +
	'</sitemapindex>\n';
