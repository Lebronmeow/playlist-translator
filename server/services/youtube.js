// YouTube Music service using Official YouTube Data API v3
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Clean YouTube video title to extract the actual song name.
 * Strips common suffixes like (Official Video), [Lyric Video], etc.
 */
export function cleanYouTubeTitle(title) {
  return title
    // Remove parenthetical/bracketed YouTube junk (case-insensitive)
    .replace(/[\(\[]\s*(official\s*(music\s*)?video|official\s*audio|official\s*lyric\s*video|lyric\s*video|lyrics?|visualizer|audio|music\s*video|official\s*visualizer|official\s*hd\s*video|hd|hq|4k|mv|m\/v|live|explicit|clean)\s*[\)\]]/gi, '')
    // Remove trailing "| Artist Name" or "ft. X" noise
    .replace(/\s*\|.*$/, '')
    // Remove "feat." or "ft." duplicates that might be in both title and artist
    .replace(/\s*(feat\.?|ft\.?)\s+.+$/i, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

function getApiKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY not set in environment');
  return key;
}

/**
 * Search for a track on YouTube (music category).
 * Returns the best match with a direct YouTube Music link.
 */
export async function searchTrack(title, artist) {
  try {
    const query = `${title} ${artist}`;
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      videoCategoryId: '10', // Music category
      maxResults: '3',
      key: getApiKey(),
    });

    const res = await fetch(`${YT_API_BASE}/search?${params}`);
    if (!res.ok) {
      console.error('YouTube search API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;

    const best = data.items[0];
    const videoId = best.id.videoId;

    return {
      title: best.snippet.title || title,
      artist: best.snippet.channelTitle || artist,
      album: '',
      videoId,
      url: `https://music.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: best.snippet.thumbnails?.high?.url || best.snippet.thumbnails?.default?.url || '',
      duration: 0,
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
 * Get playlist metadata from YouTube Data API.
 */
export async function getPlaylistDetails(playlistId) {
  try {
    const params = new URLSearchParams({
      part: 'snippet',
      id: playlistId,
      key: getApiKey(),
    });

    const res = await fetch(`${YT_API_BASE}/playlists?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;

    const pl = data.items[0].snippet;
    return {
      name: pl.title || 'Unknown Playlist',
      description: pl.description || '',
      artworkUrl: pl.thumbnails?.high?.url || pl.thumbnails?.default?.url || '',
      platform: 'youtubeMusic',
    };
  } catch (err) {
    console.error('YouTube playlist details error:', err.message);
    return null;
  }
}

/**
 * Fetch all tracks from a YouTube/YTM playlist using the official API.
 * Handles pagination automatically (50 items per page).
 */
export async function getPlaylistTracks(url) {
  try {
    const playlistId = extractPlaylistId(url);
    if (!playlistId) throw new Error('Invalid YouTube Music playlist URL');

    const tracks = [];
    let nextPageToken = null;

    do {
      const params = new URLSearchParams({
        part: 'snippet',
        playlistId,
        maxResults: '50',
        key: getApiKey(),
      });
      if (nextPageToken) params.set('pageToken', nextPageToken);

      const res = await fetch(`${YT_API_BASE}/playlistItems?${params}`);
      if (!res.ok) {
        const errText = await res.text();
        console.error('YouTube playlistItems API error:', res.status, errText);
        throw new Error(`YouTube API error: ${res.status}`);
      }

      const data = await res.json();

      for (const item of data.items || []) {
        const snippet = item.snippet;
        // Skip deleted/private videos
        if (snippet.title === 'Deleted video' || snippet.title === 'Private video') continue;

        // Parse "Artist - Title" format common in music videos
        let title = snippet.title;
        let artist = snippet.videoOwnerChannelTitle?.replace(/ - Topic$/, '') || 'Unknown';

        // Many music videos use "Artist - Song Title" format
        const dashSplit = title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        if (dashSplit) {
          artist = dashSplit[1].trim();
          title = dashSplit[2].trim();
        }

        // Clean YouTube-specific junk from title
        title = cleanYouTubeTitle(title);

        tracks.push({
          title,
          artist,
          album: '',
          duration: 0,
          sourceUrl: `https://music.youtube.com/watch?v=${snippet.resourceId.videoId}`,
          artworkUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
          platform: 'youtubeMusic',
        });
      }

      nextPageToken = data.nextPageToken || null;
    } while (nextPageToken);

    console.log(`  ✅ YouTube API: fetched ${tracks.length} tracks from playlist`);
    return tracks;
  } catch (err) {
    console.error('Error fetching YouTube Music playlist:', err.message);
    throw new Error(`Failed to fetch YouTube Music playlist: ${err.message}`);
  }
}
