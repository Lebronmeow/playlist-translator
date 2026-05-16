import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ListMusic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);

const getHighResImage = (url) => {
  if (!url) return '';
  if (url.includes('100x100bb.jpg')) return url.replace('100x100bb.jpg', '1000x1000bb.jpg');
  if (url.includes('60x60bb.jpg')) return url.replace('60x60bb.jpg', '1000x1000bb.jpg');
  if (url.includes('hqdefault.jpg')) return url.replace('hqdefault.jpg', 'maxresdefault.jpg');
  if (url.includes('default.jpg') && !url.includes('maxresdefault.jpg')) {
    return url.replace('default.jpg', 'hqdefault.jpg');
  }
  return url;
};

const filterVariants = {
  inactive: { scale: 1 },
  active: { scale: 1.02 },
};

const trackItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: Math.min(i * 0.03, 1.5),
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const statusPopIn = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring', stiffness: 500, damping: 25 },
};

const TrackItemAnimated = ({ track, status, i, isActive, onHover, onClick }) => {
  const titleRef = useRef(null);
  const artistRef = useRef(null);
  
  useEffect(() => {
    if (isActive) {
      if (titleRef.current) {
        gsap.killTweensOf(titleRef.current);
        gsap.to(titleRef.current, { duration: 0.6, scrambleText: { text: track.title, chars: "qwerty1337h@ck3r", revealDelay: 0.1, speed: 0.4 }});
      }
      if (artistRef.current) {
        gsap.killTweensOf(artistRef.current);
        gsap.to(artistRef.current, { duration: 0.6, scrambleText: { text: track.artist, chars: "qwerty1337h@ck3r", revealDelay: 0.2, speed: 0.4 }});
      }
    } else {
      if (titleRef.current) {
        gsap.killTweensOf(titleRef.current);
        titleRef.current.textContent = track.title;
      }
      if (artistRef.current) {
        gsap.killTweensOf(artistRef.current);
        artistRef.current.textContent = track.artist;
      }
    }
  }, [isActive, track]);

  return (
    <motion.div
      className={`track-item`}
      whileHover={{ x: 4, backgroundColor: 'rgba(139, 92, 246, 0.04)' }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      onMouseEnter={() => onHover(i, getHighResImage(track.artworkUrl || track.thumbnailUrl || ''))}
      onMouseLeave={() => onHover(-1, '')}
      style={{ 
        cursor: status === 'fallback' ? 'pointer' : 'default',
        borderLeft: isActive ? '3px solid rgb(255, 223, 0)' : '3px solid transparent'
      }}
    >
      <span className="track-num" style={{ color: isActive ? 'rgb(255, 223, 0)' : undefined }}>{i + 1}</span>
      <div className="track-info">
        <div className="track-title" ref={titleRef} style={{ color: isActive ? 'rgb(255, 223, 0)' : undefined }}>{track.title}</div>
        <div className="track-artist" ref={artistRef}>{track.artist}</div>
      </div>
      <div className="track-status">
        {status === 'matched' && (
          <motion.div {...statusPopIn}>
            <CheckCircle2 size={20} className="status-icon matched" aria-label="Exact match found" />
          </motion.div>
        )}
        {status === 'fallback' && (
          <motion.div {...statusPopIn}>
            <AlertTriangle size={20} className="status-icon fallback" aria-label="Smart suggestion available" />
          </motion.div>
        )}
        {status === 'missing' && (
          <motion.div {...statusPopIn}>
            <XCircle size={20} className="status-icon missing" aria-label="Not found on this platform" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default function TrackList({ tracks, selectedPlatform, fallbacks }) {
  const [filter, setFilter] = useState('all');
  const [expandedFallback, setExpandedFallback] = useState(null);
  
  const [activeHoverIdx, setActiveHoverIdx] = useState(-1);
  const bgRef = useRef(null);

  const handleHover = useCallback((idx, imgUrl) => {
    setActiveHoverIdx(idx);
    if (bgRef.current) {
      if (idx !== -1 && imgUrl) {
        bgRef.current.style.transition = 'none';
        bgRef.current.style.transform = 'translate(-50%, -50%) scale(1.1)';
        bgRef.current.style.backgroundImage = `url(${imgUrl})`;
        bgRef.current.style.opacity = '0.25'; // distinct overlaid art
        
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bgRef.current.style.transition = 'opacity 0.6s ease, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            bgRef.current.style.transform = 'translate(-50%, -50%) scale(1.0)';
          });
        });
      } else {
        bgRef.current.style.opacity = '0';
      }
    }
  }, []);

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

  const filters = [
    { key: 'all', label: `All (${counts.all})`, icon: null },
    { key: 'matched', label: `Matched (${counts.matched})`, icon: <CheckCircle2 size={14} /> },
    { key: 'fallback', label: `Suggestions (${counts.fallback})`, icon: <AlertTriangle size={14} /> },
    { key: 'missing', label: `Missing (${counts.missing})`, icon: <XCircle size={14} /> },
  ];

  return (
    <motion.div
      className="track-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ListMusic size={24} /> Track Analysis
      </h2>

      <div className="track-filters">
        {filters.map((f) => (
          <motion.button
            key={f.key}
            className={`track-filter ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
            variants={filterVariants}
            animate={filter === f.key ? 'active' : 'inactive'}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {f.icon && <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px' }}>{f.icon}</span>}
            {f.label}
          </motion.button>
        ))}
      </div>

      <div
        ref={bgRef}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          width: '110vw',
          height: '110vh',
          transform: 'translate(-50%, -50%) scale(1)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 0, 
        }}
      />
      <div className="track-list" style={{ position: 'relative', zIndex: 2 }}>
        <AnimatePresence mode="popLayout">
          {filteredTracks.map((track, i) => {
            const status = getTrackStatus(track);
            const key = `${track.title}__${track.artist}`;
            const fallbackData = fallbacks && fallbacks[key];
            const isExpanded = expandedFallback === key;

            return (
              <motion.div
                key={key || i}
                custom={i}
                variants={trackItemVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: 12, transition: { duration: 0.2 } }}
                layout
              >
                <TrackItemAnimated
                  track={track}
                  status={status}
                  i={i}
                  isActive={activeHoverIdx === i}
                  onHover={handleHover}
                  onClick={() => {
                    if (status === 'fallback' && fallbackData?.found) {
                      setExpandedFallback(isExpanded ? null : key);
                    }
                  }}
                />

                {/* Fallback suggestion — expandable */}
                <AnimatePresence>
                  {status === 'fallback' && fallbackData && fallbackData.found && isExpanded && (
                    <motion.div
                      className="fallback-card glass-card"
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {filteredTracks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}
          >
            No tracks match this filter
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
