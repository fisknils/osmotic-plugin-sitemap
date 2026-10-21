const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

// The five characters the sitemap protocol requires as entities
export const escapeXml = (s: string): string => s.replace(/[&<>"']/g, (c) => ENTITIES[c]);
