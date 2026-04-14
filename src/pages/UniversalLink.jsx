import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getUniversalLink } from '../utils/api';
import { Disc, ExternalLink } from 'lucide-react';

const PLATFORMS = [
  { key: 'spotify', name: 'Spotify', className: 'btn-spotify' },
  { key: 'appleMusic', name: 'Apple Music', className: 'btn-apple-music' },
  { key: 'youtubeMusic', name: 'YouTube Music', className: 'btn-youtube-music' },
];

function detectPreferredPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'appleMusic';
  if (/android/.test(ua)) return 'youtubeMusic';
  return 'spotify';
}

export default function UniversalLink() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preferred] = useState(detectPreferredPlatform());

  useEffect(() => {
    getUniversalLink(id)
      .then(setData)
      .catch(err => setError(err.message || 'Link not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="universal-link-page">
        <div className="loading-spinner" />
        <div className="loading-text" style={{ marginTop: '1rem' }}>Loading playlist...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="universal-link-page">
        <div className="glass-card universal-card">
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>😢</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Link Not Found</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      </div>
    );
  }

  // Get the first available track URL for each platform to act as a fallback "Open Playlist Array"
  const topLevelLinks = PLATFORMS.map(platform => {
    if (platform.key === data.sourcePlatform && data.sourceUrl) {
      return { platform, url: data.sourceUrl };
    }
    const trackWithLink = data.tracks?.find(t => t.crossPlatformLinks?.[platform.key]);
    if (trackWithLink) {
      return { platform, url: trackWithLink.crossPlatformLinks[platform.key].url };
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="page-content" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: 'var(--space-16)' }}>
      {/* Header */}
      <div className="dashboard-header animate-in" style={{ flexDirection: 'column', textAlign: 'center', margin: 'var(--space-10) 0' }}>
        {data.artworkUrl ? (
          <img src={data.artworkUrl} alt={data.name} className="universal-artwork" style={{ margin: '0 auto', boxShadow: 'var(--shadow-lg)' }} />
        ) : (
          <div className="universal-artwork-placeholder" style={{ margin: '0 auto' }}>
            <Disc size={64} color="rgba(255,255,255,0.2)" />
          </div>
        )}
        
        <h1 className="universal-title" style={{ marginTop: 'var(--space-4)' }}>{data.name}</h1>
        <div className="universal-meta" style={{ marginBottom: 'var(--space-6)' }}>
          {data.tracks?.length || 0} tracks · Translated Playlist
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          {topLevelLinks.map(({ platform, url }) => {
            const isPreferred = platform.key === preferred;
            return (
              <a
                key={platform.key}
                href={url}
                target="_blank"
                rel="noreferrer"
                className={`platform-btn ${platform.className}`}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: 'var(--font-size-sm)',
                  boxShadow: isPreferred ? '0 0 15px rgba(255,255,255,0.1)' : 'none',
                  border: isPreferred ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--bg-glass-border)'
                }}
              >
                Listen on {platform.name}
              </a>
            );
          })}
        </div>
      </div>

      {/* Embedded Tracklist */}
      <div className="track-section animate-in animate-in-delay-2">
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Playlist Tracks</h3>
        <div className="track-list">
          {data.tracks?.map((track, index) => {
            return (
              <div key={index} className="track-item" style={{ gridTemplateColumns: '32px 1fr auto' }}>
                <div className="track-number">{index + 1}</div>
                <div className="track-info">
                  <div className="track-title">{track.title}</div>
                  <div className="track-artist">{track.artist}</div>
                </div>
                
                {/* Platform Open Buttons per track */}
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {PLATFORMS.map(p => {
                    const url = track.crossPlatformLinks?.[p.key]?.url || (p.key === data.sourcePlatform && track.sourceUrl);
                    if (!url) return null;
                    return (
                      <a 
                        key={p.key} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer" 
                        title={`Open in ${p.name}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--bg-glass-border)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--bg-glass-border)'; }}
                      >
                         <ExternalLink size={14} />
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 'var(--space-10)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
        Created with <a href="/" style={{ color: '#fff', textDecoration: 'underline' }}>Playlist Translator</a>
      </div>
    </div>
  );
}
