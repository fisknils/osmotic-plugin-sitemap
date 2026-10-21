import type { SitemapOptions } from '../types/options.js';
import { MAX_BYTES, MAX_URLS } from './limits.js';
import { CHANGEFREQS, isChangefreq } from './to-changefreq.js';
import { toPriority } from './to-priority.js';

const FIELDS = ['loc', 'lastmod', 'changefreq', 'priority'];
const RULE_KEYS = ['match', 'changefreq', 'priority'];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

// Throws a TypeError for an option the sitemap can't use, naming it
export function checkOptions({ fields, changefreq, priority, rules, maxUrls, maxBytes, url }: SitemapOptions): void {
	if (fields !== undefined) {
		if (!isObject(fields)) throw new TypeError('Sitemap option fields must be an object');
		for (const [field, key] of Object.entries(fields)) {
			if (!FIELDS.includes(field)) {
				throw new TypeError(`Sitemap option fields: unknown field "${field}", expected ${FIELDS.join(', ')}`);
			}
			if (key !== undefined && typeof key !== 'string') {
				throw new TypeError(`Sitemap option fields.${field} must be a string`);
			}
		}
	}
	checkChangefreq('changefreq', changefreq);
	checkPriority('priority', priority);
	if (rules !== undefined) {
		if (!Array.isArray(rules)) throw new TypeError('Sitemap option rules must be an array');
		rules.forEach((rule: unknown, i) => {
			const name = `rules[${i}]`;
			if (!isObject(rule)) throw new TypeError(`Sitemap option ${name} must be an object`);
			if (!(rule.match instanceof RegExp) && typeof rule.match !== 'function') {
				throw new TypeError(`Sitemap option ${name}.match must be a RegExp or a function`);
			}
			const unknown = Object.keys(rule).find((key) => !RULE_KEYS.includes(key));
			if (unknown) {
				throw new TypeError(`Sitemap option ${name}: unknown key "${unknown}", expected ${RULE_KEYS.join(', ')}`);
			}
			checkChangefreq(`${name}.changefreq`, rule.changefreq);
			checkPriority(`${name}.priority`, rule.priority);
		});
	}
	checkLimit('maxUrls', maxUrls, MAX_URLS);
	checkLimit('maxBytes', maxBytes, MAX_BYTES);
	if (url !== undefined && !isHttpUrl(url)) {
		throw new TypeError('Sitemap option url must be an absolute http(s) URL');
	}
}

function checkChangefreq(name: string, value: unknown): void {
	if (value !== undefined && !isChangefreq(value)) {
		throw new TypeError(`Sitemap option ${name} must be one of ${CHANGEFREQS.join(', ')}`);
	}
}

function checkPriority(name: string, value: unknown): void {
	if (value !== undefined && (typeof value !== 'number' || toPriority(value) === null)) {
		throw new TypeError(`Sitemap option ${name} must be a number from 0 to 1`);
	}
}

function checkLimit(name: string, value: unknown, max: number): void {
	if (value !== undefined && !(Number.isInteger(value) && (value as number) >= 1 && (value as number) <= max)) {
		throw new TypeError(`Sitemap option ${name} must be a whole number from 1 to ${max}`);
	}
}

function isHttpUrl(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	try {
		const { protocol } = new URL(value);
		return protocol === 'http:' || protocol === 'https:';
	} catch {
		return false;
	}
}
