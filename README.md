# osmotic-plugin-sitemap

An [osmotic](https://www.npmjs.com/package/osmotic) plugin that exports scraped URLs
to an XML sitemap with `.export('sitemap', file, options)`.

```js
const { Osmotic } = require('osmotic');

Osmotic.plugins([require('osmotic-plugin-sitemap')]);

Osmotic.get('https://example.com')
	.recurse()
	.set({ loc: 'link[rel="canonical"]@href', lastmod: 'meta[property="article:modified_time"]@content' })
	.export('sitemap', 'sitemap.xml')
	.run();
```

- Follows the [sitemap protocol](https://www.sitemaps.org/protocol.html): `loc`,
  `lastmod`, `changefreq` and `priority`
- Entries are streamed to disk as they arrive
- URLs are normalized, escaped and listed once, so a crawl that reaches a page through
  many links lists it once
- Invalid values are left out with a warning instead of producing a sitemap search
  engines reject
- Several sets of defaults side by side, each under its own export type

## Installation

```sh
npm install osmotic osmotic-plugin-sitemap
```

`osmotic` (3.0.0 or later) is a peer dependency, so install it alongside the plugin.

## Usage

Load the plugin once, before building any chains:

```js
// CommonJS
const { Osmotic } = require('osmotic');
Osmotic.plugins([require('osmotic-plugin-sitemap')]);

// ES modules / TypeScript
import { Osmotic } from 'osmotic';
import sitemap from 'osmotic-plugin-sitemap';
Osmotic.plugins([sitemap]);
```

Then add `.export('sitemap', file, options)` where the data is complete. Each `data`
object reaching that step becomes a `<url>` entry:

| Field        | Value                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| `loc`        | Absolute http(s) URL of the page. Rows without one are skipped.                      |
| `lastmod`    | A `Date`, or a W3C Datetime string such as `2026-10-21` or `2026-10-21T14:05+02:00`. |
| `changefreq` | `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly` or `never`, in any case.  |
| `priority`   | A number, or a string of one, from 0 to 1.                                           |

Only `loc` is required. Missing or empty fields are left out of the entry; invalid ones
are left out with one warning per field and file.

```js
Osmotic.get('https://example.com/blog')
	.find('article')
	.set({ loc: 'a@href', lastmod: 'time@datetime' })
	.export('sitemap', 'blog-sitemap.xml', { changefreq: 'monthly' })
	.run();
```

The file is created when the first row of a run arrives, and starts over on every run.
osmotic closes it when the run ends, and the run fails if the file can't be written.

### The page's own URL

osmotic resolves `href` attributes to absolute URLs, so `a@href` and
`link[rel="canonical"]@href` give `loc` directly. The canonical link is usually the
better choice when crawling: it is the URL the site wants indexed, and pages reached
through several URLs share it.

For the URL a page was fetched from, add it to the data with a step:

```js
.use((ctx, next) => next({ ...ctx, data: { ...ctx.data, loc: ctx.url } }))
```

### URLs

Each `loc` is normalized with `new URL()`: characters URLs can't hold are
percent-encoded, hostnames are converted to punycode, and `#fragments` are dropped. `&`
and `'` are written as XML entities. A URL that was already written is skipped, so the
first row for a URL decides its fields; rows from parallel branches arrive in no
particular order.

The protocol allows 50,000 URLs per file. Past that, the plugin warns once and keeps
writing. Splitting into several files with a sitemap index isn't supported.

## Options

Pass options to `.export()` for one file, or to the plugin to change the defaults for
every file:

```js
Osmotic.plugins([require('osmotic-plugin-sitemap')({ changefreq: 'weekly' })]);
```

| Option       | Default               | Description                                               |
| ------------ | --------------------- | --------------------------------------------------------- |
| `fields`     | each field's own name | Data keys to read the fields from, e.g. `{ loc: 'url' }`. |
| `changefreq` | none                  | `changefreq` for entries without a valid one.             |
| `priority`   | none                  | `priority` for entries without a valid one.               |
| `type`       | `'sitemap'`           | Plugin only: the export type to register.                 |

`fields` passed to `.export()` merge with the plugin's. Invalid options throw a
`TypeError`: from the plugin for plugin options, and as a failed run for `.export()`
options.

### Several sets of defaults

Load the plugin again with another `type` to use different defaults side by side:

```js
const sitemap = require('osmotic-plugin-sitemap');

Osmotic.plugins([sitemap, sitemap({ type: 'sitemap-posts', changefreq: 'monthly', priority: 0.8 })]);

chain.export('sitemap', 'pages.xml').export('sitemap-posts', 'posts.xml');
```

## TypeScript

Type declarations are included for both entry points. Loading the plugin's types
declares the `sitemap` export type, so `.export('sitemap', ...)` checks its options. The
`SitemapOptions`, `SitemapPluginOptions`, `SitemapFields` and `Changefreq` types are
exported. For another `type`, declare it yourself:

```ts
import type { SitemapOptions } from 'osmotic-plugin-sitemap';

declare module 'osmotic' {
	interface ExportTypes {
		'sitemap-posts': SitemapOptions;
	}
}
```

## Development

```sh
npm install            # install dependencies (does not build)
npm run build          # clean dist/ and compile src/ with tsc (also runs before npm publish)
npm test               # build, type check test/ and test-d/, and run the tests with tsx
npm run format         # format everything with Prettier
npm run format:check   # check formatting without writing
```

The tests use the osmotic checkout next to this one (`file:../osmotic`), so build it
first.

| File                              | Responsibility                                    |
| --------------------------------- | ------------------------------------------------- |
| `src/core/plugin.ts`              | The plugin and its exporter                       |
| `src/core/SitemapWriter.ts`       | Streaming sitemap writer                          |
| `src/types/options.ts`            | Options, and the `sitemap` entry in `ExportTypes` |
| `src/utils/`                      | Field conversion, option checks and XML escaping  |
| `src/index.cts` / `src/index.mts` | CommonJS and ESM entry points                     |

## License

ISC
