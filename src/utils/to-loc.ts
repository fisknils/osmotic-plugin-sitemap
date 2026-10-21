// The absolute http(s) URL of value, normalized and without its fragment, or null.
// new URL() percent-encodes what URLs can't hold and punycodes the host.
export function toLoc(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	try {
		const url = new URL(value.trim());
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
		url.hash = '';
		return url.href;
	} catch {
		return null; // Relative or malformed
	}
}
