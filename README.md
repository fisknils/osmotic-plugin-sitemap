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
- Past 50,000 URLs or 50 MB, split into parts with a sitemap index
- `changefreq` and `priority` by URL pattern
- URLs are normalized, escaped and listed once, so a crawl that reaches a page through
  many links lists it once
- Output is valid against the official schema: invalid values are left out with a
  warning instead of producing a sitemap search engines reject
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

| Field        | Value                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `loc`        | Absolute http(s) URL of the page, 12 to 2,048 characters. Rows without one are skipped.             |
| `lastmod`    | A `Date`, a date (`2026-10-21`), or a date and time with a time zone (`2026-10-21T14:05:00+02:00`). |
| `changefreq` | `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly` or `never`, in any case.                 |
| `priority`   | A number, or a string of one, from 0 to 1.                                                          |

Only `loc` is required. Missing or empty fields are left out of the entry; invalid ones
are left out with one warning per field and file. A time without seconds gets `:00`; a
year or month alone (`2026`, `2026-10`) is left out, since the official schema only
accepts full dates.

```js
Osmotic.get('https://example.com/blog')
	.find('article')
	.set({ loc: 'a@href', lastmod: 'time@datetime' })
	.export('sitemap', 'blog-sitemap.xml', { changefreq: 'monthly' })
	.run();
```

The file is created when the first valid URL of a run arrives, and starts over on every
run. A run without a valid URL writes no file, since an empty sitemap is invalid. osmotic
closes the file when the run ends, and the run fails if it can't be written.

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

### Large sites

A sitemap file may hold 50,000 URLs and 50 MB (52,428,800 bytes). When a run would pass
either, the URLs are split into numbered parts next to the file, and the file becomes a
[sitemap index](https://www.sitemaps.org/protocol.html#index) that lists them:

```
sitemap.xml     index of the parts
sitemap-1.xml   the first 50,000 URLs
sitemap-2.xml   the rest
```

The index lists the parts by URL, so it needs to know where they will be served. Pass
`url`, the public URL of the file; the parts are listed next to it. Without it, the file
is assumed to be at the root of the first URL's host (`https://example.com/sitemap.xml`),
where sitemaps normally go:

```js
.export('sitemap', 'public/maps/sitemap.xml', { url: 'https://example.com/maps/sitemap.xml' })
```

A run within the limits writes a plain sitemap and no parts. Part files left by an
earlier, larger run are not removed, and not listed in the new index. `maxUrls` and
`maxBytes` lower the limits, for example for search engines that read smaller files.

### Rules by URL

`rules` set `changefreq` and `priority` by URL. A RegExp is tested against the URL's
path, as osmotic's `recurse({ exclude })` does; a function gets the parsed `URL`:

```js
.export('sitemap', 'sitemap.xml', {
	changefreq: 'weekly',
	rules: [
		{ match: /^\/$/, changefreq: 'daily', priority: 1 },
		{ match: /^\/blog\//, changefreq: 'monthly', priority: 0.6 },
		{ match: (url) => url.searchParams.has('page'), priority: 0.2 },
	],
})
```

For each field, a valid value in the row wins, then the first matching rule that sets
the field, then the plain `changefreq` or `priority` option. A rule that sets only
`priority` leaves `changefreq` to later rules. Paths are matched as they appear in the
sitemap, percent-encoded (`/caf%C3%A9`, not `/café`). Rules passed to `.export()` are
checked before the plugin's.

## Options

Pass options to `.export()` for one file, or to the plugin to change the defaults for
every file:

```js
Osmotic.plugins([require('osmotic-plugin-sitemap')({ changefreq: 'weekly' })]);
```

| Option       | Default                                             | Description                                                            |
| ------------ | --------------------------------------------------- | ---------------------------------------------------------------------- |
| `fields`     | each field's own name                               | Data keys to read the fields from, e.g. `{ loc: 'url' }`.              |
| `changefreq` | none                                                | `changefreq` for entries without a valid one or a rule.                |
| `priority`   | none                                                | `priority` for entries without a valid one or a rule.                  |
| `rules`      | none                                                | `changefreq` and `priority` by URL; see [Rules by URL](#rules-by-url). |
| `maxUrls`    | `50000`                                             | URLs per file before splitting; at most 50,000.                        |
| `maxBytes`   | `52428800`                                          | Bytes per file before splitting; at most 52,428,800.                   |
| `url`        | the file's name at the root of the first URL's host | Public URL of the file, for the index.                                 |
| `type`       | `'sitemap'`                                         | Plugin only: the export type to register.                              |

`fields` passed to `.export()` merge with the plugin's, and `rules` are checked before
the plugin's. Invalid options throw a `TypeError`: from the plugin for plugin options,
and as a failed run for `.export()` options.

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
`SitemapOptions`, `SitemapPluginOptions`, `SitemapFields`, `SitemapRule` and `Changefreq` types are
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
first. They validate what they write against the official schemas in
`test/helpers/schemas/`, with [xmllint-wasm](https://www.npmjs.com/package/xmllint-wasm).

| File                              | Responsibility                                    |
| --------------------------------- | ------------------------------------------------- |
| `src/core/plugin.ts`              | The plugin and its exporter                       |
| `src/core/SitemapWriter.ts`       | Streaming sitemap writer, splitting and the index |
| `src/core/UrlsetFile.ts`          | One sitemap file, with its URL and byte counts    |
| `src/types/options.ts`            | Options, and the `sitemap` entry in `ExportTypes` |
| `src/utils/`                      | Field conversion, rules, option checks and XML    |
| `src/index.cts` / `src/index.mts` | CommonJS and ESM entry points                     |

## License

ISC
