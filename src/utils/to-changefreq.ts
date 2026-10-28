import type { Changefreq } from '../types/options.js';

export const CHANGEFREQS: readonly Changefreq[] = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

export const isChangefreq = (value: unknown): value is Changefreq => CHANGEFREQS.includes(value as Changefreq);

// value as a sitemap changefreq, ignoring case and surrounding space, or null
export function toChangefreq(value: unknown): Changefreq | null {
	if (typeof value !== 'string') return null;
	const s = value.trim().toLowerCase();
	return isChangefreq(s) ? s : null;
}
