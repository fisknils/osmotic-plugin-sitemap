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

5. The first version was done: tests passing, splitting into several files out of scope, and XSD validation not
   checked because no validator was installed. The reply:

   > 1. splitting into several files _should_ be supported
   > 2. if you need to install a validator, just install a validator

6. Sent while Claude was installing the validator, after a second blocked attempt at creating the repository:

   > Can you add a permission rule for gh repo create in my claude code settings? I'd prefer it to be applied on my
   > user settings rather than just for this project

   (Done outside this repository, in `~/.claude/settings.json`; the repository and `master`'s branch protection were
   set up after it.)

7. Sent while Claude was updating this plan for splitting and validation:

   > It would also make sense to allow for setting priority and changefreq separately for different url patterns.

## Interpretation

Build `osmotic-plugin-sitemap`, an osmotic plugin with the same shape as osmotic-plugin-csv: a factory that is itself
a plugin, CommonJS and ESM entry points, the same folder layout, test setup and tooling. It registers a `sitemap`
export type, so `.export('sitemap', 'sitemap.xml')` writes every data object reaching that step as a `<url>` entry
of an XML sitemap ([sitemaps.org protocol 0.9](https://www.sitemaps.org/protocol.html)).

A sitemap that would pass the protocol's limits (50,000 URLs or 50 MB) is split: the URLs go into numbered part
files, and the file passed to `.export()` becomes a sitemap index that lists them, so search engines are still
pointed at one file.

The tests validate what they write against the official schemas (`sitemap.xsd` and `siteindex.xsd`), with a validator
installed as a dev dependency. Where the schema is stricter than the protocol's prose, the output follows the schema.

`changefreq` and `priority` can be set per URL pattern, so a crawl can mark blog posts `monthly` and the front page
`daily` without computing the values in the chain.

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
- `loc` must be an absolute http(s) URL of 12 to 2,048 characters (the schema's limits); it is normalized with
  `new URL()` (percent-encoding, punycode) and XML-escaped. Rows without a valid `loc` are skipped.
- Each `loc` is written once per run, across all parts, since rows from several branches often point at the same page.
- `lastmod` accepts a `Date`, a date (`YYYY-MM-DD`), or a date and time with a time zone; `changefreq` one of the seven
  protocol values (case and surrounding space ignored); `priority` a number or numeric string from 0 to 1. Invalid
  values are left out.
- Problems are reported with one `console.warn` per kind of problem per file, like the CSV plugin's column warning.
- Options: `fields` maps the four sitemap fields to data keys; `changefreq` and `priority` set values for entries
  without one; `rules` set them per URL pattern; `maxUrls` and `maxBytes` lower the split limits; `url` is the
  sitemap's public URL, for the index.
- `rules`: a list of `{ match, changefreq?, priority? }`. `match` is a RegExp tested against the URL's path, or a
  function of the `URL`. For each field, a valid row value wins, then the first matching rule that sets the field,
  then the plain option. Rules passed to `.export()` are checked before the plugin's.
  Plugin options set the defaults for every file, and `type` registers another export type.
- Invalid option values throw a `TypeError` when the plugin is created (plugin options) or when the run's first row
  arrives (export options).
- Splitting: when the next entry would pass `maxUrls` or `maxBytes`, a new part starts. A run that needs one part
  writes a plain sitemap to the file; a run that needs more writes `<name>-1<ext>`, `<name>-2<ext>`, ... next to it
  and turns the file into an index of them.
- No file is written in a run without a valid URL, as osmotic does for a run without rows: an empty `urlset` is
  invalid.
- A file that can't be opened or written fails the run instead of crashing the process.

Out:

- Image, video and news sitemap extensions.
- Gzip compression.
- Index files past 50,000 parts (2.5 billion URLs), and nested indexes, which the protocol doesn't allow anyway.
- Removing part files an earlier, larger run left behind. They aren't in the new index, and deleting files the run
  didn't write is riskier than leaving them.
- Taking `loc` from the page URL automatically. Exporters only see `data`, not the page; the README shows
  `link[rel="canonical"]@href` and a one-line `.use()` step instead.
- Checking that every URL is on the sitemap's own host, which the exporter can't know either.

## Acceptance criteria

- [x] `.export('sitemap', file)` writes the XML declaration, a `urlset` with the 0.9 namespace, one `url` per row with
      `loc`, `lastmod`, `changefreq` and `priority` in that order, tab-indented with `\n` line endings. (`test/format.ts`)
- [x] Optional fields that are missing, `null` or empty are left out of the entry without a warning. (`test/format.ts`)
- [x] `&` and `'`, which URLs keep, are written as XML entities; characters URLs can't hold (spaces, `<`, `>`, `"`,
      non-ASCII) are percent-encoded, hosts punycoded, and fragments dropped. (`test/escaping.ts`)
- [ ] Rows with a missing, relative, malformed, non-http(s), shorter than 12 or longer than 2,048 character `loc` are
      skipped with one warning per file. (`test/fields.ts`)
- [ ] A run without a valid URL writes no file. (`test/fields.ts`)
- [x] A `loc` that was already written, also after normalizing (case of scheme and host, fragment), is skipped without
      a warning; a crawl reaching pages under several URLs lists each canonical URL once. (`test/fields.ts`)
- [ ] `lastmod` from a `Date` is written as an ISO 8601 timestamp; `YYYY-MM-DD` and date-times with seconds and a time
      zone are trimmed and kept as given; date-times without seconds get `:00`; anything else (a year or month alone,
      free text, times without a time zone, impossible dates, numbers, invalid `Date`s) is left out with one warning.
      (`test/fields.ts`)
- [x] `changefreq` is lowercased and trimmed; values outside the seven are left out with one warning. (`test/fields.ts`)
- [x] `priority` from a number or numeric string from 0 to 1 is written as given, with at least one decimal (`1.0`,
      `0.75`); anything else is left out with one warning. (`test/fields.ts`)
- [x] `fields` reads the sitemap fields from other data keys. (`test/options.ts`)
- [x] `changefreq` and `priority` options fill in entries without a valid one; a row's own valid value wins.
      (`test/options.ts`)
- [x] Plugin options are the defaults for every file, export options override them, and a second `type` carries its
      own defaults. (`test/options.ts`)
- [ ] `rules` set `changefreq` and `priority` for URLs whose path a RegExp matches, or for which a function returns
      true; the first matching rule that sets a field wins; a valid row value wins over rules, and rules over the plain
      options. (`test/rules.ts`)
- [ ] Rules passed to `.export()` are checked before the plugin's. (`test/rules.ts`)
- [ ] Invalid `changefreq`, `priority`, `fields`, `rules`, `maxUrls`, `maxBytes` or `url` options throw a `TypeError`:
      from the plugin factory for plugin options, and as a failed run for export options. (`test/options.ts`,
      `test/rules.ts`)
- [ ] A run within the limits writes a plain sitemap to the file and no part files. (`test/splitting.ts`)
- [ ] A run past `maxUrls` writes parts of at most `maxUrls` URLs, named `<name>-<n><ext>` next to the file, and an
      index at the file listing them in order; each URL is in exactly one part. (`test/splitting.ts`)
- [ ] A run past `maxBytes` writes parts of at most `maxBytes` bytes; an entry larger than `maxBytes` gets a part of
      its own. (`test/splitting.ts`)
- [ ] Without `maxUrls` and `maxBytes`, parts hold at most 50,000 URLs and 52,428,800 bytes. (`test/splitting.ts`)
- [ ] The index lists parts under `url`, or, without it, under the file's name at the root of the first URL's host.
      (`test/splitting.ts`)
- [ ] Each run starts the file over, also when one run splits and the next doesn't. (`test/run.ts`,
      `test/splitting.ts`)
- [x] A file that can't be opened fails the run instead of crashing. (`test/run.ts`)
- [ ] Every sitemap and index the tests check is valid against the official `sitemap.xsd` and `siteindex.xsd`.
      (`assertValid()` in `test/helpers/`, called from every test that checks a written file, except the size tests,
      whose 50 MB parts are only measured)
- [x] `require()` and `import` of the build share one factory, which `require()` returns itself. (`test/package.ts`)
- [ ] The `sitemap` export type's options are type-checked for CommonJS and ESM callers. (`test-d/`)

## Affected public API

Added:

- Export type `sitemap`, declared in osmotic's `ExportTypes`.
- Export options `SitemapOptions`: `fields`, `changefreq`, `priority`, `rules`, `maxUrls`, `maxBytes`, `url`.
- Plugin options `SitemapPluginOptions`: the export options plus `type`.
- Types `SitemapFields`, `SitemapRule` and `Changefreq`.

## Impact on the rest of the codebase

- Checked: osmotic's `OsmoticPlugin`, `Exporter`, `ExporterFactory`, `ExportTypes` and `loadPlugins()` in
  `../osmotic/src/plugins.ts` and `../osmotic/src/exporters.ts`; how `.export()` creates exporters per run
  (`../osmotic/src/osmotic.ts`); that `set()` resolves `@href` to absolute URLs (`resolveUrls`, default on);
  osmotic-plugin-csv's layout, tests and tooling; osmotic's run summary (`Wrote N row(s) to <file>`), which counts
  rows reaching the step, not URLs or parts.
- Found: the new export type is named `sitemap`; no other known plugin registers it. osmotic itself is unchanged.
  osmotic's summary names only the file passed to `.export()`, also when it became an index; the plugin doesn't
  print its own summary of the parts.

## Decisions

- Data keys default to the sitemap's own names (`loc`, `lastmod`, ...), so `.set({ loc: ... })` reads like the
  output, and `fields` maps other names.
- Duplicate URLs are dropped without a warning: crawls reach the same page through many links, and that's normal.
  osmotic fetches each URL once per run, but `find()` over link lists still produces duplicate rows.
- `lastmod` strings are not reparsed: a `Date.parse()` of free-form text is locale and time zone dependent, so only
  ISO-style strings (what `<time datetime>` and `article:modified_time` hold) are accepted.
- `priority` is written as given, with at least one decimal (`1` becomes `1.0`, the form the protocol's examples
  use). Rounding to one decimal would change values like `0.75` that the protocol allows.
- Fragments are dropped from `loc`: they name a part of a page, not a page, and dropping them lets `/a#comments` count
  as a duplicate of `/a`. osmotic drops them when following links too.
- An invalid row value for `changefreq` or `priority` falls back to the option's value, the same as a missing one.
- Rows for tests that need values HTML can't produce (`Date` objects, numbers, `null`) come from a `.use()` step that
  fetches nothing (`rows()` in `test/helpers/`), rather than from a page.
- Indentation is tabs, matching the repository's `.editorconfig`.
- The validator is [xmllint-wasm](https://www.npmjs.com/package/xmllint-wasm) 5.3.0 (libxml2 compiled to
  WebAssembly, MIT): a dev dependency that runs in `npm test` on every platform and in CI without a system package.
  The schemas are copied from sitemaps.org into `test/helpers/schemas/`, so the tests don't fetch them.
- The schema is stricter than the protocol's prose in three places, and the output follows the schema:
  - `lastmod`: the prose allows any W3C Datetime, but the schema takes only `xsd:date` and `xsd:dateTime`, so a year
    (`2026`), a month (`2026-10`) and times without seconds are invalid. Times without seconds get `:00`, which keeps
    their meaning; a year or month alone can't become a date without inventing a day, so it is left out. The test in
    `test/fields.ts` that expected `2026`, `2026-10` and `2026-10-21T14:05+02:00` as written checked behavior the new
    acceptance criteria don't allow, and was changed for that reason.
  - `loc`: 12 to 2,048 characters. Shorter URLs (such as `http://a.b/`) are skipped like other invalid ones.
  - An empty `urlset` is invalid, so a run without a valid URL writes no file.
- The first part is written to the file itself while the run goes on, and renamed to `<name>-1<ext>` when `end()`
  finds the run needed more than one part. Writes stay synchronous, so concurrent branches can't interleave with a
  split, and a run that fits in one part (the common case) never renames anything.
- Without `url`, the index lists parts under the file's name at the root of the first URL's host
  (`https://example.com/sitemap-1.xml` for `sitemap.xml`), where sitemaps are normally served and where they may list
  every URL on the host.
- The index has no `lastmod`: the run's time would make every file different between runs, and search engines read
  the parts' own entries.
- `maxUrls` and `maxBytes` can lower the limits but not raise them past the protocol's.
- A RegExp `match` tests the URL's path, as osmotic's `recurse({ exclude })` does, so the same patterns work in both
  places. Anything else (query, host, a lookup table) goes in a function, which gets the parsed `URL`. Plain strings
  aren't accepted: whether `'/blog'` means a prefix, a glob or an exact path is a guess either way.
- Rules are checked per field, so a rule that sets only `priority` doesn't stop a later rule from setting
  `changefreq`.

## Verification

## Follow-ups

- osmotic's README lists osmotic-plugin-csv as an example plugin; it could mention this one too.
- Publish to npm after merging (osmotic `^3.0.0` is already published).
