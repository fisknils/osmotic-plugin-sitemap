import { format, parse } from 'node:path';

// The path of part n of a split sitemap: sitemap.xml -> sitemap-2.xml, next to it
export function partFile(file: string, n: number): string {
	const { dir, name, ext } = parse(file);
	return format({ dir, name: `${name}-${n}`, ext });
}
