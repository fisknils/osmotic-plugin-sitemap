import { readFileSync } from 'node:fs';
import type { TestContext } from 'node:test';
import { Osmotic, type Data } from 'osmotic';

/** The `<loc>` values of a sitemap file, sorted, for files written by parallel branches. */
export const locs = (file: string): string[] =>
	[...readFileSync(file, 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]).sort();

/** The `<url>` entries of a sitemap file, in file order, as objects of their fields. */
export const entries = (file: string): Record<string, string>[] =>
	[...readFileSync(file, 'utf8').matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) =>
		Object.fromEntries([...m[1].matchAll(/<(\w+)>(.*?)<\/\1>/g)].map((f) => [f[1], f[2]])),
	);

/**
 * A chain that continues once for each of `list`, in order, with it as the data. For
 * values a page can't produce, such as dates and numbers; it fetches nothing.
 */
export const rows = (list: Data[]): Osmotic =>
	new Osmotic().use((ctx, next) =>
		list.reduce<Promise<void>>((done, data) => done.then(() => next({ ...ctx, data })), Promise.resolve()),
	);

/**
 * Collect `console.warn()` calls until test `t` ends, without printing them.
 *
 * @returns The messages, filled in as warnings arrive.
 */
export function warnings(t: TestContext): string[] {
	const messages: string[] = [];
	t.mock.method(console, 'warn', (...args: unknown[]) => void messages.push(args.join(' ')));
	return messages;
}
