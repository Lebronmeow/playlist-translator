// Playlist API routes
import { Router } from 'express';
import { getPlaylistTracks, getPlaylistDetails, isSpotifyPlaylistUrl } from '../services/spotify.js';
import { isYouTubeMusicUrl, searchTrack as searchYouTube, getPlaylistTracks as getYTPlaylistTracks, getPlaylistDetails as getYTPlaylistDetails, extractPlaylistId, cleanYouTubeTitle } from '../services/youtube.js';
import { calculateCoverage, getLinksForTrack } from '../services/odesli.js';
import { searchAppleMusic } from '../services/apple.js';

const router = Router();

/**
 * Match a single track across all platforms using direct API calls.
 * Strategy: Always search each platform directly. Odesli is optional bonus.
 */
async function matchTrackDirectly(track) {
  const cleanTitle = cleanYouTubeTitle(track.title);
  const searchTitle = cleanTitle || track.title;
  const artist = track.artist;
  const isSpotifySource = track.platform === 'spotify';
  const isYtSource = track.platform === 'youtubeMusic' || track.sourceUrl?.includes('youtube.com');

  const links = {};

  // 1. Try Odesli first (may fail due to rate limits - that's OK)
  let odesliData = null;
  try {
    odesliData = await getLinksForTrack(track.sourceUrl);
    if (odesliData?.links) {
      Object.assign(links, odesliData.links);
    }
  } catch (e) {
    // Odesli failed, continue with direct APIs
  }

  // 2. Apple Music — iTunes Search API (free, reliable, no rate limit issues)
  if (!links.appleMusic) {
    try {
      const amResult = await searchAppleMusic(searchTitle, artist);
      if (amResult) {
        links.appleMusic = { url: amResult.url };
      }
    } catch (e) { /* continue */ }
  }

  // 3. YouTube Music — Official YouTube Data API v3
  if (!links.youtubeMusic) {
    if (isYtSource) {
      // Source is already YouTube, use the source URL
      links.youtubeMusic = { url: track.sourceUrl };
    } else {
      try {
        const ytResult = await searchYouTube(searchTitle, artist);
        if (ytResult) {
          links.youtubeMusic = { url: ytResult.url };
        }
      } catch (e) { /* continue */ }
    }
  }

  // 4. Spotify — generate search deep link (API blocked without Premium)
  if (!links.spotify) {
    if (isSpotifySource) {
      links.spotify = { url: track.sourceUrl };
    } else {
      links.spotify = { url: `https://open.spotify.com/search/${encodeURIComponent(`${searchTitle} ${artist}`)}` };
    }
  }

  const hasAnyLink = Object.keys(links).length > 0;

  return {
    ...track,
    title: searchTitle, // Use cleaned title
    crossPlatformLinks: hasAnyLink ? links : null,
    odesliPageUrl: odesliData?.pageUrl || null,
    matchStatus: hasAnyLink ? 'matched' : 'unmatched',
    thumbnailUrl: odesliData?.metadata?.thumbnailUrl || track.artworkUrl,
  };
}

/**
 * GET /api/playlist/stream
 * Query: ?url=...
 * Streams the playlist analysis via Server-Sent Events for real-time frontend mapping.
 */
router.get('/stream', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Playlist URL is required' });

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type, data) => res.write(`data: ${JSON.stringify({ type, data })}\n\n`);

  try {
    console.log(`\n🎵 Streaming analysis: ${url}`);
    
    let tracks = [];
    let details = {};

    // 1. Resolve playlist details and original tracks
    if (isSpotifyPlaylistUrl(url)) {
      [tracks, details] = await Promise.all([
        getPlaylistTracks(url),
        getPlaylistDetails(url),
      ]);
    } else if (isYouTubeMusicUrl(url)) {
      const plId = extractPlaylistId(url);
      const [fetchedTracks, ytDetails] = await Promise.all([
        getYTPlaylistTracks(url),
        plId ? getYTPlaylistDetails(plId) : null,
      ]);
      tracks = fetchedTracks;
      details = {
        name: ytDetails?.name || 'YouTube Music Playlist',
        description: ytDetails?.description || '',
        artworkUrl: ytDetails?.artworkUrl || tracks[0]?.artworkUrl || '',
        trackCount: tracks.length,
        platform: 'youtubeMusic',
        sourceUrl: url,
      };
    } else {
      sendEvent('error', { message: 'Unsupported playlist URL. Please use Spotify or YouTube Music.' });
      return res.end();
    }

    // Inform client about the initial payload
    sendEvent('init', { playlist: details, totalTracks: tracks.length, initialTracks: tracks });

    // 2. Match tracks using DIRECT PLATFORM APIs (not just Odesli)
    console.log(`  🔗 Matching ${tracks.length} tracks using direct APIs...`);
    let matchedTracks = [];
    const BATCH_SIZE = 3;

    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(track => matchTrackDirectly(track)));

      matchedTracks.push(...batchResults);
      sendEvent('batch', { tracks: batchResults });

      // Log progress
      const done = Math.min(i + BATCH_SIZE, tracks.length);
      const matched = batchResults.filter(t => t.matchStatus === 'matched').length;
      console.log(`  📊 ${done}/${tracks.length} processed (${matched}/${BATCH_SIZE} matched in batch)`);

      // Small delay between batches
      if (i + BATCH_SIZE < tracks.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // 3. Finalize
    const coverage = calculateCoverage(matchedTracks);
    console.log(`\n  ✅ Final coverage:`);
    for (const [p, d] of Object.entries(coverage)) {
      console.log(`    ${p}: ${d.percentage}% (${d.matched}/${d.total})`);
    }
    sendEvent('done', { coverage });
    res.end();
  } catch (err) {
    console.error('Streaming error:', err);
    sendEvent('error', { message: err.message || 'Failed to analyze playlist' });
    res.end();
  }
});

/**
 * POST /api/playlist/analyze (legacy non-streaming endpoint)
 */
router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Playlist URL is required' });

    let tracks = [];
    let details = {};

    if (isSpotifyPlaylistUrl(url)) {
      [tracks, details] = await Promise.all([
        getPlaylistTracks(url),
        getPlaylistDetails(url),
      ]);
    } else if (isYouTubeMusicUrl(url)) {
      const plId = extractPlaylistId(url);
      const [fetchedTracks, ytDetails] = await Promise.all([
        getYTPlaylistTracks(url),
        plId ? getYTPlaylistDetails(plId) : null,
      ]);
      tracks = fetchedTracks;
      details = {
        name: ytDetails?.name || 'YouTube Music Playlist',
        description: ytDetails?.description || '',
        artworkUrl: ytDetails?.artworkUrl || tracks[0]?.artworkUrl || '',
        trackCount: tracks.length,
        platform: 'youtubeMusic',
        sourceUrl: url,
      };
    } else {
      return res.status(400).json({ error: 'Unsupported playlist URL.' });
    }

    const matchedTracks = await Promise.all(tracks.map(t => matchTrackDirectly(t)));
    const coverage = calculateCoverage(matchedTracks);

    res.json({ playlist: details, tracks: matchedTracks, coverage, totalTracks: tracks.length });
  } catch (err) {
    console.error('Playlist analysis error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze playlist' });
  }
});

/**
 * POST /api/playlist/fallbacks (kept for compatibility)
 */
router.post('/fallbacks', async (req, res) => {
  // With direct API matching, fallbacks are mostly unnecessary
  // but we keep the endpoint to avoid frontend errors
  res.json({ fallbacks: {} });
});

export default router;
