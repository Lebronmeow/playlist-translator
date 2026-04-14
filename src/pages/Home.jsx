import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, BarChart3, Zap } from 'lucide-react';
import URLInput from '../components/URLInput';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (url) => {
    // Navigate strictly to Dashboard so it can initiate Real-Time stream
    sessionStorage.setItem('targetPlaylistUrl', url);
    navigate('/dashboard');
  };

  return (
    <div className="hero">
      {/* Floating platform icons */}
      <div className="floating-platforms">
        <div className="platform-float" title="Spotify">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
        <div className="platform-float" title="Apple Music">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#FC3C44">
            <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0019.7.28C19.382.164 19.052.1 18.72.048 18.132-.014 17.543-.004 16.953.002H7.047c-.592-.006-1.18-.016-1.77.046C4.96.1 4.63.164 4.3.28a5.022 5.022 0 00-1.874.81C1.31 1.823.565 2.823.248 4.133a9.23 9.23 0 00-.24 2.19c-.01.592-.006 1.18-.002 1.77v7.914c-.004.592-.008 1.18.002 1.77a9.23 9.23 0 00.24 2.19c.317 1.31 1.062 2.31 2.18 3.043.588.412 1.24.69 1.874.81.318.084.648.148.98.2.588.062 1.178.052 1.768.046h9.906c.592.006 1.18.016 1.77-.046.332-.052.662-.116.98-.2a5.022 5.022 0 001.874-.81c1.118-.732 1.863-1.732 2.18-3.043a9.23 9.23 0 00.24-2.19c.01-.592.006-1.18.002-1.77V7.894c.004-.592.008-1.18-.002-1.77zM16.95 17.08c0 .36-.11.7-.3 1-.3.47-.76.8-1.3.95-.4.12-.83.18-1.26.2-.58.03-1.15.01-1.73-.02-.44-.02-.87-.08-1.29-.18-.71-.18-1.27-.56-1.61-1.22-.18-.33-.26-.7-.28-1.08-.03-.58-.01-1.15.02-1.73.03-.53.03-1.07.07-1.6.05-.71.1-1.42.15-2.13.06-.87.12-1.74.19-2.61.02-.24.04-.48.07-.72.01-.13.06-.24.16-.33.12-.12.3-.15.46-.1.08.03.17.06.24.12.82.64 1.72 1.14 2.68 1.52.5.2 1.01.36 1.53.48.08.02.12.08.12.16v7.28z"/>
          </svg>
        </div>
        <div className="platform-float" title="YouTube Music">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF0000">
            <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
          </svg>
        </div>
      </div>

      {/* Hero badge */}
      <div className="hero-badge">
        Universal Music Translator
      </div>

      {/* Title */}
      <h1 className="hero-title">
        Translate Your Playlists<br />Across Any Platform
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle">
        Convert your playlists between Apple Music, Spotify, and YouTube Music seamlessly. Generate universal links instantly.
      </p>

      {/* URL Input */}
      <URLInput onSubmit={handleSubmit} loading={loading} />

      {error && <div className="error-message">{error}</div>}

      {/* Loading state */}
      {loading && (
        <div className="loading-overlay" style={{ padding: '2rem 0' }}>
          <div className="loading-spinner" />
          <div className="loading-text">Analyzing your playlist...</div>
          <div className="loading-subtext">
            Fetching tracks and matching across platforms. This may take a moment for large playlists.
          </div>
          <div className="loading-progress">
            <div className="loading-progress-bar" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Feature cards */}
      <div className="features-grid">
        <div className="glass-card feature-card">
          <div className="feature-icon"><Link2 size={24} /></div>
          <h3 className="feature-title">Universal Links</h3>
          <p className="feature-desc">
            Generate a single shareable link that auto-routes listeners to the right platform — Spotify, Apple Music, or YouTube Music.
          </p>
        </div>
        <div className="glass-card feature-card">
          <div className="feature-icon"><BarChart3 size={24} /></div>
          <h3 className="feature-title">Platform Auditor</h3>
          <p className="feature-desc">
            See exactly which tracks you'll lose on each platform before switching. Compare coverage scores side-by-side.
          </p>
        </div>
        <div className="glass-card feature-card">
          <div className="feature-icon"><Zap size={24} /></div>
          <h3 className="feature-title">Smart Fallbacks</h3>
          <p className="feature-desc">
            When an exact match fails, our intelligent matching finds the closest studio version, cover, or alternative track.
          </p>
        </div>
      </div>
    </div>
  );
}
