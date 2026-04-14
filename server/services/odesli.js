// Odesli / Songlink API — free cross-platform music link matching
import { RateLimiter } from '../utils/rateLimiter.js';

const ODESLI_API = 'https://api.song.link/v1-alpha.1/links';
const rateLimiter = new RateLimiter(5); // 5 requests per second

/**
 * Get cross-platform links for a single track URL.
 * Returns platform links and entity metadata.
 */
let consecutive429s = 0;
let circuitBreakerUntil = 0;

export async function getLinksForTrack(trackUrl, retryCount = 0) {
  try {
    if (Date.now() < circuitBreakerUntil) {
      return null; // Circuit breaker is active
    }

    const encodedUrl = encodeURIComponent(trackUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await rateLimiter.execute(() => 
      fetch(`${ODESLI_API}?url=${encodedUrl}`, { signal: controller.signal })
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) return null;
      if (response.status === 429) {
        consecutive429s++;
        if (consecutive429s > 3) {
          console.warn('Odesli API rate limit exceeded multiple times. Activating circuit breaker for 60s.');
          circuitBreakerUntil = Date.now() + 60000;
          return null;
        }
        if (retryCount >= 3) {
          console.error(`Rate limited on ${trackUrl} after 3 retries.`);
          return null; // Return null after max retries
        }
        // Rate limited — wait and retry
        await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
        return getLinksForTrack(trackUrl, retryCount + 1);
      }
      return null;
    }
    
    // Success, reset the counter
    consecutive429s = 0;

    const data = await response.json();

    const links = {};
    const platforms = ['spotify', 'appleMusic', 'youtubeMusic', 'youtube', 'tidal', 'deezer', 'amazonMusic'];

    for (const platform of platforms) {
      if (data.linksByPlatform?.[platform]) {
        links[platform] = {
          url: data.linksByPlatform[platform].url,
          entityUniqueId: data.linksByPlatform[platform].entityUniqueId,
        };
      }
    }

    // Extract primary entity metadata
    const entityId = data.entityUniqueId;
    const entity = data.entitiesByUniqueId?.[entityId] || {};

    return {
      pageUrl: data.pageUrl,
      links,
      metadata: {
        title: entity.title || '',
        artistName: entity.artistName || '',
        thumbnailUrl: entity.thumbnailUrl || '',
      },
    };
  } catch (err) {
    console.error(`Odesli error for ${trackUrl}:`, err.message);
    return null;
  }
}

/**
 * Batch process tracks with concurrency for faster matching.
 * Processes 3 tracks at a time with small delays between batches.
 */
export async function matchPlaylistTracks(tracks) {
  const results = new Array(tracks.length);
  const BATCH_SIZE = 3;

  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    const batch = tracks.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (track, j) => {
      const idx = i + j;
      const trackUrl = track.sourceUrl;

      if (!trackUrl) {
        return { ...track, crossPlatformLinks: null, matchStatus: 'no_source' };
      }

      const linkData = await getLinksForTrack(trackUrl);

      if (linkData) {
        return {
          ...track,
          crossPlatformLinks: linkData.links,
          odesliPageUrl: linkData.pageUrl,
          matchStatus: 'matched',
          thumbnailUrl: linkData.metadata.thumbnailUrl || track.artworkUrl,
        };
      } else {
        return { ...track, crossPlatformLinks: null, matchStatus: 'unmatched' };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach((result, j) => {
      results[i + j] = result;
    });

    console.log(`  Odesli matching: ${Math.min(i + BATCH_SIZE, tracks.length)}/${tracks.length}`);

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < tracks.length) {
      await new Promise(r => setTimeout(r, 350));
    }
  }

  return results;
}

/**
 * Calculate coverage scores per platform.
 */
export function calculateCoverage(matchedTracks) {
  const platforms = ['spotify', 'appleMusic', 'youtubeMusic', 'tidal', 'deezer'];
  const total = matchedTracks.length;
  const coverage = {};

  for (const platform of platforms) {
    const matched = matchedTracks.filter(t =>
      t.crossPlatformLinks && t.crossPlatformLinks[platform]
    ).length;

    const missing = matchedTracks.filter(t =>
      !t.crossPlatformLinks || !t.crossPlatformLinks[platform]
    );

    coverage[platform] = {
      matched,
      total,
      percentage: total > 0 ? Math.round((matched / total) * 100) : 0,
      missingTracks: missing.map(t => ({
        title: t.title,
        artist: t.artist,
        sourceUrl: t.sourceUrl,
      })),
    };
  }

  return coverage;
}
