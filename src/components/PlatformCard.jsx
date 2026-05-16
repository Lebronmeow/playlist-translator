import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const PLATFORM_NAMES = {
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  youtubeMusic: 'YouTube Music',
  tidal: 'Tidal',
  deezer: 'Deezer',
};

export default function PlatformCard({ platform, coverage, selected, onClick, index = 0 }) {
  const { matched, total, percentage } = coverage;
  const missing = total - matched;
  const name = PLATFORM_NAMES[platform] || platform;
  const cardRef = useRef(null);

  // Animated counter
  const [displayPercent, setDisplayPercent] = useState(0);
  useEffect(() => {
    let frame;
    const duration = 1200;
    const start = performance.now();
    const target = percentage;
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = 1 - Math.pow(2, -10 * progress);
      setDisplayPercent(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [percentage]);

  // 3D tilt on hover
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)';
  };

  return (
    <motion.div
      ref={cardRef}
      className={`glass-card coverage-card ${selected ? 'selected' : ''}`}
      onClick={() => onClick(platform)}
      id={`platform-card-${platform}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(platform)}
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={{ scale: 0.97 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: 'transform 0.15s ease, border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease', cursor: 'pointer' }}
    >
      <div className="coverage-card-header">
        <motion.div
          className={`platform-dot ${platform}`}
          animate={selected ? { scale: [1, 1.4, 1] } : {}}
          transition={{ duration: 0.4 }}
        />
        <span className="coverage-card-name">{name}</span>
      </div>
      <div className="coverage-percentage">{displayPercent}%</div>
      <div className="coverage-detail">
        {matched} of {total} tracks matched
        {missing > 0 && (
          <span style={{ color: 'var(--danger)', display: 'block', marginTop: '2px' }}>
            {missing} track{missing !== 1 ? 's' : ''} missing
          </span>
        )}
      </div>
      <div className="coverage-bar">
        <motion.div
          className="coverage-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, delay: index * 0.1 + 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.div>
  );
}
