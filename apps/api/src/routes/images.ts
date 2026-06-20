import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const router = Router();

const UPLOADS_DIR = process.env.IMAGE_UPLOADS_DIR
  ?? path.join(process.cwd(), '.uploads', 'images');

// Ensure the uploads directory exists on startup
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(() => {});

/**
 * POST /api/images/upload
 * Body: { base64: string, mediaType: string }
 * Returns: { url: string }
 *
 * Rudimentary storage: writes to disk.
 * Swap UPLOADS_DIR and the write logic here to move to S3/R2/etc.
 */
router.post('/upload', async (req, res) => {
  const { base64, mediaType } = req.body as { base64?: string; mediaType?: string };

  if (!base64 || !mediaType) {
    return res.status(400).json({ error: 'base64 and mediaType are required' });
  }

  const ext = mediaType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
  const filename = `${randomUUID()}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  try {
    await fs.writeFile(filepath, Buffer.from(base64, 'base64'));
  } catch (err) {
    console.error('[ImageStorage] Write failed:', err);
    return res.status(500).json({ error: 'Failed to store image' });
  }

  const baseUrl = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
  return res.json({ url: `${baseUrl}/api/images/${filename}` });
});

/**
 * GET /api/images/:filename
 * Serves stored images from disk.
 * This route will stay the same even after swapping storage — just point it
 * to a CDN URL redirect instead of a local file serve.
 */
router.get('/:filename', async (req, res) => {
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filepath = path.join(UPLOADS_DIR, filename);

  try {
    await fs.access(filepath);
    res.sendFile(filepath);
  } catch {
    res.status(404).json({ error: 'Image not found' });
  }
});

export { router as imageRouter };
