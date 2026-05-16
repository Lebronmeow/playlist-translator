import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const trackItemVariant = {
  initial: { opacity: 0, x: -10 },
  animate: (i) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: Math.min(i * 0.03, 2),
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

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
      <motion.div
        className="universal-link-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{ animation: 'none' }}
        />
        <motion.div
          className="loading-text"
          style={{ marginTop: '1rem' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Loading playlist...
        </motion.div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="universal-link-page"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="glass-card universal-card">
          <motion.div
            style={{ fontSize: '48px', marginBottom: '1rem' }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            😢
          </motion.div>
          <h2 style={{ marginBottom: '0.5rem' }}>Link Not Found</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      </motion.div>
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
      <motion.div
        className="dashboard-header"
        style={{ flexDirection: 'column', textAlign: 'center', margin: 'var(--space-10) 0' }}
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {data.artworkUrl ? (
          <motion.img
            src={data.artworkUrl}
            alt={data.name}
            className="universal-artwork"
            style={{ margin: '0 auto', boxShadow: 'var(--shadow-lg)' }}
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
            whileHover={{ scale: 1.05, rotate: 2 }}
          />
        ) : (
          <motion.div
            className="universal-artwork-placeholder"
            style={{ margin: '0 auto' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          >
            <Disc size={64} color="rgba(255,255,255,0.2)" />
          </motion.div>
        )}
        
        <motion.h1
          className="universal-title"
          style={{ marginTop: 'var(--space-4)' }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {data.name}
        </motion.h1>
        <motion.div
          className="universal-meta"
          style={{ marginBottom: 'var(--space-6)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {data.tracks?.length || 0} tracks · Translated Playlist
        </motion.div>
        
        <motion.div
          style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {topLevelLinks.map(({ platform, url }, idx) => {
            const isPreferred = platform.key === preferred;
            return (
              <motion.a
                key={platform.key}
                href={url}
                target="_blank"
                rel="noreferrer"
                className={`platform-btn ${platform.className}`}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: 'var(--font-size-sm)',
                  boxShadow: isPreferred ? '0 0 20px rgba(139, 92, 246, 0.15)' : 'none',
                  border: isPreferred ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)'
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Listen on {platform.name}
              </motion.a>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Embedded Tracklist */}
      <motion.div
        className="track-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Playlist Tracks</h3>
        <div className="track-list">
          {data.tracks?.map((track, index) => {
            return (
              <motion.div
                key={index}
                className="track-item"
                style={{ gridTemplateColumns: '32px 1fr auto' }}
                custom={index}
                variants={trackItemVariant}
                initial="initial"
                animate="animate"
                whileHover={{ x: 4, backgroundColor: 'rgba(139, 92, 246, 0.04)' }}
                transition={{ duration: 0.15 }}
              >
                <div className="track-num">{index + 1}</div>
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
                      <motion.a 
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
                          background: 'rgba(255,255,255,0.03)',
                          color: 'var(--text-secondary)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer',
                        }}
                        whileHover={{
                          scale: 1.15,
                          color: '#fff',
                          borderColor: 'rgba(139, 92, 246, 0.3)',
                          backgroundColor: 'rgba(139, 92, 246, 0.08)',
                        }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                      >
                         <ExternalLink size={14} />
                      </motion.a>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
      
      {/* Footer */}
      <motion.div
        style={{ textAlign: 'center', marginTop: 'var(--space-10)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Created with <a href="/" style={{ color: 'var(--text-accent)', textDecoration: 'underline' }}>Playlist Translator</a>
      </motion.div>
    </div>
  );
}
