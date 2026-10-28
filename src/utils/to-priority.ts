// value, a number or a string of one from 0 to 1, as a sitemap priority, or null.
// Whole numbers get one decimal (1 -> "1.0"), the form the protocol uses.
export function toPriority(value: unknown): string | null {
	let n: number;
	if (typeof value === 'number') n = value;
	else if (typeof value === 'string' && /^(\d+(\.\d+)?|\.\d+)$/.test(value.trim())) n = Number(value);
	else return null;
	if (!(n >= 0 && n <= 1)) return null; // Also rejects NaN
	return Number.isInteger(n) ? n.toFixed(1) : String(n);
}
