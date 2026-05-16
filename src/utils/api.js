// Frontend API client — all calls to backend
const API_BASE = '/api';

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function analyzePlaylistStream(url, callbacks) {
  const { onInit, onBatch, onDone, onError } = callbacks;
  const es = new EventSource(`${API_BASE}/playlist/stream?url=${encodeURIComponent(url)}`);

  es.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);
      if (payload.type === 'init') {
        onInit?.(payload.data);
      } else if (payload.type === 'batch') {
        onBatch?.(payload.data);
      } else if (payload.type === 'done') {
        onDone?.(payload.data);
        es.close();
      } else if (payload.type === 'error') {
        onError?.(new Error(payload.data.message));
        es.close();
      }
    } catch (err) {
      onError?.(err);
      es.close();
    }
  };

  es.onerror = () => {
    onError?.(new Error('Connection to stream lost'));
    es.close();
  };

  return () => es.close(); // Return cleanup function
}

export async function analyzePlaylist(url) {
  const response = await fetch(`${API_BASE}/playlist/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  return response.json();
}

export async function getFallbacks(tracks, targetPlatform) {
  const response = await fetch(`${API_BASE}/playlist/fallbacks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tracks, targetPlatform }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  return response.json();
}

export async function generateUniversalLink(data) {
  const response = await fetch(`${API_BASE}/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  return response.json();
}

export async function getUniversalLink(id) {
  const response = await fetch(`${API_BASE}/link/${id}`);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  return response.json();
}

export async function startGoogleOAuth() {
  const response = await fetchWithTimeout(`${API_BASE}/auth/google`, {}, 15000);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error: ${response.status}`);
  }
  return response.json();
}

export async function createYtmPlaylist(sessionId, playlistName, tracks) {
  const response = await fetchWithTimeout(`${API_BASE}/playlist/create-ytm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, playlistName, tracks }),
  }, 120000);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  return response.json();
}

export async function startSpotifyOAuth() {
  const response = await fetchWithTimeout(`${API_BASE}/auth/spotify`, {}, 15000);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error: ${response.status}`);
  }
  return response.json();
}

export async function createSpotifyPlaylistOnAccount(sessionId, playlistName, tracks) {
  const response = await fetchWithTimeout(`${API_BASE}/playlist/create-spotify-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, playlistName, tracks }),
  }, 120000);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  return response.json();
}
