import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/*
 * MusicArtwork — Vinyl-spinning album card.
 * Adapted from 21st.dev diriktv/music-artwork, converted from Next.js+Tailwind to plain React+CSS.
 */

const vinylSrc = 'https://pngimg.com/d/vinyl_PNG95.png';

export default function MusicArtwork({
  artist,
  title,
  albumArt,
  previewUrl,
  onClick,
  isPlaying = false,
  size = 220,
}) {
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const vinylRef = useRef(null);
  const [rotation, setRotation] = useState(0);

  // Capture vinyl rotation when playback stops so it doesn't snap back
  useEffect(() => {
    if (!isPlaying && vinylRef.current) {
      const style = window.getComputedStyle(vinylRef.current);
      const transform = style.transform;
      if (transform && transform !== 'none') {
        try {
          const matrix = new DOMMatrix(transform);
          const angle = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
          setRotation(angle < 0 ? angle + 360 : angle);
        } catch {
          // ignore
        }
      }
    }
  }, [isPlaying]);

  const vinylSize = size * 0.85;
  const spinDuration = 1.33; // seconds per revolution

  return (
    <div
      className="music-artwork"
      style={{ width: size, height: size, position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick?.()}
    >
      {/* Vinyl record — slides out from behind on hover */}
      <div
        className="music-artwork__vinyl"
        style={{
          position: 'absolute',
          top: '50%',
          left: -vinylSize * 0.3,
          width: vinylSize,
          height: vinylSize,
          transform: `translateY(-50%) translateX(${hovered || isPlaying ? '0' : `${vinylSize * 0.35}px`})`,
          opacity: hovered || isPlaying ? 1 : 0,
          transition: 'transform 0.5s cubic-bezier(0.33,1,0.68,1), opacity 0.4s ease',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <img
          ref={vinylRef}
          src={vinylSrc}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: isPlaying ? undefined : `rotate(${rotation}deg)`,
            animation: isPlaying ? `vinyl-spin ${spinDuration}s linear infinite` : 'none',
          }}
        />
      </div>

      {/* Album cover */}
      <motion.div
        className="music-artwork__cover"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 14,
          overflow: 'hidden',
          cursor: 'pointer',
          zIndex: 1,
          boxShadow: hovered
            ? '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.15)'
            : '0 8px 32px rgba(0,0,0,0.4)',
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Image */}
        {albumArt && (
          <img
            src={albumArt}
            alt={`${title} by ${artist}`}
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          />
        )}

        {/* Skeleton while loading */}
        {!imgLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            }}
          />
        )}

        {/* Overlay gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
            opacity: hovered ? 1 : 0.4,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
          }}
        />

        {/* Play button + info */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                bottom: 14,
                left: 14,
                right: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {/* Play/Pause icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                    <rect x="2" y="1" width="3" height="12" rx="1" />
                    <rect x="9" y="1" width="3" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                    <path d="M3 1.5v11l9-5.5z" />
                  </svg>
                )}
              </div>

              {/* Track info */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 13,
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {artist}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Now playing indicator */}
        <AnimatePresence>
          {isPlaying && !hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                display: 'flex',
                gap: 2,
                alignItems: 'flex-end',
                height: 16,
              }}
            >
              {[0, 0.15, 0.3].map((d) => (
                <motion.div
                  key={d}
                  animate={{ height: ['4px', '14px', '6px', '12px', '4px'] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: d,
                    ease: 'easeInOut',
                  }}
                  style={{
                    width: 3,
                    borderRadius: 2,
                    background: '#fff',
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
