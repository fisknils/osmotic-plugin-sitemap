// What the official schema accepts: an xsd:date (YYYY-MM-DD) or an xsd:dateTime. The
// protocol asks for W3C Datetime, so a dateTime needs a time zone. W3C Datetime's
// shorter forms (YYYY, YYYY-MM, times without seconds) are not valid in the schema.
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

// value as a sitemap lastmod, or null. Strings are kept as written, since reparsing
// them would change their precision or time zone; a time without seconds gets ":00".
export function toLastmod(value: unknown): string | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
	if (typeof value !== 'string') return null;
	let s = value.trim();
	const m = DATETIME.exec(s);
	if (m && !m[2]) s = `${m[1]}:00${m[3]}`;
	else if (!m && !DATE.test(s)) return null;
	return Number.isNaN(Date.parse(s)) ? null : s;
}
