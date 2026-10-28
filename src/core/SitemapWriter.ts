import { rename, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { Data, Exporter } from 'osmotic';
import type { Changefreq, SitemapFields, SitemapOptions, SitemapRule } from '../types/options.js';
import { escapeXml } from '../utils/escape-xml.js';
import { formatIndex } from '../utils/format-index.js';
import { MAX_BYTES, MAX_URLS } from '../utils/limits.js';
import { matchRule } from '../utils/match-rule.js';
import { partFile } from '../utils/part-file.js';
import { toChangefreq } from '../utils/to-changefreq.js';
import { toLastmod } from '../utils/to-lastmod.js';
import { toLoc } from '../utils/to-loc.js';
import { toPriority } from '../utils/to-priority.js';
import { UrlsetFile } from './UrlsetFile.js';

type Field = keyof SitemapFields;

// Sitemap written one <url> at a time. osmotic creates it on the first row of a run.
// The first part is written to the file itself; when a run needs more, end() renames it
// to part 1 and writes an index of the parts in its place.
export class SitemapWriter implements Exporter {
	private readonly keys: Required<SitemapFields>;
	private readonly changefreq: Changefreq | null;
	private readonly priority: string | null;
	private readonly rules: SitemapRule[];
	private readonly maxUrls: number;
	private readonly maxBytes: number;
	private readonly url: string | null;
	private readonly parts: UrlsetFile[] = [];
	// end() of every part but the last, started when the next part opened
	private readonly closing: Promise<void>[] = [];
	// Every loc written, so each URL is listed once
	private readonly seen = new Set<string>();
	// Fields already warned about, so each problem is reported once per file
	private readonly warned = new Set<Field>();
	private firstLoc: string | null = null;

	constructor(
		private readonly file: string,
		{ fields = {}, changefreq, priority, rules = [], maxUrls = MAX_URLS, maxBytes = MAX_BYTES, url }: SitemapOptions,
	) {
		this.keys = { loc: 'loc', lastmod: 'lastmod', changefreq: 'changefreq', priority: 'priority', ...fields };
		this.changefreq = changefreq ?? null;
		this.priority = priority === undefined ? null : toPriority(priority);
		this.rules = rules;
		this.maxUrls = maxUrls;
		this.maxBytes = maxBytes;
		this.url = url ?? null;
	}

	write(data: Data): void {
		const last = this.parts.at(-1);
		if (last?.error) throw last.error;
		const loc = toLoc(data[this.keys.loc]);
		if (!loc) {
			this.warn(
				'loc',
				`skipping row(s) without an absolute http(s) URL of 12 to 2,048 characters in "${this.keys.loc}"`,
			);
			return;
		}
		if (this.seen.has(loc)) return; // Several links to one page are normal, so no warning
		this.seen.add(loc);
		this.firstLoc ??= loc;
		const entry = this.entry(loc, data);
		this.partFor(entry).write(entry);
	}

	async end(): Promise<void> {
		const last = this.parts.at(-1);
		if (!last) return; // No valid URL: an empty urlset would be invalid, so no file
		const results = await Promise.allSettled([...this.closing, last.end()]);
		const failed = results.find((r) => r.status === 'rejected');
		if (failed) throw failed.reason;
		if (this.parts.length === 1) return;
		await rename(this.file, partFile(this.file, 1));
		const base = this.url ?? new URL(encodeURIComponent(basename(this.file)), new URL('/', this.firstLoc!)).href;
		const locs = this.parts.map((_, i) => new URL(encodeURIComponent(basename(partFile(this.file, i + 1))), base).href);
		await writeFile(this.file, formatIndex(locs));
	}

	// The part entry goes in: the current one, or a new one when it would pass a limit
	private partFor(entry: string): UrlsetFile {
		const current = this.parts.at(-1);
		if (current?.fits(entry, this.maxUrls, this.maxBytes)) return current;
		if (current) {
			const done = current.end();
			done.catch(() => {}); // Reported by end()
			this.closing.push(done);
		}
		const part = new UrlsetFile(this.parts.length ? partFile(this.file, this.parts.length + 1) : this.file);
		this.parts.push(part);
		return part;
	}

	private entry(loc: string, data: Data): string {
		const url = this.rules.length ? new URL(loc) : null;
		const matched = url ? this.rules.filter((rule) => matchRule(rule, url)) : [];
		const ruleValue = <K extends 'changefreq' | 'priority'>(key: K) =>
			matched.find((rule) => rule[key] !== undefined)?.[key];
		const lastmod = this.field('lastmod', data, toLastmod);
		const changefreq = this.field('changefreq', data, toChangefreq) ?? ruleValue('changefreq') ?? this.changefreq;
		const rulePriority = ruleValue('priority');
		const priority =
			this.field('priority', data, toPriority) ??
			(rulePriority === undefined ? null : toPriority(rulePriority)) ??
			this.priority;
		return (
			`\t<url>\n\t\t<loc>${escapeXml(loc)}</loc>\n` +
			(lastmod ? `\t\t<lastmod>${escapeXml(lastmod)}</lastmod>\n` : '') +
			(changefreq ? `\t\t<changefreq>${changefreq}</changefreq>\n` : '') +
			(priority ? `\t\t<priority>${priority}</priority>\n` : '') +
			'\t</url>\n'
		);
	}

	// The row's value for field, converted by parse; null when it's missing or invalid
	private field<T>(field: Field, data: Data, parse: (value: unknown) => T | null): T | null {
		const key = this.keys[field];
		const value = data[key];
		if (value == null || (typeof value === 'string' && !value.trim())) return null;
		const parsed = parse(value);
		if (parsed === null) this.warn(field, `leaving out invalid ${field} value(s) in "${key}", such as ${show(value)}`);
		return parsed;
	}

	private warn(field: Field, message: string): void {
		if (this.warned.has(field)) return;
		this.warned.add(field);
		console.warn(`${this.file}: ${message}`);
	}
}

const show = (value: unknown): string => (typeof value === 'string' ? JSON.stringify(value) : String(value));
