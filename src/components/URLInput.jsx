import React, { useState } from 'react';
import { Link as LinkIcon } from 'lucide-react';

export default function URLInput({ onSubmit, loading }) {
  const [url, setUrl] = useState('');

  const detectPlatform = (input) => {
    if (/open\.spotify\.com\/playlist/.test(input)) return 'spotify';
    if (/music\.youtube\.com\/playlist/.test(input)) return 'youtubeMusic';
    if (/youtube\.com\/playlist/.test(input)) return 'youtubeMusic';
    return null;
  };

  const platform = detectPlatform(url);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    onSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="url-input-wrapper" id="url-input-form">
      <div className="url-input-glow" />
      <div className="url-input-container">
        <span className="url-input-icon">
          <LinkIcon size={20} />
        </span>
        <input
          type="url"
          className="url-input"
          placeholder="Paste a Spotify or YouTube Music playlist link..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          id="playlist-url-input"
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={!url.trim() || loading}
          id="translate-btn"
        >
          {loading ? (
            <>
              <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              Analyzing...
            </>
          ) : (
            <>Translate Playlist</>
          )}
        </button>
      </div>
      {url && !platform && url.length > 10 && (
        <div className="error-message" style={{ marginTop: '0.75rem' }}>
          Please paste a valid Spotify or YouTube Music playlist URL
        </div>
      )}
    </form>
  );
}
