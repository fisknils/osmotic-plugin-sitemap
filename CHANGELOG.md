# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-21

### Added

- The `sitemap` export type for osmotic's `.export()`. Each row's `loc`, `lastmod`,
  `changefreq` and `priority` become a `<url>` entry, streamed to disk.
- URLs are normalized, escaped and written once per run; rows without an absolute
  http(s) URL and invalid field values are left out with one warning each. Output is
  valid against the official sitemap schema.
- Sitemaps past 50,000 URLs or 50 MB are split into numbered parts, and the file becomes
  a sitemap index of them. `maxUrls` and `maxBytes` lower the limits, and `url` sets
  where the index lists the parts.
- Options: `fields` reads the sitemap fields from other data keys, `changefreq` and
  `priority` fill in entries without one, and `rules` set them by URL pattern.
- Plugin options set the defaults for every file, and `type` registers them under
  another export type, so several sets of defaults can be used side by side.
- A file that can't be opened or written fails the run instead of crashing the process.

[1.0.0]: https://www.npmjs.com/package/osmotic-plugin-sitemap/v/1.0.0
