import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PlatformCard from '../components/PlatformCard';
import TrackList from '../components/TrackList';
import ShareLink from '../components/ShareLink';
import { getFallbacks, generateUniversalLink, analyzePlaylistStream } from '../utils/api';
import { BarChart3, Disc } from 'lucide-react';

const PLATFORM_NAMES = {
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  youtubeMusic: 'YouTube Music',
  tidal: 'Tidal',
  deezer: 'Deezer',
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
  }, [navigate]);

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

  if (streamError) {
    return (
      <div className="dashboard animate-in">
        <div className="error-message">Oops! {streamError}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>← Try Again</button>
      </div>
    );
  }

  if (!data.playlist && isStreaming) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <div className="loading-text">Connecting to streaming engine...</div>
      </div>
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
      <div className="dashboard-header animate-in">
        {playlist.artworkUrl ? (
          <img src={playlist.artworkUrl} alt={playlist.name} className="playlist-artwork" />
        ) : (
          <div className="playlist-artwork-placeholder"><Disc size={48} color="rgba(255,255,255,0.2)" /></div>
        )}
        <div className="playlist-info">
          <h1>{playlist.name}</h1>
          <div className="track-count">{totalTracks} tracks {isStreaming && `(Translating...)`}</div>
          <div className={`source-badge ${sourcePlatform}`}>
            {PLATFORM_NAMES[sourcePlatform] || sourcePlatform} playlist
          </div>
          
          {isStreaming && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <div className="loading-progress" style={{ width: '100%', maxWidth: '300px', height: '6px', background: 'rgba(255,255,255,0.1)' }}>
                <div className="loading-progress-bar" style={{ width: `${progressPercent}%`, backgroundColor: '#ffffff', animation: 'none' }} />
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                Matching tracks... {matchedCount} / {totalTracks}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coverage Cards */}
      {coverage && !isStreaming && (
        <div className="coverage-section animate-in animate-in-delay-1">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 size={24} /> Platform Coverage</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
            Click a platform to see track-by-track details
          </p>
          <div className="coverage-grid">
            {targetPlatforms.map(([platform, cov]) => (
              <PlatformCard
                key={platform}
                platform={platform}
                coverage={cov}
                selected={selectedPlatform === platform}
                onClick={setSelectedPlatform}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected platform detail */}
      {selectedPlatform && !isStreaming && (
        <div className="animate-in animate-in-delay-2" style={{ marginBottom: 'var(--space-6)' }}>
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
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-accent)' }}>
                Finding smart suggestions...
              </span>
            )}
          </div>
        </div>
      )}

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
          <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              ← Translate Another Playlist
            </button>
          </div>
        </>
      )}
    </div>
  );
}
