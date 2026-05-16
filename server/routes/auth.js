// Google OAuth routes for YouTube Music playlist creation
import { Router } from 'express';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

// In-memory token store (per session) — in production, use a proper session store
const tokenStore = new Map();
const spotifyTokenStore = new Map();
const appleTokenStore = new Map();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFrontendUrl(req) {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  if (req.headers.origin) return req.headers.origin;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

function getSpotifyRedirectUri() {
  return process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/api/auth/spotify/callback';
}

function getOAuth2Client() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
  }

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
  );
}

/**
 * GET /api/auth/google
 * Redirects the user to Google OAuth consent screen.
 * Query: ?state=<session_id> (optional, for tracking)
 */
router.get('/google', (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();
    const state = req.query.state || Date.now().toString(36);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/youtube'],
      state,
      prompt: 'consent',
    });

    res.json({ authUrl, sessionId: state });
  } catch (err) {
    console.error('OAuth init error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to initialize Google OAuth' });
  }
});

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback from Google.
 * Exchanges the authorization code for tokens and stores them.
 */
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens keyed by session state
    const sessionId = state || 'default';
    tokenStore.set(sessionId, {
      tokens,
      createdAt: Date.now(),
    });

    console.log(`✅ Google OAuth tokens stored for session: ${sessionId}`);

    // Redirect back to the frontend with success
    const frontendUrl = getFrontendUrl(req);
    res.redirect(`${frontendUrl}/dashboard?auth=success&session=${sessionId}`);
  } catch (err) {
    console.error('OAuth token exchange error:', err.message);
    const frontendUrl = getFrontendUrl(req);
    res.redirect(`${frontendUrl}/dashboard?auth=error&message=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /api/auth/status
 * Check if a session has valid tokens.
 */
router.get('/status', (req, res) => {
  const { session } = req.query;
  if (!session || !tokenStore.has(session)) {
    return res.json({ authenticated: false });
  }
  
  const entry = tokenStore.get(session);
  // Tokens expire after 1 hour, but refresh tokens last longer
  const isValid = Date.now() - entry.createdAt < 3600000;
  res.json({ authenticated: isValid });
});

/**
 * Get stored tokens for a session (internal use only).
 */
export function getTokensForSession(sessionId) {
  const entry = tokenStore.get(sessionId);
  return entry?.tokens || null;
}

/**
 * GET /api/auth/spotify
 * Start Spotify OAuth for official playlist creation on user account.
 */
router.get('/spotify', (req, res) => {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return res.status(500).json({
      error: 'Spotify OAuth is not configured. Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET.',
    });
  }

  const state = req.query.state || Date.now().toString(36);
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: getSpotifyRedirectUri(),
    scope: 'playlist-modify-public playlist-modify-private',
    state,
    show_dialog: 'true',
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  res.json({ authUrl, sessionId: state });
});

/**
 * GET /api/auth/spotify/callback
 * Exchange code for Spotify access token and store by session.
 */
router.get('/spotify/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Authorization code missing');

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: getSpotifyRedirectUri(),
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
      throw new Error(`Spotify token exchange failed: ${tokenRes.status} ${errText}`);
    }

    const tokens = await tokenRes.json();
    const sessionId = state || 'default';
    spotifyTokenStore.set(sessionId, {
      ...tokens,
      createdAt: Date.now(),
      expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
    });

    const frontendUrl = getFrontendUrl(req);
    res.redirect(`${frontendUrl}/dashboard?spotify_auth=success&spotify_session=${sessionId}`);
  } catch (err) {
    console.error('Spotify OAuth token exchange error:', err.message);
    const frontendUrl = getFrontendUrl(req);
    res.redirect(`${frontendUrl}/dashboard?spotify_auth=error&message=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /api/auth/spotify/status
 */
router.get('/spotify/status', (req, res) => {
  const { session } = req.query;
  if (!session || !spotifyTokenStore.has(session)) {
    return res.json({ authenticated: false });
  }

  const tokens = spotifyTokenStore.get(session);
  const isValid = !!tokens.access_token && Date.now() < (tokens.expiresAt || 0);
  res.json({ authenticated: isValid });
});

export function getSpotifyTokensForSession(sessionId) {
  return spotifyTokenStore.get(sessionId) || null;
}

export function getAppleTokensForSession(sessionId) {
  return appleTokenStore.get(sessionId) || null;
}



/**
 * POST /api/auth/apple/import-token
 * Body: { sessionId: string, userToken: string, devToken?: string }
 * Stores Apple Music tokens for playlist creation.
 */
router.post('/apple/import-token', async (req, res) => {
  try {
    const { sessionId, userToken, devToken } = req.body;

    if (!sessionId || !userToken) {
      return res.status(400).json({ error: 'sessionId and userToken are required' });
    }

    const finalDevToken = devToken || process.env.APPLE_DEV_TOKEN;
    if (!finalDevToken) {
      return res.status(400).json({ error: 'Apple Developer Token is required. Set APPLE_DEV_TOKEN env var or provide in request.' });
    }

    appleTokenStore.set(sessionId, {
      devToken: finalDevToken,
      userToken,
      createdAt: Date.now(),
    });

    return res.json({ success: true, message: 'Apple Music tokens saved.' });
  } catch (err) {
    console.error('Apple token import error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to save Apple tokens' });
  }
});

/**
 * GET /api/auth/apple/status
 */
router.get('/apple/status', (req, res) => {
  const { session } = req.query;
  if (!session || !appleTokenStore.has(session)) {
    return res.json({ authenticated: false });
  }

  const tokens = appleTokenStore.get(session);
  const isValid = !!tokens.userToken && !!tokens.devToken;
  res.json({ authenticated: isValid });
});


export default router;
