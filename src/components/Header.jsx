import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      className={`header${scrolled ? ' scrolled' : ''}`}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <motion.div
            className="header-logo-icon"
            whileHover={{ rotate: 12, scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Radio size={20} color="#FFF" />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            Playlist Translator
          </motion.span>
        </Link>

        <nav className="header-nav">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Link to="/showcase" className="header-link">
              Showcase
            </Link>
          </motion.div>
          <motion.a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="header-link"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            whileHover={{ y: -1 }}
          >
            Open Source
          </motion.a>
        </nav>
      </div>
    </motion.header>
  );
}
