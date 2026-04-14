import React from 'react';

const PLATFORM_NAMES = {
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  youtubeMusic: 'YouTube Music',
  tidal: 'Tidal',
  deezer: 'Deezer',
};

export default function PlatformCard({ platform, coverage, selected, onClick }) {
  const { matched, total, percentage } = coverage;
  const missing = total - matched;
  const name = PLATFORM_NAMES[platform] || platform;

  return (
    <div
      className={`glass-card coverage-card ${selected ? 'selected' : ''}`}
      onClick={() => onClick(platform)}
      id={`platform-card-${platform}`}
      role="button"
      tabIndex={0}
    >
      <div className="coverage-card-header">
        <div className={`platform-dot ${platform}`} />
        <span className="coverage-card-name">{name}</span>
      </div>
      <div className="coverage-percentage">{percentage}%</div>
      <div className="coverage-detail">
        {matched} of {total} tracks matched
        {missing > 0 && (
          <span style={{ color: 'var(--danger)', display: 'block', marginTop: '2px' }}>
            {missing} track{missing !== 1 ? 's' : ''} missing
          </span>
        )}
      </div>
      <div className="coverage-bar">
        <div className="coverage-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
