/**
 * Canonical site identity, navigation, and static-route metadata for the docs
 * application. Keep public URLs and shared labels here so layouts, metadata,
 * sitemap generation, and Pages Functions stay in sync.
 */

/** Public MemoFS URLs and default social metadata. */
export const SITE = {
	name: "MemoFS",
	docsUrl: "https://memofs.dev",
	productUrl: "https://cloud.memofs.dev",
	cloudUrl: "https://cloud.memofs.dev",
	githubUrl: "https://github.com/0xbuffdev/memofs",
	xUrl: "https://x.com/memofsdev",
	xHandle: "@memofsdev",
	engram: "https://engram.memofs.dev",
	defaultImagePath: "/og-default.png",
	description:
		"The file-first memory runtime for AI agents. Store decisions, facts, and context as markdown in your project. Local by default, cloud-ready.",
	githubReleasesUrl: "https://github.com/0xbuffdev/memofs/releases",
	/** Newest tagged release train (also the GitHub "Latest" release). */
	latestRelease: "v1.3.0-beta.3",
} as const;

/** Builds the GitHub release URL for a tagged version train (e.g. `v1.3.0-beta.3`). */
export function releaseTagUrl(version: string): string {
	return `${SITE.githubReleasesUrl}/tag/${version}`;
}

/** Canonical internal routes shared by navigation, metadata, and prerendering. */
export const ROUTES = {
	home: "/",
	docs: "/docs",
	introduction: "/docs/introduction",
	core: "/docs/core",
	mcp: "/docs/mcp",
	cli: "/docs/cli",
	server: "/docs/server",
	api: "/docs/api",
	changelog: "/changelog",
	articles: "/articles",
	manifesto: "/manifesto",
	llms: "/llms.txt",
	llmsFull: "/llms-full.txt",
	sitemap: "/sitemap.xml",
	searchIndex: "/search-index.json",
} as const;

/** Static application pages in addition to documentation pages discovered from MDX. */
export const STATIC_PRERENDER_PATHS = [
	ROUTES.sitemap,
	ROUTES.llms,
	ROUTES.llmsFull,
	ROUTES.searchIndex,
	ROUTES.docs,
	ROUTES.changelog,
	ROUTES.manifesto,
	ROUTES.articles,
] as const;

/** Primary navigation rendered by the Fumadocs layouts. */
export const PRIMARY_NAVIGATION = [
	{ text: "Documentation", url: ROUTES.docs, active: "url", on: "all" },
	{
		text: "Manifesto",
		url: ROUTES.manifesto,
		active: "url",
		on: "all",
	},
	{
		text: "Articles",
		url: ROUTES.articles,
		active: "nested-url",
		on: "all",
	},
	{
		text: "Changelog",
		url: ROUTES.changelog,
		active: "nested-url",
		on: "all",
	},
	{ text: "Cloud", url: SITE.cloudUrl, external: true, on: "all" },
] as const;

/** Link data for the footer, grouped independently from its presentation. */
export const FOOTER_NAVIGATION = [
	{
		title: "Documentation",
		links: [
			{ label: "Introduction", href: ROUTES.introduction },
			{ label: "Quick Start", href: ROUTES.docs },
			{ label: "Core SDK & Runtime", href: ROUTES.core },
			{ label: "MCP Server", href: ROUTES.mcp },
			{ label: "CLI Reference", href: ROUTES.cli },
			{ label: "Self-Hosting", href: ROUTES.server },
		],
	},
	{
		title: "Ecosystem",
		links: [
			{ label: "Vercel AI SDK", href: "/docs/adapters/ai-sdk" },
			{ label: "Transformers.js", href: "/docs/adapters/transformers" },
			{ label: "OpenAI Embeddings", href: "/docs/adapters/openai" },
			{ label: "Voyage AI", href: "/docs/adapters/voyage" },
			{ label: "Cloudflare R2", href: "/docs/adapters/r2" },
			{ label: "Turso (libSQL)", href: "/docs/adapters/turso" },
		],
	},
	{
		title: "Resources & AI",
		links: [
			{ label: "Articles", href: ROUTES.articles },
			{ label: "Manifesto", href: ROUTES.manifesto },
			{ label: "Changelog", href: ROUTES.changelog },
			{ label: "API Reference", href: ROUTES.api },
			{ label: "sitemap.xml", href: ROUTES.sitemap, external: true },
			{ label: "llms.txt", href: ROUTES.llms, external: true },
			{ label: "llms-full.txt", href: ROUTES.llmsFull, external: true },
			{ label: "GitHub", href: SITE.githubUrl, external: true },
			{ label: "X", href: SITE.xUrl, external: true },
		],
	},
] as const;

/** Builds a public absolute URL from a canonical application path. */
export function toSiteUrl(path: string): string {
	return new URL(path, SITE.docsUrl).toString();
}
