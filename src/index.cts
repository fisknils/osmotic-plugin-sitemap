import { sitemap as create } from './core/plugin.js';
import type * as types from './types/options.js';

/**
 * Export URLs to an XML sitemap with `.export('sitemap', file, options)`. Load it once,
 * before building chains:
 *
 * ```js
 * Osmotic.plugins([require('osmotic-plugin-sitemap')]);
 * // or, with default options:
 * Osmotic.plugins([require('osmotic-plugin-sitemap')({ changefreq: 'weekly' })]);
 * ```
 */
function sitemap(options?: types.SitemapPluginOptions): import('osmotic').OsmoticPlugin {
	return create(options);
}

namespace sitemap {
	export type Changefreq = types.Changefreq;
	export type SitemapFields = types.SitemapFields;
	export type SitemapOptions = types.SitemapOptions;
	export type SitemapPluginOptions = types.SitemapPluginOptions;
}

// module.exports is the function itself, so require() can pass it straight to plugins()
export = sitemap;
