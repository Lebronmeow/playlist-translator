// Lyrics (LRCLIB), album art (MusicBrainz + Cover Art Archive), and audio preview (Deezer) proxy routes
import { Router } from 'express';

const router = Router();

const MB_USER_AGENT = 'PlaylistTranslator/1.0 (https://github.com)';

/**
 * Helper: fetch with timeout and abort support
 */
async function fetchWithTimeout(url, opts = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Helper: Get album art from MusicBrainz + Cover Art Archive
 * 1. Search MusicBrainz for a recording by artist + track
 * 2. Extract the release (album) ID
 * 3. Fetch the front cover from Cover Art Archive
 * Returns: { albumArt, album } or null
 */
async function getAlbumArtFromMusicBrainz(artist, track) {
  try {
    // Step 1: Search MusicBrainz for the recording
    const query = encodeURIComponent(`artist:"${artist}" AND recording:"${track}"`);
    const mbRes = await fetchWithTimeout(
      `https://musicbrainz.org/ws/2/recording/?query=${query}&limit=3&fmt=json`,
      { headers: { 'User-Agent': MB_USER_AGENT } },
      6000
    );
    if (!mbRes.ok) return null;

    const mbData = await mbRes.json();
    const recordings = mbData?.recordings;
    if (!recordings?.length) return null;

    // Find a release with the best score (prefer official albums)
    let releaseId = null;
    let albumTitle = null;
    for (const rec of recordings) {
      if (rec.releases?.length) {
        // Prefer official albums over compilations
        const official = rec.releases.find(
          (r) => r.status === 'Official' && r['release-group']?.['primary-type'] === 'Album'
        );
        const release = official || rec.releases[0];
        releaseId = release.id;
        albumTitle = release.title;
        break;
      }
    }
    if (!releaseId) return null;

    // Step 2: Get cover art from Cover Art Archive
    // Use the redirect URL for the front cover (faster than JSON lookup)
    const coverUrl = `https://coverartarchive.org/release/${releaseId}/front-500`;

    // Verify the cover exists with a HEAD request
    try {
      const headRes = await fetchWithTimeout(coverUrl, {
        method: 'HEAD',
        redirect: 'follow',
      }, 4000);

      if (headRes.ok || headRes.status === 307 || headRes.status === 302) {
        return {
          albumArt: coverUrl,
          album: albumTitle,
          releaseId,
        };
      }
    } catch {
      // HEAD failed, try the JSON approach
    }

    // Fallback: fetch JSON from Cover Art Archive
    try {
      const caaRes = await fetchWithTimeout(
        `https://coverartarchive.org/release/${releaseId}`,
        {},
        5000
      );
      if (caaRes.ok) {
        const caaData = await caaRes.json();
        const front = caaData?.images?.find((img) => img.front);
        if (front) {
          return {
            albumArt: front.thumbnails?.['500'] || front.thumbnails?.large || front.image,
            album: albumTitle,
            releaseId,
          };
        }
      }
    } catch {
      // Cover Art Archive unreachable
    }

    return null;
  } catch (err) {
    console.error('MusicBrainz lookup error:', err.message);
    return null;
  }
}

/**
 * Helper: Get audio preview from Deezer
 * Returns: { previewUrl, deezerId, deezerAlbumArt } or null
 */
async function getPreviewFromDeezer(artist, track) {
  try {
    const query = `${artist} ${track}`;
    const res = await fetchWithTimeout(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`,
      {},
      6000
    );
    if (!res.ok) return null;

    const data = await res.json();
    const hit = data?.data?.[0];
    if (!hit || !hit.preview) return null;

    return {
      previewUrl: hit.preview,
      deezerId: hit.id,
      deezerAlbumArt: hit.album?.cover_xl || hit.album?.cover_big || hit.album?.cover_medium,
      deezerTitle: hit.title,
      deezerArtist: hit.artist?.name,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/lyrics/search
 * Query: ?artist=...&track=...
 * Proxies LRCLIB for synced lyrics (no API key needed).
 */
router.get('/search', async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res.status(400).json({ error: 'artist and track are required' });
  }

  try {
    const params = new URLSearchParams({
      artist_name: artist,
      track_name: track,
    });

    const response = await fetchWithTimeout(`https://lrclib.net/api/get?${params}`, {
      headers: { 'User-Agent': 'PlaylistTranslator/1.0' },
    });

    if (!response.ok) {
      return res.json({ found: false, plainLyrics: null, syncedLyrics: null });
    }

    const data = await response.json();
    res.json({
      found: true,
      plainLyrics: data.plainLyrics || null,
      syncedLyrics: data.syncedLyrics || null,
      trackName: data.trackName,
      artistName: data.artistName,
      albumName: data.albumName,
      duration: data.duration,
    });
  } catch (err) {
    console.error('LRCLIB error:', err.message);
    res.json({ found: false, plainLyrics: null, syncedLyrics: null });
  }
});

/**
 * GET /api/lyrics/preview
 * Query: ?artist=...&track=...
 * Gets album art from MusicBrainz/CoverArt + audio preview from Deezer.
 */
router.get('/preview', async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res.status(400).json({ error: 'artist and track are required' });
  }

  try {
    // Fetch album art and preview in parallel
    const [artResult, previewResult] = await Promise.allSettled([
      getAlbumArtFromMusicBrainz(artist, track),
      getPreviewFromDeezer(artist, track),
    ]);

    const art = artResult.status === 'fulfilled' ? artResult.value : null;
    const preview = previewResult.status === 'fulfilled' ? previewResult.value : null;

    if (!art && !preview) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      previewUrl: preview?.previewUrl || '',
      title: preview?.deezerTitle || track,
      artist: preview?.deezerArtist || artist,
      album: art?.album || '',
      albumArt: art?.albumArt || preview?.deezerAlbumArt || '',
      deezerId: preview?.deezerId || null,
    });
  } catch (err) {
    console.error('Preview error:', err.message);
    res.json({ found: false });
  }
});

/**
 * GET /api/lyrics/featured
 * Returns a curated list of featured tracks with album art + preview for the homepage.
 * Uses MusicBrainz + Cover Art Archive for album art (free, no auth)
 * and Deezer for audio previews (also free, no auth).
 */
router.get('/featured', async (_req, res) => {
  const featured = [
    { artist: 'The Weeknd', track: 'Blinding Lights' },
    { artist: 'Dua Lipa', track: 'Levitating' },
    { artist: 'Billie Eilish', track: 'lovely' },
    { artist: 'Harry Styles', track: 'As It Was' },
    { artist: 'Daft Punk', track: 'Get Lucky' },
    { artist: 'Arctic Monkeys', track: 'Do I Wanna Know' },
  ];

  try {
    // Add staggered delays for MusicBrainz rate limiting (1 req/sec guideline)
    const results = [];
    for (let i = 0; i < featured.length; i++) {
      const { artist, track } = featured[i];

      // Small stagger to be polite to MusicBrainz (they rate limit at 1 req/s)
      if (i > 0) await new Promise((r) => setTimeout(r, 350));

      try {
        const [artResult, previewResult] = await Promise.allSettled([
          getAlbumArtFromMusicBrainz(artist, track),
          getPreviewFromDeezer(artist, track),
        ]);

        const art = artResult.status === 'fulfilled' ? artResult.value : null;
        const preview = previewResult.status === 'fulfilled' ? previewResult.value : null;

        results.push({
          title: preview?.deezerTitle || track,
          artist: preview?.deezerArtist || artist,
          album: art?.album || '',
          albumArt: art?.albumArt || preview?.deezerAlbumArt || '',
          previewUrl: preview?.previewUrl || '',
          deezerId: preview?.deezerId || null,
        });
      } catch {
        // Skip this track silently
        results.push({
          title: track,
          artist,
          album: '',
          albumArt: '',
          previewUrl: '',
          deezerId: null,
        });
      }
    }

    // Filter out tracks with no album art at all (keep them but mark as incomplete)
    res.json({ tracks: results });
  } catch (err) {
    console.error('Featured tracks error:', err.message);
    res.json({ tracks: [] });
  }
});

export default router;
