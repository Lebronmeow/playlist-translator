// Universal link routes
import { Router } from 'express';
import { createLink, getLink, getAllLinks } from '../services/linkStore.js';

const router = Router();

/**
 * POST /api/link
 * Body: { name, artworkUrl, tracks, coverage, sourceUrl, sourcePlatform }
 * Creates a new universal link.
 */
router.post('/', (req, res) => {
  try {
    const { name, artworkUrl, tracks, coverage, sourceUrl, sourcePlatform } = req.body;

    if (!name || !tracks) {
      return res.status(400).json({ error: 'name and tracks are required' });
    }

    const result = createLink({
      name,
      artworkUrl,
      tracks,
      coverage,
      sourceUrl,
      sourcePlatform,
    });

    console.log(`🔗 Created universal link: /p/${result.id}`);
    res.json(result);
  } catch (err) {
    console.error('Link creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create link' });
  }
});

/**
 * GET /api/link/:id
 * Returns the full playlist data for a universal link.
 */
router.get('/:id', (req, res) => {
  const link = getLink(req.params.id);
  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }
  res.json(link);
});

/**
 * GET /api/links
 * Returns a list of all saved links (for admin/debug).
 */
router.get('/', (req, res) => {
  res.json(getAllLinks());
});

export default router;
