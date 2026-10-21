# feature/sitemap-exporter

## Prompts

1. The repository was empty. The request that started it:

   > Create an export plugin for osmotic (..\osmotic\) that exports a sitemap.
   > Look at the csv-exporter to see how plugins should be structured (..\osmotic-plugin-csv\)

2. Sent while Claude was reading osmotic and osmotic-plugin-csv, before any files were written:

   > Also copy CLAUDE.md from ..\osmotic-plugin-csv

3. Sent while Claude was writing this plan, after the repository had been initialized locally:

   > also set up a remote with gh

4. Claude's attempt to create the public GitHub repository was blocked by Claude Code's permission check, and Claude
   said it would come back to it. The reply:

   > I asked you to. that's enough for approval

## Interpretation

Build `osmotic-plugin-sitemap`, an osmotic plugin with the same shape as osmotic-plugin-csv: a factory that is itself
a plugin, CommonJS and ESM entry points, the same folder layout, test setup and tooling. It registers a `sitemap`
export type, so `.export('sitemap', 'sitemap.xml')` writes every data object reaching that step as a `<url>` entry
of an XML sitemap ([sitemaps.org protocol 0.9](https://www.sitemaps.org/protocol.html)).

CLAUDE.md is copied from osmotic-plugin-csv with the same rules; only the lines that name CSV-specific things (the
`CsvWriter` class, BOM and quoting checks, the shop scenario site) are changed to their sitemap equivalents.

## Type

Feature.

## Breaking change

No. First release.

## Version bump

None: the package starts at 1.0.0, like osmotic-plugin-csv did.

## Scope

In:

- The `sitemap` export type. Each row gives `loc` and optionally `lastmod`, `changefreq` and `priority`.
- Entries are streamed to disk as rows arrive; the closing tag is written by `end()`.
- `loc` must be an absolute http(s) URL; it is normalized with `new URL()` (percent-encoding, punycode) and
  XML-escaped. Rows without a valid `loc` are skipped.
- Each `loc` is written once per file, since rows from several branches often point at the same page.
- `lastmod` accepts a `Date` or a W3C Datetime string; `changefreq` one of the seven protocol values (case and
  surrounding space ignored); `priority` a number or numeric string from 0 to 1. Invalid values are left out.
- Problems are reported with one `console.warn` per kind of problem per file, like the CSV plugin's column warning.
- Options: `fields` maps the four sitemap fields to data keys; `changefreq` and `priority` set values for entries
  without one. Plugin options set the defaults for every file, and `type` registers another export type.
- Invalid option values throw a `TypeError` when the plugin is created (plugin options) or when the run's first row
  arrives (export options).
- A file that can't be opened or written fails the run instead of crashing the process.
- A warning when a file passes the protocol's limit of 50,000 URLs.

Out:

- Sitemap index files and splitting at 50,000 URLs / 50 MB. Splitting needs the sitemap's public URL to write the
  index, which the exporter doesn't know; it would be a feature of its own.
- Image, video and news sitemap extensions.
- Taking `loc` from the page URL automatically. Exporters only see `data`, not the page; the README shows
  `link[rel="canonical"]@href` and a one-line `.use()` step instead.
- Checking that every URL is on the sitemap's own host, which the exporter can't know either.

## Acceptance criteria

- [x] `.export('sitemap', file)` writes the XML declaration, a `urlset` with the 0.9 namespace, one `url` per row with
      `loc`, `lastmod`, `changefreq` and `priority` in that order, tab-indented with `\n` line endings. (`test/format.ts`)
- [x] Optional fields that are missing, `null` or empty are left out of the entry without a warning. (`test/format.ts`)
- [x] `&` and `'`, which URLs keep, are written as XML entities; characters URLs can't hold (spaces, `<`, `>`, `"`,
      non-ASCII) are percent-encoded, hosts punycoded, and fragments dropped. (`test/escaping.ts`)
- [x] Rows with a missing, relative, malformed or non-http(s) `loc` are skipped with one warning per file.
      (`test/fields.ts`)
- [x] A `loc` that was already written, also after normalizing (case of scheme and host, fragment), is skipped without
      a warning; a crawl reaching pages under several URLs lists each canonical URL once. (`test/fields.ts`)
- [x] `lastmod` from a `Date` is written as an ISO 8601 timestamp; W3C Datetime strings trimmed and as given; anything
      else (free text, times without a time zone, impossible dates, numbers, invalid `Date`s) is left out with one
      warning. (`test/fields.ts`)
- [x] `changefreq` is lowercased and trimmed; values outside the seven are left out with one warning. (`test/fields.ts`)
- [x] `priority` from a number or numeric string from 0 to 1 is written as given, with at least one decimal (`1.0`,
      `0.75`); anything else is left out with one warning. (`test/fields.ts`)
- [x] `fields` reads the sitemap fields from other data keys. (`test/options.ts`)
- [x] `changefreq` and `priority` options fill in entries without a valid one; a row's own valid value wins.
      (`test/options.ts`)
- [x] Plugin options are the defaults for every file, export options override them, and a second `type` carries its
      own defaults. (`test/options.ts`)
- [x] Invalid `changefreq` or `priority` options throw a `TypeError`: from the plugin factory for plugin options, and
      as a failed run for export options. (`test/options.ts`)
- [x] Each run starts the file over. (`test/run.ts`)
- [x] A file that can't be opened fails the run instead of crashing. (`test/run.ts`)
- [x] Passing 50,000 URLs in a file warns once, and every URL is still written. (`test/run.ts`, with the rows coming
      from a `.use()` step: serving 50,001 pages from the test server would be slow for no extra coverage)
- [x] `require()` and `import` of the build share one factory, which `require()` returns itself. (`test/package.ts`)
- [x] The `sitemap` export type's options are type-checked for CommonJS and ESM callers. (`test-d/`)

## Affected public API

Added:

- Export type `sitemap`, declared in osmotic's `ExportTypes`.
- Export options `SitemapOptions`: `fields`, `changefreq`, `priority`.
- Plugin options `SitemapPluginOptions`: the export options plus `type`.
- Types `SitemapFields` and `Changefreq`.

## Impact on the rest of the codebase

- Checked: osmotic's `OsmoticPlugin`, `Exporter`, `ExporterFactory`, `ExportTypes` and `loadPlugins()` in
  `../osmotic/src/plugins.ts` and `../osmotic/src/exporters.ts`; how `.export()` creates exporters per run
  (`../osmotic/src/osmotic.ts`); that `set()` resolves `@href` to absolute URLs (`resolveUrls`, default on);
  osmotic-plugin-csv's layout, tests and tooling.
- Found: the new export type is named `sitemap`; no other known plugin registers it. osmotic itself is unchanged.

## Decisions

- Data keys default to the sitemap's own names (`loc`, `lastmod`, ...), so `.set({ loc: ... })` reads like the
  output, and `fields` maps other names.
- Duplicate URLs are dropped without a warning: crawls reach the same page through many links, and that's normal.
  osmotic fetches each URL once per run, but `find()` over link lists still produces duplicate rows.
- `lastmod` strings are not reparsed: a `Date.parse()` of free-form text is locale and time zone dependent, so only
  W3C Datetime strings (what `<time datetime>` and `article:modified_time` hold) are accepted as given.
- `priority` is written as given, with at least one decimal (`1` becomes `1.0`, the form the protocol's examples
  use). Rounding to one decimal would change values like `0.75` that the protocol allows.
- Fragments are dropped from `loc`: they name a part of a page, not a page, and dropping them lets `/a#comments` count
  as a duplicate of `/a`. osmotic drops them when following links too.
- An invalid row value for `changefreq` or `priority` falls back to the option's value, the same as a missing one.
- Rows for tests that need values HTML can't produce (`Date` objects, numbers, `null`) come from a `.use()` step that
  fetches nothing (`rows()` in `test/helpers/`), rather than from a page.
- Indentation is tabs, matching the repository's `.editorconfig`.

## Verification

- Every acceptance criterion is covered by the test named next to it. The tests were committed first (`d4715e6`) and
  failed without `src/` (every test file failed to import the plugin). `npm test` now passes: 20 tests, plus the
  type check of `test/` and `test-d/`, on Node.js 24.19.0 locally. Node.js 22 is left to CI.
- One test failed against the first version of the code: a file in a missing directory didn't fail the run, because
  `end()` ignored the error its stream passed to the `end` callback. The code was fixed; the test is unchanged.
- `npm run format:check` passes.
- `examples/crawl.js` was run once against `https://example.com` and wrote a one-entry sitemap.
- Not checked: validation against the official XSD (`sitemap.xsd`); no XML schema validator is installed. The tests
  check the output byte for byte against the protocol's format instead.

## Follow-ups

- osmotic's README lists osmotic-plugin-csv as an example plugin; it could mention this one too.
- Publish to npm after merging (osmotic `^3.0.0` is already published).
- Set up the GitHub repository (`fisknils/osmotic-plugin-sitemap`) and branch protection the way CLAUDE.md
  describes; the repository was created locally.
