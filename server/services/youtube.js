// YouTube Music service using ytmusic-api (no API key needed)
import YTMusic from 'ytmusic-api';

let ytmusic = null;

async function getClient() {
  if (!ytmusic) {
    ytmusic = new YTMusic();
    await ytmusic.initialize();
  }
  return ytmusic;
}

/**
 * Search for a track on YouTube Music.
 */
export async function searchTrack(title, artist) {
  try {
    const client = await getClient();
    const query = `${title} ${artist}`;
    const results = await client.searchSongs(query);

    if (!results || results.length === 0) return null;

    const best = results[0];
    return {
      title: best.name || best.title || title,
      artist: best.artist?.name || best.artists?.[0]?.name || artist,
      album: best.album?.name || '',
      videoId: best.videoId,
      url: `https://music.youtube.com/watch?v=${best.videoId}`,
      thumbnailUrl: best.thumbnails?.[0]?.url || '',
      duration: best.duration || 0,
    };
  } catch (err) {
    console.error('YouTube Music search error:', err.message);
    return null;
  }
}

/**
 * Check if a URL is a YouTube Music playlist URL.
 */
export function isYouTubeMusicUrl(url) {
  return /music\.youtube\.com\/playlist/.test(url) || /youtube\.com\/playlist/.test(url);
}

/**
 * Extract playlist ID from YouTube Music URL.
 */
export function extractPlaylistId(url) {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch tracks from a YouTube Music playlist.
 */
export async function getPlaylistTracks(url) {
  try {
    const client = await getClient();
    const playlistId = extractPlaylistId(url);
    if (!playlistId) throw new Error('Invalid YouTube Music playlist URL');

    const playlist = await client.getPlaylist(playlistId);

    if (!playlist || !playlist.tracks) {
      throw new Error('Could not fetch playlist tracks');
    }

    return playlist.tracks.map(track => ({
      title: track.name || track.title || 'Unknown',
      artist: track.artist?.name || track.artists?.[0]?.name || 'Unknown',
      album: track.album?.name || '',
      duration: track.duration || 0,
      sourceUrl: `https://music.youtube.com/watch?v=${track.videoId}`,
      artworkUrl: track.thumbnails?.[0]?.url || '',
      platform: 'youtubeMusic',
    }));
  } catch (err) {
    console.error('Error fetching YouTube Music playlist:', err.message);
    throw new Error(`Failed to fetch YouTube Music playlist: ${err.message}`);
  }
}
