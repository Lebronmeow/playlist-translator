import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MusicArtwork from './MusicArtwork';

/**
 * MusicPlayer — Fetches Deezer 30-sec previews, displays album art with vinyl,
 * and shows synced lyrics from LRCLIB.
 */

/*
 * Hardcoded fallback with locally-served album art.
 * Images are in public/albums/ and served by Vite at /albums/*.
 * Preview URLs left empty for fallback — audio only plays when Deezer API is live.
 */
const FEATURED_FALLBACK = [
  {
    artist: 'The Weeknd',
    title: 'Blinding Lights',
    albumArt: '/albums/blinding-lights.png',
    previewUrl: '',
  },
  {
    artist: 'Dua Lipa',
    title: 'Levitating',
    albumArt: '/albums/levitating.png',
    previewUrl: '',
  },
  {
    artist: 'Billie Eilish',
    title: 'lovely',
    albumArt: '/albums/lovely.png',
    previewUrl: '',
  },
  {
    artist: 'Harry Styles',
    title: 'As It Was',
    albumArt: '/albums/as-it-was.png',
    previewUrl: '',
  },
  {
    artist: 'Daft Punk',
    title: 'Get Lucky',
    albumArt: '/albums/get-lucky.png',
    previewUrl: '',
  },
  {
    artist: 'Arctic Monkeys',
    title: 'Do I Wanna Know?',
    albumArt: '/albums/do-i-wanna-know.png',
    previewUrl: '',
  },
];

function parseSyncedLyrics(lrc) {
  if (!lrc) return [];
  return lrc
    .split('\n')
    .map((line) => {
      const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
      if (!match) return null;
      const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
      return { time, text: match[3].trim() };
    })
    .filter(Boolean)
    .filter((l) => l.text.length > 0);
}

export default function MusicPlayer() {
  const [tracks, setTracks] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyrics, setLyrics] = useState([]);
  const [currentLine, setCurrentLine] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);
  const lyricsIntervalRef = useRef(null);

  // Fetch featured tracks from backend on mount, fall back to hardcoded data
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/lyrics/featured', {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!cancelled && data.tracks?.length) {
          setTracks(data.tracks);
        } else if (!cancelled) {
          // API returned empty — use fallback
          setTracks(FEATURED_FALLBACK);
        }
      } catch {
        // Network error or timeout — use fallback
        if (!cancelled) setTracks(FEATURED_FALLBACK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Timeout fallback: if API doesn't respond in 5s, use cached data
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setTracks((prev) => (prev.length ? prev : FEATURED_FALLBACK));
        setLoading(false);
      }
    }, 5000);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  // Fetch lyrics when active track changes
  useEffect(() => {
    if (activeIdx < 0 || !tracks[activeIdx]) return;
    const { artist, title } = tracks[activeIdx];

    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ artist, track: title });
        const res = await fetch(`/api/lyrics/search?${params}`);
        const data = await res.json();
        if (!cancelled && data.found && data.syncedLyrics) {
          setLyrics(parseSyncedLyrics(data.syncedLyrics));
        } else if (!cancelled && data.found && data.plainLyrics) {
          // Plain lyrics — show a few lines statically
          const lines = data.plainLyrics.split('\n').filter(Boolean).slice(0, 8);
          setLyrics(lines.map((text, i) => ({ time: i * 4, text })));
        } else if (!cancelled) {
          setLyrics([]);
        }
      } catch {
        if (!cancelled) setLyrics([]);
      }
    })();
    return () => { cancelled = true; };
  }, [activeIdx, tracks]);

  // Track playback progress + sync lyrics
  useEffect(() => {
    if (lyricsIntervalRef.current) clearInterval(lyricsIntervalRef.current);

    if (isPlaying && audioRef.current) {
      lyricsIntervalRef.current = setInterval(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const t = audio.currentTime;
        setProgress(audio.duration ? t / audio.duration : 0);

        // Find current lyric line
        if (lyrics.length > 0) {
          let lineIdx = -1;
          for (let i = 0; i < lyrics.length; i++) {
            if (lyrics[i].time <= t) lineIdx = i;
          }
          setCurrentLine(lineIdx);
        }
      }, 100);
    }
    return () => { if (lyricsIntervalRef.current) clearInterval(lyricsIntervalRef.current); };
  }, [isPlaying, lyrics]);

  const handlePlay = useCallback((idx) => {
    if (activeIdx === idx && isPlaying) {
      // Pause
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    setActiveIdx(idx);
    setIsPlaying(false);
    setCurrentLine(-1);
    setProgress(0);
    setLyrics([]);

    const track = tracks[idx];
    if (!track?.previewUrl) return;

    // Small delay to let state settle
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = track.previewUrl;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 50);
  }, [activeIdx, isPlaying, tracks]);

  const handleAudioEnd = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentLine(-1);
  }, []);

  const activeTrack = activeIdx >= 0 ? tracks[activeIdx] : null;

  return (
    <div className="music-player" id="music-player-section">
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={handleAudioEnd} preload="none" />

      {/* Album art grid */}
      <div className="music-player__grid">
        {(tracks.length ? tracks : FEATURED_FALLBACK).slice(0, 6).map((track, idx) => (
          <motion.div
            key={`${track.artist}-${track.title}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <MusicArtwork
              artist={track.artist}
              title={track.title}
              albumArt={track.albumArt}
              previewUrl={track.previewUrl}
              isPlaying={isPlaying && activeIdx === idx}
              onClick={() => track.previewUrl && handlePlay(idx)}
              size={200}
            />
          </motion.div>
        ))}
      </div>

      {/* Now Playing bar + lyrics */}
      <AnimatePresence>
        {activeTrack && (
          <motion.div
            className="music-player__now-playing"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Progress bar */}
            <div className="music-player__progress-track">
              <motion.div
                className="music-player__progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            <div className="music-player__info">
              <div className="music-player__track-meta">
                <span className="music-player__track-title">{activeTrack.title}</span>
                <span className="music-player__track-artist">{activeTrack.artist}</span>
              </div>

              {/* Lyrics display */}
              {lyrics.length > 0 && (
                <div className="music-player__lyrics">
                  {lyrics.slice(Math.max(0, currentLine - 1), currentLine + 3).map((line, i) => {
                    const isActive = i === (currentLine > 0 ? 1 : currentLine === 0 ? 0 : -1);
                    return (
                      <motion.div
                        key={`${line.time}-${line.text}`}
                        className={`music-player__lyric-line ${isActive ? 'active' : ''}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: isActive ? 1 : 0.3, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {line.text}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
