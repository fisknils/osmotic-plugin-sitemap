import { MAX_LOC_LENGTH, MIN_LOC_LENGTH } from './limits.js';

// The absolute http(s) URL of value, normalized and without its fragment, or null.
// new URL() percent-encodes what URLs can't hold and punycodes the host.
export function toLoc(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	try {
		const url = new URL(value.trim());
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
		url.hash = '';
		const { href } = url;
		return href.length >= MIN_LOC_LENGTH && href.length <= MAX_LOC_LENGTH ? href : null;
	} catch {
		return null; // Relative or malformed
	}
}
