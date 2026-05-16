// YouTube Music playlist creation service using official YouTube Data API v3
import { google } from 'googleapis';

/**
 * Create a playlist on the user's YouTube Music account and add tracks to it.
 * 
 * @param {object} tokens - OAuth2 tokens { access_token, refresh_token }
 * @param {string} playlistName - Name for the new playlist
 * @param {Array} tracks - Array of { title, artist, videoId? } objects
 * @param {function} onProgress - Callback for progress updates (index, total, track)
 * @returns {{ playlistId, playlistUrl, added, missed }}
 */
export async function createYouTubePlaylist(tokens, playlistName, tracks, onProgress) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
  );
  oauth2Client.setCredentials(tokens);

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  // 1. Create the playlist
  console.log(`  🎵 Creating YouTube playlist: "${playlistName}"`);
  const playlistRes = await youtube.playlists.insert({
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title: playlistName,
        description: `Converted by Playlist Translator | ${tracks.length} tracks`,
      },
      status: {
        privacyStatus: 'public',
      },
    },
  });

  const playlistId = playlistRes.data.id;
  const playlistUrl = `https://music.youtube.com/playlist?list=${playlistId}`;
  console.log(`  ✅ Playlist created: ${playlistUrl}`);

  // 2. Search and add each track
  const added = [];
  const missed = [];

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    
    try {
      let videoId = null;

      // If the track already has a videoId from the matching step, use it
      if (track.crossPlatformLinks?.youtubeMusic?.url) {
        const match = track.crossPlatformLinks.youtubeMusic.url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        if (match) videoId = match[1];
      }

      // Otherwise, search for the track
      if (!videoId) {
        const searchRes = await youtube.search.list({
          part: 'snippet',
          q: `${track.title} ${track.artist}`,
          type: 'video',
          videoCategoryId: '10', // Music
          maxResults: 1,
        });

        if (searchRes.data.items?.[0]) {
          videoId = searchRes.data.items[0].id.videoId;
        }
      }

      if (videoId) {
        // Add video to playlist
        await youtube.playlistItems.insert({
          part: 'snippet',
          requestBody: {
            snippet: {
              playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId,
              },
            },
          },
        });

        added.push({ title: track.title, artist: track.artist, videoId });
        if (onProgress) onProgress(i + 1, tracks.length, track, 'added');
      } else {
        missed.push({ title: track.title, artist: track.artist });
        if (onProgress) onProgress(i + 1, tracks.length, track, 'missed');
      }
    } catch (err) {
      console.error(`  ❌ Failed to add "${track.title}": ${err.message}`);
      missed.push({ title: track.title, artist: track.artist, error: err.message });
      if (onProgress) onProgress(i + 1, tracks.length, track, 'error');
    }

    // Small delay to avoid quota exhaustion
    if (i < tracks.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`  📊 Added ${added.length}/${tracks.length} tracks (${missed.length} missed)`);

  return {
    playlistId,
    playlistUrl,
    added: added.length,
    missed,
    total: tracks.length,
  };
}
