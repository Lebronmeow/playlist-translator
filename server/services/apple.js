import fetch from 'isomorphic-unfetch';

/**
 * Natively search Apple Music using the free iTunes Search API.
 * This does not require any API keys.
 */
export async function searchAppleMusic(title, artist) {
  try {
    const query = encodeURIComponent(`${title} ${artist}`);
    const response = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const best = data.results[0];
      return {
        title: best.trackName,
        artist: best.artistName,
        url: best.trackViewUrl,
        thumbnailUrl: best.artworkUrl100 || best.artworkUrl60 || '',
        platform: 'appleMusic'
      };
    }
    return null;
  } catch (err) {
    console.error('Apple Music search error:', err.message);
    return null;
  }
}
