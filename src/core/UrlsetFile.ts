import { createWriteStream, type WriteStream } from 'node:fs';

const HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
const FOOTER = '</urlset>\n';
const FOOTER_BYTES = Buffer.byteLength(FOOTER);

// One urlset file, written one entry at a time and counted, so the writer can tell when
// the next entry would pass a limit
export class UrlsetFile {
	private readonly stream: WriteStream;
	private urls = 0;
	private bytes = Buffer.byteLength(HEADER);
	error: Error | null = null;

	constructor(readonly file: string) {
		this.stream = createWriteStream(file, { encoding: 'utf8' });
		// Unhandled, a failed open would crash the process; write() and end() report it instead
		this.stream.on('error', (err) => (this.error ??= err));
		this.stream.write(HEADER);
	}

	// Whether entry fits within the limits; the first entry always does, so an entry
	// larger than maxBytes gets a file of its own
	fits(entry: string, maxUrls: number, maxBytes: number): boolean {
		return this.urls === 0 || (this.urls < maxUrls && this.bytes + Buffer.byteLength(entry) + FOOTER_BYTES <= maxBytes);
	}

	write(entry: string): void {
		if (this.error) throw this.error;
		this.stream.write(entry);
		this.urls++;
		this.bytes += Buffer.byteLength(entry);
	}

	end(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.error) return reject(this.error); // A stream that failed to open never finishes
			this.stream.once('error', reject);
			this.stream.end(FOOTER, (err?: Error | null) => ((err ?? this.error) ? reject(err ?? this.error) : resolve()));
		});
	}
}
