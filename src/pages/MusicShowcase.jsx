import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MusicPortfolio from '../components/ui/music-portfolio';

export default function MusicShowcase({ playlist, tracks, onClose }) {
  const navigate = useNavigate();

  // No data fallback (should theoretically not trigger if passed via props, but safe to keep)
  if (!playlist || !tracks?.length) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a0f',
        color: '#e0e0e0',
        fontFamily: "'Space Mono', monospace",
        gap: '1.5rem',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <div style={{ fontSize: '48px' }}>🎵</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>No Playlist Data</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '400px' }}>
          Translate a playlist first, then come back here to see your tracks in showcase mode.
        </p>
        <button
          onClick={() => { if(onClose) onClose(); else navigate('/'); }}
          style={{
            padding: '10px 24px',
            background: 'rgba(255, 223, 0, 0.9)',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '13px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          ← Translate a Playlist
        </button>
      </div>
    );
  }

  // Helper to get highest quality image available
  const getHighResImage = (url) => {
    if (!url) return '';
    // Apple Music: upscale to 1000x1000
    if (url.includes('100x100bb.jpg')) return url.replace('100x100bb.jpg', '1000x1000bb.jpg');
    if (url.includes('60x60bb.jpg')) return url.replace('60x60bb.jpg', '1000x1000bb.jpg');
    
    // YouTube: attempt to use maxresdefault (1080p thumbnail) instead of hqdefault
    if (url.includes('hqdefault.jpg')) return url.replace('hqdefault.jpg', 'maxresdefault.jpg');
    if (url.includes('default.jpg') && !url.includes('maxresdefault.jpg')) {
      return url.replace('default.jpg', 'hqdefault.jpg');
    }
    
    return url;
  };

  const projectsData = tracks.map((track, index) => {
    const rawImage = track.artworkUrl || track.thumbnailUrl || playlist?.artworkUrl || '';
    return {
      id: index + 1,
      artist: (track.artist || 'Unknown Artist').toUpperCase(),
      album: (track.title || 'Unknown Track').toUpperCase(),
      category: track.matchStatus === 'matched' ? 'MATCHED' : track.matchStatus === 'unmatched' ? 'MISSING' : 'PENDING',
      label: playlist?.name?.toUpperCase() || 'PLAYLIST',
      year: '', // We don't have reliable release year data, so leave it blank instead of fake duration
      image: getHighResImage(rawImage),
    };
  });

  const config = {
    timeZone: 'Asia/Kolkata',
    timeUpdateInterval: 1000,
    idleDelay: 4000,
    debounceDelay: 100,
  };

  const socialLinks = {
    spotify: playlist?.sourceUrl?.includes('spotify') ? playlist.sourceUrl : 'https://open.spotify.com',
    email: 'mailto:hello@playlisttranslator.app',
    x: 'https://x.com',
  };

  const location = {
    latitude: `${tracks.length} TRACKS`,
    longitude: (playlist?.platform || 'source').toUpperCase(),
    display: true,
  };

  return (
    <>
      {/* Back button overlay */}
      <button
        onClick={() => { if(onClose) onClose(); else navigate('/dashboard'); }}
        style={{
          position: 'fixed',
          top: '20px',
          left: '60px',
          zIndex: 50,
          padding: '6px 16px',
          background: 'rgba(255, 255, 255, 0.06)',
          color: 'rgba(255, 255, 255, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          fontFamily: "'Space Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255, 223, 0, 0.9)';
          e.target.style.color = '#000';
          e.target.style.borderColor = 'rgba(255, 223, 0, 0.9)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.06)';
          e.target.style.color = 'rgba(255, 255, 255, 0.5)';
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        ← Back to List View
      </button>

      <MusicPortfolio
        PROJECTS_DATA={projectsData}
        CONFIG={config}
        SOCIAL_LINKS={socialLinks}
        LOCATION={location}
        CALLBACKS={{}}
      />
    </>
  );
}
