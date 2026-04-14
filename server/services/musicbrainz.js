// MusicBrainz API — free, open-source music metadata database
// No API key needed. Rate limit: 1 request per second.
import { RateLimiter } from '../utils/rateLimiter.js';

const MB_API = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'PlaylistTranslator/1.0.0 (https://github.com/playlist-translator)';
const rateLimiter = new RateLimiter(1); // 1 request per second

/**
 * Search for recordings of a song on MusicBrainz.
 * Returns alternative versions (live, studio, remix, etc.)
 */
export async function findAlternativeRecordings(title, artist) {
  try {
    const cleanTitle = cleanTrackName(title);
    const query = encodeURIComponent(`recording:"${cleanTitle}" AND artist:"${artist}"`);
    const url = `${MB_API}/recording?query=${query}&fmt=json&limit=10`;

    const response = await rateLimiter.execute(() =>
      fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      })
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (!data.recordings || data.recordings.length === 0) return [];

    return data.recordings.map(rec => ({
      title: rec.title,
      artist: rec['artist-credit']?.[0]?.name || artist,
      album: rec.releases?.[0]?.title || '',
      releaseDate: rec['first-release-date'] || '',
      score: rec.score || 0,
      disambiguation: rec.disambiguation || '',
      isrc: rec.isrcs?.[0] || '',
      id: rec.id,
    }));
  } catch (err) {
    console.error('MusicBrainz error:', err.message);
    return [];
  }
}

/**
 * Strip common modifiers from track names for better matching.
 */
export function cleanTrackName(title) {
  return title
    .replace(/\s*\(feat\..*?\)/gi, '')
    .replace(/\s*\(ft\..*?\)/gi, '')
    .replace(/\s*\(with\s.*?\)/gi, '')
    .replace(/\s*\(live.*?\)/gi, '')
    .replace(/\s*\(acoustic.*?\)/gi, '')
    .replace(/\s*\(remix.*?\)/gi, '')
    .replace(/\s*\(.*?remix\)/gi, '')
    .replace(/\s*\(.*?version\)/gi, '')
    .replace(/\s*\(.*?edit\)/gi, '')
    .replace(/\s*\(deluxe.*?\)/gi, '')
    .replace(/\s*\(remaster.*?\)/gi, '')
    .replace(/\s*\[.*?\]/g, '')
    .replace(/\s*-\s*(live|acoustic|remix|remaster).*/gi, '')
    .trim();
}
