// Playlist API routes
import { Router } from 'express';
import { getPlaylistTracks, getPlaylistDetails, isSpotifyPlaylistUrl } from '../services/spotify.js';
import { isYouTubeMusicUrl, getPlaylistTracks as getYTPlaylistTracks } from '../services/youtube.js';
import { matchPlaylistTracks, calculateCoverage, getLinksForTrack } from '../services/odesli.js';
import { findFallbacksForTracks } from '../services/smartFallback.js';

const router = Router();

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
      tracks = await getYTPlaylistTracks(url);
      details = {
        name: 'YouTube Music Playlist',
        description: '',
        artworkUrl: tracks[0]?.artworkUrl || '',
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

    // 2. Stream matched tracks in batches
    console.log(`  🔗 Matching ${tracks.length} tracks across platforms...`);
    let matchedTracks = [];
    const BATCH_SIZE = 3;

    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(async (track) => {
        if (!track.sourceUrl) {
          return { ...track, crossPlatformLinks: null, matchStatus: 'no_source' };
        }
        
        const linkData = await getLinksForTrack(track.sourceUrl);
        if (linkData) {
          return {
            ...track,
            crossPlatformLinks: linkData.links,
            odesliPageUrl: linkData.pageUrl,
            matchStatus: 'matched',
            thumbnailUrl: linkData.metadata.thumbnailUrl || track.artworkUrl,
          };
        }
        return { ...track, crossPlatformLinks: null, matchStatus: 'unmatched' };
      }));

      matchedTracks.push(...batchResults);
      sendEvent('batch', { tracks: batchResults });

      // Small delay to prevent strict rate-limiting
      if (i + BATCH_SIZE < tracks.length) {
        await new Promise(r => setTimeout(r, 450));
      }
    }

    // 3. Finalize
    const coverage = calculateCoverage(matchedTracks);
    sendEvent('done', { coverage });
    res.end();
  } catch (err) {
    console.error('Streaming error:', err);
    sendEvent('error', { message: err.message || 'Failed to analyze playlist' });
    res.end();
  }
});

/**
 * POST /api/playlist/analyze
 * Body: { url: string }
 * Fetches playlist tracks, matches across platforms, calculates coverage.
 */
router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Playlist URL is required' });
    }

    console.log(`\n🎵 Analyzing playlist: ${url}`);

    // Step 1: Determine source platform and fetch tracks
    let tracks = [];
    let details = {};

    if (isSpotifyPlaylistUrl(url)) {
      console.log('  📗 Detected Spotify playlist');
      [tracks, details] = await Promise.all([
        getPlaylistTracks(url),
        getPlaylistDetails(url),
      ]);
    } else if (isYouTubeMusicUrl(url)) {
      console.log('  📕 Detected YouTube Music playlist');
      tracks = await getYTPlaylistTracks(url);
      details = {
        name: 'YouTube Music Playlist',
        description: '',
        artworkUrl: tracks[0]?.artworkUrl || '',
        trackCount: tracks.length,
        platform: 'youtubeMusic',
        sourceUrl: url,
      };
    } else {
      return res.status(400).json({ error: 'Unsupported playlist URL. Please use a Spotify or YouTube Music playlist link.' });
    }

    console.log(`  📋 Found ${tracks.length} tracks`);

    // Step 2: Match tracks across platforms via Odesli
    console.log('  🔗 Matching across platforms...');
    const matchedTracks = await matchPlaylistTracks(tracks);

    // Step 3: Calculate coverage scores
    const coverage = calculateCoverage(matchedTracks);
    console.log('  📊 Coverage calculated');

    // Log summary
    for (const [platform, data] of Object.entries(coverage)) {
      console.log(`    ${platform}: ${data.percentage}% (${data.matched}/${data.total})`);
    }

    res.json({
      playlist: details,
      tracks: matchedTracks,
      coverage,
      totalTracks: tracks.length,
    });

  } catch (err) {
    console.error('Playlist analysis error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze playlist' });
  }
});

/**
 * POST /api/playlist/fallbacks
 * Body: { tracks: array, targetPlatform: string }
 * Finds smart fallback suggestions for unmatched tracks.
 */
router.post('/fallbacks', async (req, res) => {
  try {
    const { tracks, targetPlatform } = req.body;
    if (!tracks || !targetPlatform) {
      return res.status(400).json({ error: 'tracks and targetPlatform are required' });
    }

    console.log(`\n🔍 Finding fallbacks for ${targetPlatform}...`);
    const fallbacks = await findFallbacksForTracks(tracks, targetPlatform);

    res.json({ fallbacks });
  } catch (err) {
    console.error('Fallback error:', err);
    res.status(500).json({ error: err.message || 'Failed to find fallbacks' });
  }
});

export default router;
