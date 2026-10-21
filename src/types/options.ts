// Declared here, in a file both entry points' declarations import, so callers get it
declare module 'osmotic' {
	interface ExportTypes {
		/**
		 * An XML sitemap, one `<url>` per data object with a valid `loc`.
		 *
		 * @example
		 * ```ts
		 * .set({ loc: 'link[rel="canonical"]@href', lastmod: 'time@datetime' })
		 * .export('sitemap', 'sitemap.xml', { changefreq: 'weekly' })
		 * ```
		 */
		sitemap: SitemapOptions;
	}
}

/** How often a page is likely to change, as the sitemap protocol words it. */
export type Changefreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

/** The data key each sitemap field is read from. Each defaults to the field's own name. */
export interface SitemapFields {
	/** Absolute http(s) URL of the page. Rows without one are skipped. @defaultValue `'loc'` */
	loc?: string;
	/** A `Date`, or a W3C Datetime string such as `2026-10-21` or `2026-10-21T14:05:00+02:00`. @defaultValue `'lastmod'` */
	lastmod?: string;
	/** One of the {@link Changefreq} values, in any case. @defaultValue `'changefreq'` */
	changefreq?: string;
	/** A number, or a string of one, from 0 to 1. @defaultValue `'priority'` */
	priority?: string;
}

/** How a sitemap is written. */
export interface SitemapOptions {
	/**
	 * Data keys to read the sitemap fields from, merged with the plugin's.
	 * @defaultValue each field's own name: `loc`, `lastmod`, `changefreq` and `priority`
	 */
	fields?: SitemapFields;
	/** `changefreq` for entries without a valid one. @defaultValue none */
	changefreq?: Changefreq;
	/** `priority`, from 0 to 1, for entries without a valid one. @defaultValue none */
	priority?: number;
}

/** Options for the plugin. Sitemap options set here are the defaults for every export. */
export interface SitemapPluginOptions extends SitemapOptions {
	/**
	 * The export type to register. Load the plugin again under another type for a second
	 * set of defaults, e.g. `sitemap({ type: 'sitemap-posts', changefreq: 'monthly' })`.
	 * Declare a type other than `'sitemap'` in `ExportTypes` to have its options checked.
	 * @defaultValue `'sitemap'`
	 */
	type?: string;
}
