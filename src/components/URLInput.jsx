import React, { useState } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <motion.form
      onSubmit={handleSubmit}
      className="url-input-wrapper"
      id="url-input-form"
      initial={{ opacity: 0, scale: 0.95, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
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
        <motion.button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={!url.trim() || loading}
          id="translate-btn"
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {loading ? (
            <>
              <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              Analyzing...
            </>
          ) : (
            <>Translate Playlist</>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {url && !platform && url.length > 10 && (
          <motion.div
            className="error-message"
            style={{ marginTop: '0.75rem' }}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            Please paste a valid Spotify or YouTube Music playlist URL
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
