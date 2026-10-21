import type { SitePage } from '../create-site.js';

// A small blog with the URLs a real one has and a sitemap has to escape or encode: a
// tag page whose query has an ampersand, a slug with an apostrophe, and a Swedish slug
// with non-ASCII letters and a space. The archive lists every post on one page, so rows
// reach the exporter in order; it marks each with its sitemap hints, and the last entry
// links to the first post's comments, the same page under another URL.

interface Post {
	/** The href as written in the page's HTML. */
	href: string;
	/** The path the server sees. */
	path: string;
	title: string;
	/** W3C Datetime of the last change. */
	updated?: string;
	changefreq?: string;
	priority?: string;
}

export const posts: Post[] = [
	{
		href: '/posts/hello-world',
		path: '/posts/hello-world',
		title: 'Hello, world',
		updated: '2026-09-01',
		changefreq: 'monthly',
		priority: '0.8',
	},
	{
		href: '/tags?name=node&amp;sort=new',
		path: '/tags?name=node&sort=new',
		title: 'Posts tagged node',
		updated: '2026-10-20T08:30:00+02:00',
		changefreq: 'weekly',
		priority: '1',
	},
	{ href: "/posts/what's-new", path: "/posts/what's-new", title: "What's new" },
	{
		href: '/inlägg/glögg recept',
		path: '/inl%C3%A4gg/gl%C3%B6gg%20recept',
		title: 'Glögg',
		updated: '2025-12-24',
		priority: '0.3',
	},
];

const attrs = (p: Post) =>
	(p.changefreq ? ` data-changefreq="${p.changefreq}"` : '') + (p.priority ? ` data-priority="${p.priority}"` : '');

const item = (p: Post) => `
		<li class="post"${attrs(p)}>
			<a href="${p.href}">${p.title}</a>${
				p.updated
					? `
			<time datetime="${p.updated}">${p.updated.slice(0, 10)}</time>`
					: ''
			}
		</li>`;

// Pages without a query get a permalink with ?ref=post
const hasPermalink = (p: Post) => !p.path.includes('?');

const page = (canonical: string, title: string, body = '') => `<!doctype html>
<html>
<head>
	<meta charset="utf-8">
	<title>${title}</title>
	<link rel="canonical" href="${canonical}">
</head>
<body>
	<h1>${title}</h1>${body}
</body>
</html>`;

export const blog: Record<string, SitePage> = {
	'/': page(
		'/',
		'Archive',
		`
	<ul class="posts">${posts.map(item).join('')}
		<li class="post"><a href="/posts/hello-world#comments">Comments on Hello, world</a></li>
	</ul>`,
	),
	...Object.fromEntries(
		posts.map((p) => [
			p.path,
			page(
				p.href,
				p.title,
				'\n\t<a href="/">Archive</a>' + (hasPermalink(p) ? ` <a href="${p.href}?ref=post">Permalink</a>` : ''),
			),
		]),
	),
	// The permalinks: the same pages under another URL, with the same canonical link
	...Object.fromEntries(
		posts.filter(hasPermalink).map((p) => [`${p.path}?ref=post`, page(p.href, p.title, '\n\t<a href="/">Archive</a>')]),
	),
};
