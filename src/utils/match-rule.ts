import type { SitemapRule } from '../types/options.js';

// Whether rule applies to url: a RegExp is tested against the path, a function called
export function matchRule({ match }: SitemapRule, url: URL): boolean {
	if (typeof match === 'function') return Boolean(match(url));
	match.lastIndex = 0; // A global or sticky RegExp would otherwise start where the last test ended
	return match.test(url.pathname);
}
