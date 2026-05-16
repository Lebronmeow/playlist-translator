import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PlatformCard from '../components/PlatformCard';
import TrackList from '../components/TrackList';
import ShareLink from '../components/ShareLink';
import MusicShowcase from './MusicShowcase';
import {
  getFallbacks,
  generateUniversalLink,
  analyzePlaylistStream,
  startGoogleOAuth,
  createYtmPlaylist,
  startSpotifyOAuth,
  createSpotifyPlaylistOnAccount
} from '../utils/api';
import { BarChart3, Disc, Copy, Check, Eye } from 'lucide-react';

const PLATFORM_NAMES = {
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  youtubeMusic: 'YouTube Music',
  tidal: 'Tidal',
  deezer: 'Deezer',
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [targetUrl, setTargetUrl] = useState(null);
  
  const [data, setData] = useState({
    playlist: null,
    tracks: [],
    coverage: null,
    totalTracks: 0,
  });
  
  const [isStreaming, setIsStreaming] = useState(true);
  const [streamError, setStreamError] = useState(null);
  
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [fallbacks, setFallbacks] = useState({});
  const [loadingFallbacks, setLoadingFallbacks] = useState(false);
  const [universalLinkUrl, setUniversalLinkUrl] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  
  const [isShowcase, setIsShowcase] = useState(false);

  // YouTube OAuth and Sync states
  const location = useLocation();
  const [googleSession, setGoogleSession] = useState(
    () => sessionStorage.getItem('googleSession')
  );
  const [spotifySession, setSpotifySession] = useState(
    () => sessionStorage.getItem('spotifySession')
  );
  const [syncStatus, setSyncStatus] = useState({ status: 'idle', url: null, error: null });
  const [spotifySyncStatus, setSpotifySyncStatus] = useState({ status: 'idle', url: null, error: null });

  useEffect(() => {
    // We expect the URL to be stored here by Home.jsx
    const storedUrl = sessionStorage.getItem('targetPlaylistUrl');
    
    if (storedUrl) {
      setTargetUrl(storedUrl);
    } else {
      // If none, maybe user refreshed and we still have old data
      const storedAnalysis = sessionStorage.getItem('playlistAnalysis');
      if (storedAnalysis) {
        try {
          const parsed = JSON.parse(storedAnalysis);
          setData({
            playlist: parsed.playlist,
            tracks: parsed.tracks || [],
            coverage: parsed.coverage || null,
            totalTracks: parsed.totalTracks || 0
          });
          setIsStreaming(false);
          const sourcePlatform = parsed.playlist?.platform;
          const targetPlatform = Object.keys(parsed.coverage || {}).find(p => p !== sourcePlatform);
          if (targetPlatform) setSelectedPlatform(targetPlatform);
        } catch(e) {}
      } else {
        navigate('/');
      }
    }

    // Check for auth session in URL params after OAuth redirect
    const params = new URLSearchParams(location.search);
    const session = params.get('session');
    const spotifySessionParam = params.get('spotify_session');
    if (session) {
      setGoogleSession(session);
      sessionStorage.setItem('googleSession', session);
      // Clean up URL to hide token
      window.history.replaceState({}, document.title, '/dashboard');
    }
    if (spotifySessionParam) {
      setSpotifySession(spotifySessionParam);
      sessionStorage.setItem('spotifySession', spotifySessionParam);
      window.history.replaceState({}, document.title, '/dashboard');
    }
  }, [navigate, location.search]);

  useEffect(() => {
    if (!targetUrl) return;
    
    setIsStreaming(true);
    setStreamError(null);
    setData({ playlist: null, tracks: [], coverage: null, totalTracks: 0 });

    const cleanup = analyzePlaylistStream(targetUrl, {
      onInit: (initData) => {
        setData(prev => ({
          ...prev,
          playlist: initData.playlist,
          totalTracks: initData.totalTracks,
          tracks: initData.initialTracks || []
        }));
      },
      onBatch: (batchData) => {
        if (!batchData.tracks) return;
        setData(prev => {
          // Replace unmatched track stubs strictly with matched tracks from batch
          const newTracks = [...prev.tracks];
          for (const newTrack of batchData.tracks) {
            const idx = newTracks.findIndex(t => t.title === newTrack.title && t.artist === newTrack.artist && !t._processed);
            if (idx !== -1) {
              newTracks[idx] = { ...newTrack, _processed: true };
            } else {
              newTracks.push({ ...newTrack, _processed: true });
            }
          }
          return { ...prev, tracks: newTracks };
        });
      },
      onDone: (doneData) => {
        setIsStreaming(false);
        setData(prev => {
          const finalData = { ...prev, coverage: doneData.coverage };
          sessionStorage.setItem('playlistAnalysis', JSON.stringify(finalData));
          
          // Auto-select platform after completion
          if (finalData.playlist && doneData.coverage) {
             const sourcePlatform = finalData.playlist.platform;
             const bestTarget = Object.entries(doneData.coverage)
               .filter(([p]) => p !== sourcePlatform)
               .sort((a,b) => b[1].percentage - a[1].percentage)[0];
             if (bestTarget) setSelectedPlatform(bestTarget[0]);
          }
          return finalData;
        });
        sessionStorage.removeItem('targetPlaylistUrl');
      },
      onError: (err) => {
        setStreamError(err.message);
        setIsStreaming(false);
      }
    });

    return cleanup;
  }, [targetUrl]);

  // Fetch fallbacks automatically when platform changes AND data matching is done
  useEffect(() => {
    if (isStreaming || !data.playlist || !selectedPlatform) return;

    const unmatchedCount = data.tracks.filter(t =>
      !t.crossPlatformLinks || !t.crossPlatformLinks[selectedPlatform]
    ).length;

    if (unmatchedCount > 0 && !fallbacks[selectedPlatform]) {
      setLoadingFallbacks(true);
      getFallbacks(data.tracks, selectedPlatform)
        .then(result => {
          setFallbacks(prev => ({
            ...prev,
            [selectedPlatform]: result.fallbacks,
          }));
        })
        .catch(err => console.error('Fallback error:', err))
        .finally(() => setLoadingFallbacks(false));
    }
  }, [data, selectedPlatform, fallbacks, isStreaming]);

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const result = await generateUniversalLink({
        name: data.playlist.name,
        artworkUrl: data.playlist.artworkUrl,
        tracks: data.tracks,
        coverage: data.coverage,
        sourceUrl: data.playlist.sourceUrl,
        sourcePlatform: data.playlist.platform,
      });
      setUniversalLinkUrl(result.url);
    } catch (err) {
      console.error('Link generation error:', err);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const oauthData = await startGoogleOAuth();
      if (oauthData.authUrl) {
        window.location.href = oauthData.authUrl;
      }
    } catch (err) {
      console.error('Failed to start Google OAuth:', err);
      alert(`Failed to connect to Google: ${err.message}`);
    }
  };

  const handleCreateYtmPlaylist = async () => {
    if (!googleSession || !data?.playlist || !data?.tracks?.length) return;
    
    setSyncStatus({ status: 'loading', url: null, error: null });
    
    try {
      // Clean undefined artists and empty titles before sending
      const validTracks = data.tracks.map(t => ({
        title: t.title || 'Unknown Title',
        artist: t.artist || 'Unknown Artist',
        crossPlatformLinks: t.crossPlatformLinks
      }));

      const resData = await createYtmPlaylist(
        googleSession,
        `${data.playlist.name} (Translated)`,
        validTracks
      );
      
      setSyncStatus({ 
        status: 'success', 
        url: resData.playlistUrl, 
        error: null,
        stats: `${resData.added}/${resData.total} added`
      });
    } catch (err) {
      console.error('Sync error:', err);
      const timeoutMsg = err.name === 'AbortError'
        ? 'Timed out while creating YouTube playlist. Please try again.'
        : err.message;
      setSyncStatus({ status: 'error', url: null, error: timeoutMsg });
      if (err.message.includes('Unauthorized') || err.message.includes('expired')) {
        setGoogleSession(null);
        sessionStorage.removeItem('googleSession');
      }
    }
  };


  const handleSpotifySignIn = async () => {
    try {
      const oauthData = await startSpotifyOAuth();
      if (oauthData.authUrl) {
        window.location.href = oauthData.authUrl;
      }
    } catch (err) {
      console.error('Failed to start Spotify OAuth:', err);
      setSpotifySyncStatus({ status: 'error', url: null, error: err.message });
    }
  };

  const handleCreateSpotifyOnAccount = async () => {
    if (!spotifySession || !data?.playlist || !data?.tracks?.length) return;

    setSpotifySyncStatus({ status: 'loading', url: null, error: null });
    try {
      const resData = await createSpotifyPlaylistOnAccount(
        spotifySession,
        `${data.playlist.name} (Translated)`,
        data.tracks
      );

      setSpotifySyncStatus({
        status: 'success',
        url: resData.playlistUrl,
        error: null,
        stats: `${resData.added}/${resData.total} added`,
      });
    } catch (err) {
      console.error('Spotify account export failed:', err);
      setSpotifySyncStatus({ status: 'error', url: null, error: err.message });
      if (err.message.includes('expired') || err.message.includes('sign in again') || err.message.includes('401')) {
        setSpotifySession(null);
        sessionStorage.removeItem('spotifySession');
      }
    }
  };

  // No more manual URI copy logic


  if (streamError) {
    return (
      <motion.div
        className="dashboard"
        style={{ padding: 'var(--space-16) var(--space-8)', textAlign: 'center' }}
        {...fadeUp}
      >
        <motion.div
          className="error-message"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          Oops! {streamError}
        </motion.div>
        <motion.button
          className="btn btn-secondary"
          onClick={() => navigate('/')}
          style={{ marginTop: 'var(--space-4)' }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          ← Try Again
        </motion.button>
      </motion.div>
    );
  }

  if (!data.playlist && isStreaming) {
    return (
      <motion.div
        className="loading-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{ animation: 'none' }}
        />
        <motion.div
          className="loading-text"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Connecting to streaming engine...
        </motion.div>
      </motion.div>
    );
  }

  if (!data.playlist) return null;

  const { playlist, tracks, coverage, totalTracks } = data;
  const sourcePlatform = playlist.platform;
  
  // Real-time matched tracks count for the progress bar
  const matchedCount = tracks.filter(t => t.matchStatus && t.matchStatus !== 'pending' && t.matchStatus !== 'no_source').length;
  const progressPercent = totalTracks > 0 ? (matchedCount / totalTracks) * 100 : 0;

  // Filter coverage to exclude source platform if available
  const targetPlatforms = coverage 
    ? Object.entries(coverage).filter(([p]) => p !== sourcePlatform).sort((a, b) => b[1].percentage - a[1].percentage)
    : [];

  return (
    <div className="page-content dashboard">
      {/* Playlist Header */}
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {playlist.artworkUrl ? (
          <motion.img
            src={playlist.artworkUrl}
            alt={playlist.name}
            className="playlist-artwork"
            initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />
        ) : (
          <motion.div
            className="playlist-artwork-placeholder"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <Disc size={48} color="rgba(255,255,255,0.2)" />
          </motion.div>
        )}
        <motion.div
          className="playlist-info"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h1>{playlist.name}</h1>
          <div className="track-count">{totalTracks} tracks {isStreaming && `(Translating...)`}</div>
          <motion.div
            className={`source-badge ${sourcePlatform}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
          >
            {PLATFORM_NAMES[sourcePlatform] || sourcePlatform} playlist
          </motion.div>
          
          {isStreaming && (
            <motion.div
              style={{ marginTop: 'var(--space-3)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="loading-progress" style={{ width: '100%', maxWidth: '300px', height: '6px', background: 'rgba(139, 92, 246, 0.08)' }}>
                <motion.div
                  className="loading-progress-bar"
                  style={{ backgroundColor: 'var(--accent-primary)', animation: 'none' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                Matching tracks... {matchedCount} / {totalTracks}
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Coverage Cards */}
      <AnimatePresence>
        {coverage && !isStreaming && (
          <motion.div
            className="coverage-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 size={24} /> Platform Coverage</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
              Click a platform to see track-by-track details
            </p>
            <div className="coverage-grid">
              {targetPlatforms.map(([platform, cov], idx) => (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  coverage={cov}
                  selected={selectedPlatform === platform}
                  onClick={setSelectedPlatform}
                  index={idx}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected platform detail */}
      <AnimatePresence>
        {selectedPlatform && !isStreaming && (
          <motion.div
            style={{ marginBottom: 'var(--space-6)' }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <div className="glass-card" style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <div>
                <span style={{ fontWeight: 600 }}>
                  Viewing: {PLATFORM_NAMES[selectedPlatform]}
                </span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
                  {coverage[selectedPlatform]?.percentage}% matched
                  {coverage[selectedPlatform]?.missingTracks?.length > 0 && (
                    <> · {coverage[selectedPlatform].missingTracks.length} tracks need attention</>
                  )}
                </span>
              </div>
              {loadingFallbacks && (
                <motion.span
                  style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-accent)' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Finding smart suggestions...
                </motion.span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Track List - Real Time Updates if streaming */}
      <TrackList
        tracks={tracks}
        selectedPlatform={selectedPlatform || 'spotify'}
        fallbacks={fallbacks[selectedPlatform] || {}}
      />

      {/* Universal Link Generator - Only when done */}
      {!isStreaming && (
        <>
          <ShareLink
            linkUrl={universalLinkUrl}
            onGenerate={handleGenerateLink}
            generating={generatingLink}
          />
          
          {/* YouTube Sync Export Section */}
          <motion.div
            className="glass-card"
            style={{ marginTop: 'var(--space-6)', padding: 'var(--space-6)', textAlign: 'center' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Save to YouTube Music</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
              Transfer these generated tracks directly to a new private playlist on your own account.
            </p>
            
            {!googleSession ? (
              <motion.button
                className="btn btn-primary"
                onClick={handleGoogleSignIn}
                style={{ background: '#DB4437' }}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                Sign in with Google
              </motion.button>
            ) : (
              <div>
                <AnimatePresence mode="wait">
                  {syncStatus.status === 'idle' && (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <motion.button
                        className="btn btn-primary"
                        onClick={handleCreateYtmPlaylist}
                        style={{ background: '#FF0000' }}
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Create Playlist Now
                      </motion.button>
                    </motion.div>
                  )}
                  {syncStatus.status === 'loading' && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ color: 'var(--text-accent)' }}
                    >
                      <div className="loading-spinner" style={{ width: '24px', height: '24px', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}></div>
                      Creating playlist on your account... This might take a bit.
                    </motion.div>
                  )}
                  {syncStatus.status === 'error' && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ color: '#ff4c4c' }}
                    >
                      Error: {syncStatus.error}
                      <div style={{ marginTop: 'var(--space-3)' }}>
                        <motion.button className="btn btn-secondary" onClick={handleGoogleSignIn} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>Retry Sign In</motion.button>
                      </div>
                    </motion.div>
                  )}
                  {syncStatus.status === 'success' && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ color: '#4ade80', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                    >
                      <span>✅ Successfully exported ({syncStatus.stats})</span>
                      <motion.a
                        href={syncStatus.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                        style={{ marginTop: '8px' }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Open YouTube Playlist
                      </motion.a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

           {/* Spotify Export Section */}
           <motion.div
             className="glass-card"
             style={{ marginTop: 'var(--space-6)', padding: 'var(--space-6)', textAlign: 'center' }}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.4 }}
           >
             <h3 style={{ marginBottom: 'var(--space-2)' }}>Save to Spotify</h3>
             <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
               Export these tracks directly to a new private playlist on your own Spotify account.
             </p>
             
            {!spotifySession ? (
              <motion.button
                className="btn btn-primary"
                onClick={handleSpotifySignIn}
                style={{ background: '#1DB954' }}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                Sign in with Spotify
              </motion.button>
            ) : (
              <div>
                <AnimatePresence mode="wait">
                  {spotifySyncStatus.status === 'idle' && (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <motion.button
                        className="btn btn-primary"
                        onClick={handleCreateSpotifyOnAccount}
                        style={{ background: '#1DB954' }}
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Create Playlist Now
                      </motion.button>
                    </motion.div>
                  )}
                  {spotifySyncStatus.status === 'loading' && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ color: 'var(--text-accent)' }}
                    >
                      <div className="loading-spinner" style={{ width: '24px', height: '24px', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}></div>
                      Creating playlist on your account...
                    </motion.div>
                  )}
                  {spotifySyncStatus.status === 'error' && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ color: '#ff4c4c' }}
                    >
                      Error: {spotifySyncStatus.error}
                      <div style={{ marginTop: 'var(--space-3)' }}>
                        <motion.button className="btn btn-secondary" onClick={handleSpotifySignIn} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>Retry Sign In</motion.button>
                      </div>
                    </motion.div>
                  )}
                  {spotifySyncStatus.status === 'success' && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ color: '#4ade80', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                    >
                      <span>✅ Successfully exported ({spotifySyncStatus.stats})</span>
                      <motion.a
                        href={spotifySyncStatus.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                        style={{ marginTop: '8px', background: '#1DB954' }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Open Spotify Playlist
                      </motion.a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </motion.div>

          <motion.div
            style={{ textAlign: 'center', marginTop: 'var(--space-8)', display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              className="btn btn-primary"
              onClick={() => setIsShowcase(true)}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Eye size={18} /> View Showcase
            </motion.button>
            <motion.button
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              ← Translate Another Playlist
            </motion.button>
          </motion.div>
        </>
      )}

      {/* Render Showcase Overlay */}
      {isShowcase && data.playlist && data.tracks?.length > 0 && (
        <MusicShowcase 
          playlist={data.playlist} 
          tracks={data.tracks} 
          onClose={() => setIsShowcase(false)} 
        />
      )}
    </div>
  );
}
