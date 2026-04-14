// Frontend API client — all calls to backend
const API_BASE = '/api';

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
