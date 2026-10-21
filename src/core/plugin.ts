import type { OsmoticPlugin } from 'osmotic';
import type { SitemapOptions, SitemapPluginOptions } from '../types/options.js';
import { checkOptions } from '../utils/check-options.js';
import { SitemapWriter } from './SitemapWriter.js';

/**
 * Create the plugin. Pass it to `Osmotic.plugins()` before building chains.
 *
 * @throws TypeError if an option is invalid.
 *
 * @example
 * ```ts
 * Osmotic.plugins([sitemap({ changefreq: 'weekly' })]);
 * ```
 */
export function sitemap(options: SitemapPluginOptions = {}): OsmoticPlugin {
	const { type = 'sitemap', ...defaults } = options;
	if (typeof type !== 'string' || !type) throw new TypeError('Sitemap plugin option type must be a non-empty string');
	checkOptions(defaults);
	return {
		// Plugin names are unique, so each extra type gets its own
		name: type === 'sitemap' ? 'osmotic-plugin-sitemap' : `osmotic-plugin-sitemap:${type}`,
		exporters: {
			[type]: (file: string, opts: SitemapOptions = {}) => {
				checkOptions(opts);
				return new SitemapWriter(file, {
					...defaults,
					...opts,
					fields: { ...defaults.fields, ...opts.fields },
				});
			},
		},
	};
}
