// Spotify playlist track fetcher using spotify-url-info (no API key needed)
import spotifyUrlInfo from 'spotify-url-info';
import fetch from 'isomorphic-unfetch';

const { getTracks, getDetails } = spotifyUrlInfo(fetch);

import { spotifyService } from './spotifyService.js';

/**
 * Extract tracks from a public Spotify playlist URL.
 */
export async function getPlaylistTracks(url) {
  try {
    const playlistId = url.split('playlist/')[1]?.split('?')[0];
    if (!playlistId) throw new Error('Invalid Spotify playlist URL');

    // 1. Attempt to use Official API (Highest quality, supports pagination > 100)
    try {
      console.log('Attempting Official Spotify API for ID:', playlistId);
      const tracks = await spotifyService.getPlaylistTracks(playlistId);
      if (tracks && tracks.length > 0) {
        console.log(`Official API successful, fetched ${tracks.length} tracks.`);
        return tracks;
      }
    } catch (officialErr) {
      console.warn('Official Spotify API failed, falling back to scrapers:', officialErr.message);
    }
    
    // 2. Fallback to scrapers (capped at 100 tracks)
    const tracks = await getTracks(url);
    return tracks.map(track => ({
      title: track.name || track.title || 'Unknown',
      artist: track.artist || (track.artists && track.artists.map(a => a.name).join(', ')) || 'Unknown',
      album: track.album || '',
      duration: track.duration || 0,
      sourceUrl: track.uri ? `https://open.spotify.com/track/${track.uri.split(':').pop()}` : (track.external_urls?.spotify || ''),
      artworkUrl: track.coverArt?.sources?.[0]?.url || track.thumbnail || '',
      platform: 'spotify',
    }));
  } catch (err) {
    console.error('Error fetching Spotify playlist:', err.message);
    throw new Error(`Failed to fetch Spotify playlist: ${err.message}`);
  }
}

/**
 * Get playlist metadata (name, description, artwork).
 */
export async function getPlaylistDetails(url) {
  try {
    const playlistId = url.split('playlist/')[1]?.split('?')[0];

    // 1. Try Official API first
    if (playlistId) {
      try {
        const details = await spotifyService.getPlaylistDetails(playlistId);
        if (details && details.name) {
          return { ...details, sourceUrl: url };
        }
      } catch (officialErr) {
        console.warn('Official API details fetch failed:', officialErr.message);
      }
    }

    // 2. Fallback to scraper
    let details = {};
    try {
      details = await getDetails(url);
    } catch (e) {
      // Scraper package failed, fallback will engage
    }

    // HTML Fallback for missing title/artwork due to Spotify DOM changes
    let ogTitle = null;
    let ogImage = null;
    if (!details.title && !details.name) {
      try {
        const htmlRes = await fetch(url);
        const html = await htmlRes.text();
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (titleMatch) ogTitle = titleMatch[1];
        if (imageMatch) ogImage = imageMatch[1];
      } catch (htmlErr) {
        // Silently continue
      }
    }

    return {
      name: details.title || details.name || ogTitle || 'Unknown Playlist',
      description: details.description || '',
      artworkUrl: details.coverArt?.sources?.[0]?.url || details.thumbnail || ogImage || '',
      trackCount: details.trackCount || 0,
      platform: 'spotify',
      sourceUrl: url,
    };
  } catch (err) {
    console.error('Error fetching Spotify playlist details:', err.message);
    throw new Error(`Failed to fetch playlist details: ${err.message}`);
  }
}

/**
 * Check if a URL is a Spotify playlist URL
 */
export function isSpotifyPlaylistUrl(url) {
  return /open\.spotify\.com\/playlist\//.test(url);
}
