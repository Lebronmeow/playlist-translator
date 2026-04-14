import fetch from 'isomorphic-unfetch';

/**
 * Natively search Apple Music using the free iTunes Search API.
 * This does not require any API keys.
 * Uses fuzzy matching to find the best result.
 */
export async function searchAppleMusic(title, artist) {
  try {
    // Strategy 1: Search with "title artist"
    let result = await iTunesSearch(`${title} ${artist}`);
    if (result) return result;

    // Strategy 2: Search with just the title (artist name may differ)
    result = await iTunesSearch(title);
    if (result) return result;

    return null;
  } catch (err) {
    console.error('Apple Music search error:', err.message);
    return null;
  }
}

async function iTunesSearch(query) {
  const encoded = encodeURIComponent(query);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encoded}&entity=song&limit=10`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;

    // Filter out karaoke, instrumental, and cover versions
    const validResults = data.results.filter(r => {
      const name = (r.trackName || '').toLowerCase();
      const artistName = (r.artistName || '').toLowerCase();
      return !name.includes('karaoke') &&
             !name.includes('instrumental') &&
             !name.includes('originally performed') &&
             !artistName.includes('karaoke') &&
             !artistName.includes('covers') &&
             !artistName.includes('tribute');
    });

    const best = validResults[0] || data.results[0];
    return {
      title: best.trackName,
      artist: best.artistName,
      url: best.trackViewUrl,
      thumbnailUrl: best.artworkUrl100 || best.artworkUrl60 || '',
      platform: 'appleMusic'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') return null;
    throw err;
  }
}
