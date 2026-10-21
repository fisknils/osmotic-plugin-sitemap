// ESM entry: re-exports the CommonJS build, so import and require share one plugin
import sitemap from './index.cjs';

export default sitemap;
export type { Changefreq, SitemapFields, SitemapOptions, SitemapPluginOptions } from './types/options.js';
