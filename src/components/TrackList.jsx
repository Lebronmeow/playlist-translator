import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ListMusic } from 'lucide-react';

export default function TrackList({ tracks, selectedPlatform, fallbacks }) {
  const [filter, setFilter] = useState('all');

  const getTrackStatus = (track) => {
    if (!selectedPlatform) return 'unknown';
    if (track.crossPlatformLinks && track.crossPlatformLinks[selectedPlatform]) return 'matched';
    const key = `${track.title}__${track.artist}`;
    if (fallbacks && fallbacks[key] && fallbacks[key].found) return 'fallback';
    return 'missing';
  };

  const filteredTracks = tracks.filter(track => {
    if (filter === 'all') return true;
    return getTrackStatus(track) === filter;
  });

  const counts = {
    all: tracks.length,
    matched: tracks.filter(t => getTrackStatus(t) === 'matched').length,
    fallback: tracks.filter(t => getTrackStatus(t) === 'fallback').length,
    missing: tracks.filter(t => getTrackStatus(t) === 'missing').length,
  };

  return (
    <div className="track-section animate-in animate-in-delay-3">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ListMusic size={24} /> Track Analysis</h2>

      <div className="track-filters">
        <button
          className={`track-filter ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({counts.all})
        </button>
        <button
          className={`track-filter ${filter === 'matched' ? 'active' : ''}`}
          onClick={() => setFilter('matched')}
        >
          <CheckCircle2 size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}/> Matched ({counts.matched})
        </button>
        <button
          className={`track-filter ${filter === 'fallback' ? 'active' : ''}`}
          onClick={() => setFilter('fallback')}
        >
          <AlertTriangle size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}/> Suggestions ({counts.fallback})
        </button>
        <button
          className={`track-filter ${filter === 'missing' ? 'active' : ''}`}
          onClick={() => setFilter('missing')}
        >
          <XCircle size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}/> Missing ({counts.missing})
        </button>
      </div>

      <div className="track-list">
        {filteredTracks.map((track, i) => {
          const status = getTrackStatus(track);
          const key = `${track.title}__${track.artist}`;
          const fallbackData = fallbacks && fallbacks[key];

          return (
            <div key={i}>
              <div className="track-item">
                <span className="track-num">{i + 1}</span>
                <div className="track-info">
                  <div className="track-title">{track.title}</div>
                  <div className="track-artist">{track.artist}</div>
                </div>
                <div className="track-status">
                  {status === 'matched' && (
                    <CheckCircle2 size={20} className="status-icon matched" aria-label="Exact match found" />
                  )}
                  {status === 'fallback' && (
                    <AlertTriangle size={20} className="status-icon fallback" aria-label="Smart suggestion available" />
                  )}
                  {status === 'missing' && (
                    <XCircle size={20} className="status-icon missing" aria-label="Not found on this platform" />
                  )}
                </div>
              </div>

              {/* Show fallback suggestion */}
              {status === 'fallback' && fallbackData && fallbackData.found && (
                <div className="fallback-card glass-card">
                  <div className="fallback-header">
                    <AlertTriangle size={16} /> Smart Suggestion
                  </div>
                  <div className="fallback-suggestion">
                    {fallbackData.suggestion.title} — {fallbackData.suggestion.artist}
                  </div>
                  <div className="fallback-reasoning">{fallbackData.reasoning}</div>
                  <div className="fallback-confidence">
                    {fallbackData.confidence}% confidence
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTracks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
          No tracks match this filter
        </div>
      )}
    </div>
  );
}
