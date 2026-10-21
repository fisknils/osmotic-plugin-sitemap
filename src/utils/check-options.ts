import type { SitemapOptions } from '../types/options.js';
import { CHANGEFREQS, isChangefreq } from './to-changefreq.js';
import { toPriority } from './to-priority.js';

const FIELDS = ['loc', 'lastmod', 'changefreq', 'priority'];

// Throws a TypeError for an option the sitemap can't use, naming it
export function checkOptions({ fields, changefreq, priority }: SitemapOptions): void {
	if (fields !== undefined) {
		if (typeof fields !== 'object' || fields === null) throw new TypeError('Sitemap option fields must be an object');
		for (const [field, key] of Object.entries(fields)) {
			if (!FIELDS.includes(field)) {
				throw new TypeError(`Sitemap option fields: unknown field "${field}", expected ${FIELDS.join(', ')}`);
			}
			if (key !== undefined && typeof key !== 'string') {
				throw new TypeError(`Sitemap option fields.${field} must be a string`);
			}
		}
	}
	if (changefreq !== undefined && !isChangefreq(changefreq)) {
		throw new TypeError(`Sitemap option changefreq must be one of ${CHANGEFREQS.join(', ')}`);
	}
	if (priority !== undefined && (typeof priority !== 'number' || toPriority(priority) === null)) {
		throw new TypeError('Sitemap option priority must be a number from 0 to 1');
	}
}
