// Playlist API routes
import { Router } from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import { getPlaylistTracks, getPlaylistDetails, isSpotifyPlaylistUrl } from '../services/spotify.js';
import { isYouTubeMusicUrl, searchTrack as searchYouTube, getPlaylistTracks as getYTPlaylistTracks, getPlaylistDetails as getYTPlaylistDetails, extractPlaylistId, cleanYouTubeTitle } from '../services/youtube.js';
import { calculateCoverage, getLinksForTrack } from '../services/odesli.js';
import { searchAppleMusic } from '../services/apple.js';
import { getTokensForSession, getSpotifyTokensForSession } from './auth.js';
import { createYouTubePlaylist } from '../services/ytmCreate.js';
import { spotifyService } from '../services/spotifyService.js';
import { appleApi } from '../services/appleBridge.js';

const router = Router();

function extractSpotifyTrackId(value) {
  if (!value || typeof value !== 'string') return null;
  const trackUrlMatch = value.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (trackUrlMatch) return trackUrlMatch[1];

  const uriMatch = value.match(/^spotify:track:([a-zA-Z0-9]+)$/);
  if (uriMatch) return uriMatch[1];

  // Some responses may return just a raw ID.
  if (/^[a-zA-Z0-9]{20,}$/.test(value)) return value;
  return null;
}

function extractAppleTrackId(value) {
  if (!value || typeof value !== 'string') return null;
  const trackUrlMatch = value.match(/music\.apple\.com\/[^\/]+\/song\/[^\/]+\/(\d+)/);
  if (trackUrlMatch) return trackUrlMatch[1];

  // Some responses may return just a raw ID.
  if (/^\d+$/.test(value)) return value;
  return null;
}

async function resolveSpotifyTrackUrls(tracks) {
  const trackIds = new Set();
  const unresolved = [];

  for (const track of tracks) {
    const spotifyUrl = track?.crossPlatformLinks?.spotify?.url;
    const parsedId = extractSpotifyTrackId(spotifyUrl);
    if (parsedId) {
      trackIds.add(parsedId);
    } else {
      unresolved.push(track);
    }
  }

  // Workaround 1: resolve missing Spotify IDs from alternate cross-platform links via Odesli.
  // Cap to keep request latency bounded.
  const odesliCandidates = unresolved.slice(0, 20);
  await Promise.allSettled(
    odesliCandidates.map(async (track) => {
      const candidates = [
        track?.sourceUrl,
        track?.crossPlatformLinks?.youtubeMusic?.url,
        track?.crossPlatformLinks?.appleMusic?.url,
        track?.odesliPageUrl,
      ].filter(Boolean);

      for (const sourceUrl of candidates) {
        try {
          const odesli = await getLinksForTrack(sourceUrl);
          const spotifyUrl = odesli?.links?.spotify?.url;
          const parsedId = extractSpotifyTrackId(spotifyUrl);
          if (parsedId) {
            trackIds.add(parsedId);
            return;
          }
        } catch (err) {
          // Try the next candidate URL.
        }
      }
    })
  );

  // Workaround 2: resolve remaining missing Spotify IDs using official API search.
  const searchCandidates = unresolved
    .filter((track) => {
      const spotifyUrl = track?.crossPlatformLinks?.spotify?.url || '';
      return !extractSpotifyTrackId(spotifyUrl);
    })
    .slice(0, 25);

  const CONCURRENCY = 3;
  const workers = Array.from({ length: CONCURRENCY }, (_, workerIdx) => (async () => {
    for (let i = workerIdx; i < searchCandidates.length; i += CONCURRENCY) {
      const track = searchCandidates[i];
      const query = `${track?.title || ''} ${track?.artist || ''}`.trim();
      if (!query) continue;

      try {
        const results = await spotifyService.searchTracks(query, 1);
        const bestId = results?.[0]?.id;
        if (bestId) trackIds.add(bestId);
      } catch (err) {
        // Ignore single-track search failures and keep processing.
        console.warn(`Search failed for ${query}:`, err.message);
      }
    }
  })());
  await Promise.allSettled(workers);

  return Array.from(trackIds).map((id) => `https://open.spotify.com/track/${id}`);
}

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



/**
 * POST /api/playlist/create-ytm
 * Body: { sessionId: string, playlistName: string, tracks: array }
 * Creates a playlist on the user's YouTube Music account.
 */
router.post('/create-ytm', async (req, res) => {
  try {
    const { sessionId, playlistName, tracks } = req.body;
    console.log(`🚀 [YTM] Creation request: "${playlistName}" (${tracks?.length} tracks) for session ${sessionId}`);
    
    if (!sessionId || !playlistName || !tracks || !Array.isArray(tracks)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tokens = getTokensForSession(sessionId);
    if (!tokens) {
      return res.status(401).json({ error: 'Unauthorized: Session invalid or expired. Please sign in again.' });
    }

    // Since this can take a while, we should probably stream the response or do this async
    // However, for simplicity and alignment with the auth flow, we will wait for it.
    // If tracks array is huge (e.g. 100+), the frontend request might timeout, 
    // so consider chunking later. For now, this is fine.
    
    // NOTE: Sending SSE updates during creation would be ideal here if time allows.
    // For now we do a simple blocking request.
    const result = await createYouTubePlaylist(tokens, playlistName, tracks);
    
    res.json({ success: true, ...result });

  } catch (err) {
    console.error('YTM playlist creation error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create YouTube Music playlist' });
  }
});



async function refreshSpotifyAccessToken(refreshToken) {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify OAuth is not configured.');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Spotify refresh failed: ${tokenRes.status} ${errText}`);
  }
  return tokenRes.json();
}

/**
 * POST /api/playlist/create-spotify-user
 * Body: { sessionId: string, playlistName: string, tracks: array }
 * Creates a playlist on the authenticated user's own Spotify account.
 */
router.post('/create-spotify-user', async (req, res) => {
  try {
    const { sessionId, playlistName, tracks } = req.body;
    console.log(`🚀 [Spotify] Creation request: "${playlistName}" (${tracks?.length} tracks) for session ${sessionId}`);
    if (!sessionId || !playlistName || !tracks || !Array.isArray(tracks)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const session = getSpotifyTokensForSession(sessionId);
    if (!session?.access_token) {
      return res.status(401).json({ error: 'Spotify session missing or expired. Please sign in again.' });
    }

    let accessToken = session.access_token;
    if (session.expiresAt && Date.now() >= session.expiresAt && session.refresh_token) {
      const refreshed = await refreshSpotifyAccessToken(session.refresh_token);
      accessToken = refreshed.access_token;
    }

    const spotifyApi = new SpotifyWebApi();
    spotifyApi.setAccessToken(accessToken);

    // Get user profile
    const me = await spotifyApi.getMe();

    // Create playlist
    const created = await spotifyApi.createPlaylist(me.body.id, playlistName, {
      description: `Created by Playlist Translator | ${tracks.length} tracks`,
      public: false,
    });

    const spotifyTrackUrls = await resolveSpotifyTrackUrls(tracks);
    const uris = spotifyTrackUrls
      .map((u) => extractSpotifyTrackId(u))
      .filter(Boolean)
      .map((id) => `spotify:track:${id}`);

    // Add tracks in chunks of 100
    for (let i = 0; i < uris.length; i += 100) {
      const chunk = uris.slice(i, i + 100);
      await spotifyApi.addTracksToPlaylist(created.body.id, chunk);
    }

    return res.json({
      success: true,
      playlistUrl: created.body.external_urls?.spotify || `https://open.spotify.com/playlist/${created.body.id}`,
      total: tracks.length,
      added: uris.length,
    });
  } catch (err) {
    console.error('Spotify user playlist creation error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to create playlist on Spotify account' });
  }
});


/**
 * POST /api/playlist/create-apple
 * Body: { sessionId: string, playlistName: string, tracks: array }
 * Creates a playlist on the authenticated user's Apple Music account.
 */
router.post('/create-apple', async (req, res) => {
  try {
    const { sessionId, playlistName, tracks } = req.body;
    if (!sessionId || !playlistName || !tracks || !Array.isArray(tracks)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const appleTokens = getAppleTokensForSession(sessionId);
    if (!appleTokens?.userToken || !appleTokens?.devToken) {
      return res.status(401).json({ error: 'Apple Music session missing or expired. Please import tokens again.' });
    }

    const appleTrackIds = tracks
      .map(track => {
        const appleUrl = track?.crossPlatformLinks?.appleMusic?.url;
        return extractAppleTrackId(appleUrl);
      })
      .filter(Boolean);

    if (appleTrackIds.length === 0) {
      return res.status(400).json({
        error: 'No Apple Music tracks could be resolved from this playlist.',
      });
    }

    const playlistUrl = await appleApi.createApplePlaylist(
      appleTokens.devToken,
      appleTokens.userToken,
      playlistName,
      appleTrackIds
    );

    res.json({ success: true, playlistUrl, total: tracks.length, added: appleTrackIds.length });
  } catch (err) {
    console.error('Apple Music playlist creation error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to create playlist on Apple Music account' });
  }
});

export default router;
