// Smart Fallback System — replaces AI with intelligent algorithmic matching
// Uses: track name cleaning + Odesli re-search + MusicBrainz + Fuse.js ranking
import Fuse from 'fuse.js';
import { cleanTrackName, findAlternativeRecordings } from './musicbrainz.js';
import { getLinksForTrack } from './odesli.js';
import { searchTrack as searchYouTube } from './youtube.js';

/**
 * Attempt to find a fallback match for an unmatched track.
 * Strategy:
 *  1. Clean the track name (remove "Live", "Remix", etc.)
 *  2. Search YouTube Music with cleaned name (to get a new URL)
 *  3. Try Odesli again with the new URL
 *  4. Query MusicBrainz for alternative recordings
 *  5. Use Fuse.js to rank the best match
 */
export async function findFallback(track, targetPlatform) {
  const originalTitle = track.title;
  const artist = track.artist;
  const cleanedTitle = cleanTrackName(originalTitle);
  const titleChanged = cleanedTitle.toLowerCase() !== originalTitle.toLowerCase();

  let suggestion = null;
  let reasoning = '';
  let confidence = 0;

  // Strategy 1: If title has modifiers, search with cleaned title on YouTube Music
  if (titleChanged) {
    try {
      const ytResult = await searchYouTube(cleanedTitle, artist);
      if (ytResult) {
        const links = await getLinksForTrack(ytResult.url);
        if (links && links.links[targetPlatform]) {
          suggestion = {
            title: ytResult.title,
            artist: ytResult.artist,
            album: ytResult.album,
            url: links.links[targetPlatform].url,
            thumbnailUrl: ytResult.thumbnailUrl,
          };
          reasoning = `Found studio version by removing "${getModifier(originalTitle, cleanedTitle)}" modifier`;
          confidence = 85;
        }
      }
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 2: Search YouTube Music with original title (different path)
  if (!suggestion) {
    try {
      const ytResult = await searchYouTube(originalTitle, artist);
      if (ytResult) {
        const links = await getLinksForTrack(ytResult.url);
        if (links && links.links[targetPlatform]) {
          suggestion = {
            title: ytResult.title,
            artist: ytResult.artist,
            album: ytResult.album,
            url: links.links[targetPlatform].url,
            thumbnailUrl: ytResult.thumbnailUrl,
          };
          reasoning = 'Found via YouTube Music search → cross-platform match';
          confidence = 75;
        }
      }
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 3: MusicBrainz alternative recordings
  if (!suggestion) {
    try {
      const alternatives = await findAlternativeRecordings(originalTitle, artist);
      if (alternatives.length > 0) {
        // Use Fuse.js to find the best match
        const fuse = new Fuse(alternatives, {
          keys: [
            { name: 'title', weight: 0.6 },
            { name: 'artist', weight: 0.3 },
            { name: 'album', weight: 0.1 },
          ],
          threshold: 0.4,
          includeScore: true,
        });

        const fuseResults = fuse.search(`${cleanedTitle} ${artist}`);
        if (fuseResults.length > 0) {
          const best = fuseResults[0].item;
          suggestion = {
            title: best.title,
            artist: best.artist,
            album: best.album,
            url: null, // MusicBrainz doesn't give streaming URLs directly
            thumbnailUrl: null,
          };
          reasoning = `Found alternative recording: "${best.title}" ${best.disambiguation ? `(${best.disambiguation})` : ''}`;
          confidence = Math.max(30, 70 - Math.round((fuseResults[0].score || 0.3) * 100));
        }
      }
    } catch (e) {
      // No fallback found
    }
  }

  return suggestion
    ? { found: true, suggestion, reasoning, confidence }
    : { found: false, suggestion: null, reasoning: 'No suitable alternative found on this platform', confidence: 0 };
}

/**
 * Process all unmatched tracks and find fallbacks.
 */
export async function findFallbacksForTracks(tracks, targetPlatform) {
  const unmatchedTracks = tracks.filter(t =>
    !t.crossPlatformLinks || !t.crossPlatformLinks[targetPlatform]
  );

  const fallbacks = {};
  for (const track of unmatchedTracks) {
    const key = `${track.title}__${track.artist}`;
    fallbacks[key] = await findFallback(track, targetPlatform);
  }

  return fallbacks;
}

/**
 * Extract the modifier that was removed during cleaning.
 */
function getModifier(original, cleaned) {
  const diff = original.replace(cleaned, '').trim();
  return diff.replace(/[()[\]]/g, '').trim() || 'suffix';
}
