// Loading the plugin, as an ES module caller sees it
import { Osmotic } from 'osmotic';
import sitemap, { type SitemapPluginOptions } from '../src/index.mjs';

const options: SitemapPluginOptions = { changefreq: 'daily', type: 'sitemap-daily' };
Osmotic.plugins([sitemap, sitemap(options), sitemap({ type: 'sitemap-posts', fields: { loc: 'url' } })]);

// @ts-expect-error: type is a string
sitemap({ type: 1 });
