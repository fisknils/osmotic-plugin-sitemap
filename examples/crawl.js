const { Osmotic } = require('osmotic');

Osmotic.plugins([require('../dist/index.cjs')]);

// Crawl a site and list every page it links to. On sites with canonical links, use
// .set({ loc: 'link[rel="canonical"]@href' }) instead, so each page is listed once.
Osmotic.get('https://example.com')
	.recurse()
	.use((ctx, next) => next({ ...ctx, data: { ...ctx.data, loc: ctx.url } }))
	.export('sitemap', 'sitemap.xml', { changefreq: 'weekly' })
	.config({ maxPages: 20 })
	.run();
