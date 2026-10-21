import { createWriteStream, type WriteStream } from 'node:fs';
import type { Data, Exporter } from 'osmotic';
import type { Changefreq, SitemapFields, SitemapOptions } from '../types/options.js';
import { escapeXml } from '../utils/escape-xml.js';
import { toChangefreq } from '../utils/to-changefreq.js';
import { toLastmod } from '../utils/to-lastmod.js';
import { toLoc } from '../utils/to-loc.js';
import { toPriority } from '../utils/to-priority.js';

// The protocol's limit of URLs per sitemap file
const MAX_URLS = 50_000;

type Field = keyof SitemapFields;

// Sitemap written one <url> at a time. osmotic creates it on the first row of a run;
// end() closes the urlset.
export class SitemapWriter implements Exporter {
	private readonly stream: WriteStream;
	private readonly keys: Required<SitemapFields>;
	private readonly changefreq: Changefreq | null;
	private readonly priority: string | null;
	// Every loc written, so each URL is listed once
	private readonly seen = new Set<string>();
	// Fields already warned about, so each problem is reported once per file
	private readonly warned = new Set<Field | 'limit'>();
	private error: Error | null = null;

	constructor(
		private readonly file: string,
		{ fields = {}, changefreq, priority }: SitemapOptions,
	) {
		this.keys = { loc: 'loc', lastmod: 'lastmod', changefreq: 'changefreq', priority: 'priority', ...fields };
		this.changefreq = changefreq ?? null;
		this.priority = priority === undefined ? null : toPriority(priority);
		this.stream = createWriteStream(file, { encoding: 'utf8' });
		// Unhandled, a failed open would crash the process; write() and end() report it instead
		this.stream.on('error', (err) => (this.error ??= err));
		this.stream.write(
			'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n',
		);
	}

	write(data: Data): void {
		if (this.error) throw this.error;
		const loc = toLoc(data[this.keys.loc]);
		if (!loc) {
			this.warn('loc', `skipping row(s) without an absolute http(s) URL in "${this.keys.loc}"`);
			return;
		}
		if (this.seen.has(loc)) return; // Several links to one page are normal, so no warning
		this.seen.add(loc);
		if (this.seen.size > MAX_URLS) {
			this.warn('limit', `more than ${MAX_URLS.toLocaleString('en')} URLs, the most the sitemap protocol allows`);
		}
		const lastmod = this.field('lastmod', data, toLastmod);
		const changefreq = this.field('changefreq', data, toChangefreq) ?? this.changefreq;
		const priority = this.field('priority', data, toPriority) ?? this.priority;
		this.stream.write(
			`\t<url>\n\t\t<loc>${escapeXml(loc)}</loc>\n` +
				(lastmod ? `\t\t<lastmod>${escapeXml(lastmod)}</lastmod>\n` : '') +
				(changefreq ? `\t\t<changefreq>${changefreq}</changefreq>\n` : '') +
				(priority ? `\t\t<priority>${priority}</priority>\n` : '') +
				'\t</url>\n',
		);
	}

	end(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.error) return reject(this.error); // A stream that failed to open never finishes
			this.stream.once('error', reject);
			this.stream.end('</urlset>\n', (err?: Error | null) =>
				(err ?? this.error) ? reject(err ?? this.error) : resolve(),
			);
		});
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

	private warn(kind: Field | 'limit', message: string): void {
		if (this.warned.has(kind)) return;
		this.warned.add(kind);
		console.warn(`${this.file}: ${message}`);
	}
}

const show = (value: unknown): string => (typeof value === 'string' ? JSON.stringify(value) : String(value));
