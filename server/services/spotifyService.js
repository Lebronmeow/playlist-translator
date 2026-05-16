import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';
import spotifyUrlInfo from 'spotify-url-info';
import fetch from 'isomorphic-unfetch';

const scraper = spotifyUrlInfo(fetch);

dotenv.config();

class SpotifyService {
  constructor() {
    this.api = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET || process.env.SPOTIFY_CLIENT_SECRET, // node-spotify-api uses clientSecret, spotify-web-api-node uses clientSecret
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET
    });
    this.tokenExpiresAt = 0;
  }

  async ensureAccessToken() {
    if (Date.now() < this.tokenExpiresAt - 60000) {
      return;
    }

    try {
      console.log('Refreshing Spotify Client Credentials token...');
      const data = await this.api.clientCredentialsGrant();
      const token = data.body['access_token'];
      this.api.setAccessToken(token);
      this.tokenExpiresAt = Date.now() + data.body['expires_in'] * 1000;
      console.log(`Spotify token refreshed successfully. Token starts with: ${token.substring(0, 10)}...`);
    } catch (err) {
      console.error('Failed to refresh Spotify token:', err.message);
      throw new Error(`Spotify Auth Failed: ${err.message}`);
    }
  }

  /**
   * Search for tracks
   */
  async searchTracks(query, limit = 10) {
    await this.ensureAccessToken();
    const res = await this.api.searchTracks(query, { limit });
    return (res.body.tracks?.items || []).map(t => this.mapTrack(t));
  }

  /**
   * Get all tracks from a playlist (with pagination)
   */
  async getPlaylistTracks(playlistId) {
    try {
      await this.ensureAccessToken();
      
      let allTracks = [];
      let offset = 0;
      const limit = 100;
      let total = 0;

      do {
        const res = await this.api.getPlaylistTracks(playlistId, {
          offset,
          limit
        });
        
        const items = res.body.items || [];
        total = res.body.total || 0;
        
        allTracks.push(...items.map(item => this.mapTrack(item.track)));
        offset += limit;
        
        console.log(`Official API: Fetched ${allTracks.length}/${total} tracks from Spotify playlist ${playlistId}`);
      } while (allTracks.length < total && offset < total);

      return allTracks;
    } catch (err) {
      console.warn(`Official Spotify API tracks fetch failed (${err.message}). Falling back to scraper...`);
      const url = `https://open.spotify.com/playlist/${playlistId}`;
      const tracks = await scraper.getTracks(url);
      return tracks.map(track => ({
        id: track.id || track.uri?.split(':').pop(),
        title: track.name || track.title || 'Unknown',
        artist: track.artist || (track.artists && track.artists.map(a => a.name).join(', ')) || 'Unknown',
        album: track.album || '',
        duration: track.duration || track.duration_ms || 0,
        artworkUrl: track.coverArt?.sources?.[0]?.url || track.thumbnail || '',
        sourceUrl: `https://open.spotify.com/track/${track.id || track.uri?.split(':').pop()}`,
        platform: 'spotify'
      }));
    }
  }

  /**
   * Get playlist details
   */
  async getPlaylistDetails(playlistId) {
    try {
      await this.ensureAccessToken();
      const res = await this.api.getPlaylist(playlistId, {
        fields: 'name,description,images,tracks(total)'
      });
      
      const p = res.body;
      return {
        name: p.name,
        description: p.description,
        artworkUrl: p.images?.[0]?.url || '',
        trackCount: p.tracks?.total || 0,
        platform: 'spotify'
      };
    } catch (err) {
      console.warn(`Official Spotify API details fetch failed (${err.message}). Falling back to scraper...`);
      const url = `https://open.spotify.com/playlist/${playlistId}`;
      const p = await scraper.getDetails(url);
      return {
        name: p.name || p.title || 'Unknown Playlist',
        description: p.description || '',
        artworkUrl: p.images?.[0]?.url || p.thumbnail || '',
        trackCount: p.trackCount || 0,
        platform: 'spotify'
      };
    }
  }

  mapTrack(t) {
    if (!t) return null;
    return {
      id: t.id,
      title: t.name,
      artist: t.artists?.map(a => a.name).join(', ') || 'Unknown',
      album: t.album?.name || '',
      duration: t.duration_ms || 0,
      artworkUrl: t.album?.images?.[0]?.url || '',
      sourceUrl: `https://open.spotify.com/track/${t.id}`,
      platform: 'spotify'
    };
  }
}

export const spotifyService = new SpotifyService();
