// W3C Datetime: YYYY, YYYY-MM, YYYY-MM-DD, or a date with hh:mm, hh:mm:ss or
// hh:mm:ss.s and a time zone (https://www.w3.org/TR/NOTE-datetime)
const W3C_DATETIME = /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/;

// value as a sitemap lastmod, or null. Strings are kept as written, since reparsing
// them would change their precision or time zone.
export function toLastmod(value: unknown): string | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
	if (typeof value !== 'string') return null;
	const s = value.trim();
	return W3C_DATETIME.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
}
