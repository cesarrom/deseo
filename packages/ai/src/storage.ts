export interface ImageStorageProvider {
  upload(base64: string, mediaType: string): Promise<string>;
}

/**
 * Uploads images to a Deseo API storage endpoint and returns a permanent URL.
 * The rudimentary implementation stores files on disk; swap the endpoint
 * implementation later for S3, R2, etc. without touching this class.
 */
export class HttpImageStorage implements ImageStorageProvider {
  constructor(private readonly uploadUrl: string) {}

  async upload(base64: string, mediaType: string): Promise<string> {
    const response = await fetch(this.uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mediaType }),
    });

    if (!response.ok) {
      throw new Error(`Image storage upload failed: ${response.status} ${await response.text()}`);
    }

    const { url } = (await response.json()) as { url: string };
    if (!url) throw new Error('Image storage returned no URL');
    return url;
  }
}
