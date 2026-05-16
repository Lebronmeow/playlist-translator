import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2,
  BarChart3,
  Zap,
  Headphones,
  ArrowRight,
  Music2,
  Globe,
  Sparkles,
} from 'lucide-react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from 'framer-motion';
import URLInput from '../components/URLInput';
import ScrollReveal from '../components/ScrollReveal';
import AnimatedCounter from '../components/AnimatedCounter';
import MusicPlayer from '../components/MusicPlayer';

/* ---- Animation variants ---- */
const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const floatAnimation = (delay) => ({
  y: [0, -12, 0],
  transition: {
    duration: 4.5,
    repeat: Infinity,
    ease: 'easeInOut',
    delay,
  },
});

/* ---- Platform SVG data ---- */
const platforms = [
  {
    title: 'Spotify',
    fill: '#1DB954',
    delay: 0,
    path: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
  },
  {
    title: 'Apple Music',
    fill: '#FC3C44',
    delay: 1.2,
    path: 'M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0019.7.28C19.382.164 19.052.1 18.72.048 18.132-.014 17.543-.004 16.953.002H7.047c-.592-.006-1.18-.016-1.77.046C4.96.1 4.63.164 4.3.28a5.022 5.022 0 00-1.874.81C1.31 1.823.565 2.823.248 4.133a9.23 9.23 0 00-.24 2.19c-.01.592-.006 1.18-.002 1.77v7.914c-.004.592-.008 1.18.002 1.77a9.23 9.23 0 00.24 2.19c.317 1.31 1.062 2.31 2.18 3.043.588.412 1.24.69 1.874.81.318.084.648.148.98.2.588.062 1.178.052 1.768.046h9.906c.592.006 1.18.016 1.77-.046.332-.052.662-.116.98-.2a5.022 5.022 0 001.874-.81c1.118-.732 1.863-1.732 2.18-3.043a9.23 9.23 0 00.24-2.19c.01-.592.006-1.18.002-1.77V7.894c.004-.592.008-1.18-.002-1.77zM16.95 17.08c0 .36-.11.7-.3 1-.3.47-.76.8-1.3.95-.4.12-.83.18-1.26.2-.58.03-1.15.01-1.73-.02-.44-.02-.87-.08-1.29-.18-.71-.18-1.27-.56-1.61-1.22-.18-.33-.26-.7-.28-1.08-.03-.58-.01-1.15.02-1.73.03-.53.03-1.07.07-1.6.05-.71.1-1.42.15-2.13.06-.87.12-1.74.19-2.61.02-.24.04-.48.07-.72.01-.13.06-.24.16-.33.12-.12.3-.15.46-.1.08.03.17.06.24.12.82.64 1.72 1.14 2.68 1.52.5.2 1.01.36 1.53.48.08.02.12.08.12.16v7.28z',
  },
  {
    title: 'YouTube Music',
    fill: '#FF0000',
    delay: 2.4,
    path: 'M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z',
  },
];

/* ---- Feature data ---- */
const features = [
  {
    icon: <Link2 size={24} />,
    title: 'Universal Links',
    desc: 'One shareable link that auto-routes listeners to Spotify, Apple Music, or YouTube Music.',
  },
  {
    icon: <BarChart3 size={24} />,
    title: 'Platform Auditor',
    desc: "See exactly which tracks you'll lose on each platform. Compare coverage scores side-by-side.",
  },
  {
    icon: <Zap size={24} />,
    title: 'Smart Matching',
    desc: 'Intelligent fallback engine finds the closest studio version when exact matches fail.',
  },
];

/* ---- Stats data ---- */
const stats = [
  { value: 50000, suffix: '+', label: 'Tracks Translated' },
  { value: 5, suffix: '', label: 'Platforms Supported' },
  { value: 95, suffix: '%', label: 'Match Accuracy' },
];

export default function Home() {
  const [loading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.96]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, -50]);
  const smoothHeroOpacity = useSpring(heroOpacity, { stiffness: 100, damping: 30 });
  const smoothHeroScale = useSpring(heroScale, { stiffness: 100, damping: 30 });

  const handleSubmit = (url) => {
    sessionStorage.setItem('targetPlaylistUrl', url);
    navigate('/dashboard');
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* ═══════════════════════════════════════════════
          SECTION 1 — HERO
          ═══════════════════════════════════════════════ */}
      <motion.section
        className="scroll-section scroll-section--hero"
        style={{ opacity: smoothHeroOpacity, scale: smoothHeroScale, y: heroY }}
      >
        {/* Floating platform icons */}
        <motion.div
          className="floating-platforms"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          {platforms.map((p, idx) => (
            <motion.div
              key={p.title}
              className="platform-float"
              title={p.title}
              variants={fadeUp}
              animate={{
                ...floatAnimation(p.delay),
              }}
              whileHover={{
                scale: 1.15,
                rotate: 5,
                boxShadow: '0 0 25px rgba(168, 85, 247, 0.25)',
              }}
              whileTap={{ scale: 0.9 }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill={p.fill}>
                <path d={p.path} />
              </svg>
            </motion.div>
          ))}
        </motion.div>

        {/* Badge */}
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.span
            className="section-eyebrow__dot"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          Universal Music Translator
        </motion.div>

        {/* Title */}
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Move Your Music.
          <br />
          Everywhere.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          Translate playlists between Spotify, Apple Music & YouTube Music.
          Preview tracks, discover lyrics, generate universal links.
        </motion.p>

        {/* URL Input */}
        <URLInput onSubmit={handleSubmit} loading={loading} />

        {error && <div className="error-message">{error}</div>}

        {/* Scroll indicator */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Scroll to explore
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-tertiary)' }}>
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ═══════════════════════════════════════════════
          SECTION 2 — FEATURES
          ═══════════════════════════════════════════════ */}
      <section className="scroll-section scroll-section--features">
        <div className="scroll-section__inner">
          <ScrollReveal preset="fade-up">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
              <div className="section-eyebrow">
                <Sparkles size={14} />
                How It Works
              </div>
              <h2 className="section-title">Built for Music Lovers</h2>
              <p className="section-subtitle" style={{ margin: '0 auto' }}>
                Three powerful tools that make switching platforms painless.
              </p>
            </div>
          </ScrollReveal>

          <div className="features-grid">
            {features.map((f, i) => (
              <ScrollReveal key={f.title} preset="fade-up" delay={i * 0.12}>
                <motion.div
                  className="glass-card feature-card"
                  whileHover={{
                    y: -6,
                    boxShadow: '0 16px 48px rgba(168, 85, 247, 0.1)',
                    borderColor: 'rgba(168, 85, 247, 0.15)',
                  }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="feature-icon">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 3 — MUSIC PLAYER (DEEZER PREVIEWS)
          ═══════════════════════════════════════════════ */}
      <section className="scroll-section scroll-section--player">
        <div className="scroll-section__inner">
          <ScrollReveal preset="fade-up">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
              <div className="section-eyebrow">
                <Headphones size={14} />
                Preview Tracks
              </div>
              <h2 className="section-title">Listen Before You Switch</h2>
              <p className="section-subtitle" style={{ margin: '0 auto' }}>
                Tap any album to hear a 30-second preview. Synced lyrics included.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal preset="scale" delay={0.15}>
            <MusicPlayer />
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 4 — STATS
          ═══════════════════════════════════════════════ */}
      <section className="scroll-section scroll-section--stats">
        <div className="scroll-section__inner">
          <ScrollReveal preset="fade-up">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
              <div className="section-eyebrow">
                <Globe size={14} />
                By the Numbers
              </div>
              <h2 className="section-title">Trusted by Music Fans</h2>
            </div>
          </ScrollReveal>

          <div className="stats-grid">
            {stats.map((s, i) => (
              <ScrollReveal key={s.label} preset="fade-up" delay={i * 0.12}>
                <div>
                  <div className="stat-item__number">
                    <AnimatedCounter target={s.value} suffix={s.suffix} />
                  </div>
                  <div className="stat-item__label">{s.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 5 — CTA
          ═══════════════════════════════════════════════ */}
      <section className="scroll-section scroll-section--cta">
        <ScrollReveal preset="scale">
          <div style={{ textAlign: 'center' }}>
            <motion.div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 'var(--space-4)',
              }}
            >
              <Music2 size={28} style={{ color: 'var(--accent-tertiary)' }} />
            </motion.div>
            <h2
              className="section-title"
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                background: 'var(--gradient-hero)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                backgroundSize: '300% 300%',
                animation: 'gradient-shift 8s ease-in-out infinite',
                marginBottom: 'var(--space-4)',
              }}
            >
              Ready to Translate?
            </h2>
            <p
              className="section-subtitle"
              style={{ margin: '0 auto var(--space-8)' }}
            >
              Paste a playlist link and watch the magic happen.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal preset="fade-up" delay={0.2}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <URLInput onSubmit={handleSubmit} loading={loading} />
          </div>
        </ScrollReveal>

        {/* Footer-ish */}
        <motion.div
          style={{
            marginTop: 'var(--space-16)',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            fontSize: 'var(--font-size-xs)',
            letterSpacing: '0.04em',
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.5 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          Made with love for music fans everywhere • Powered by Deezer & LRCLIB
        </motion.div>
      </section>
    </div>
  );
}
