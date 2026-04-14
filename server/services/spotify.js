// Spotify playlist track fetcher using spotify-url-info (no API key needed)
import spotifyUrlInfo from 'spotify-url-info';
import fetch from 'isomorphic-unfetch';

const { getTracks, getDetails } = spotifyUrlInfo(fetch);

/**
 * Extract tracks from a public Spotify playlist URL.
 * Returns up to 100 tracks (library limit).
 */
export async function getPlaylistTracks(url) {
  try {
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
