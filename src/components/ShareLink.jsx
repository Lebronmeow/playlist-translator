import React, { useState } from 'react';
import { Link, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareLink({ linkUrl, onGenerate, generating }) {
  const [copied, setCopied] = useState(false);

  const fullUrl = linkUrl ? `${window.location.origin}${linkUrl}` : null;

  const handleCopy = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      className="share-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <AnimatePresence mode="wait">
        {!linkUrl ? (
          <motion.div
            key="generate"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.button
              className="btn btn-primary btn-lg"
              onClick={onGenerate}
              disabled={generating}
              id="generate-link-btn"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              animate={!generating ? {
                boxShadow: [
                  '0 4px 20px rgba(139, 92, 246, 0.3)',
                  '0 4px 35px rgba(139, 92, 246, 0.5)',
                  '0 4px 20px rgba(139, 92, 246, 0.3)',
                ],
              } : {}}
              // @ts-ignore
              transition2={{ boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
            >
              {generating ? (
                <>
                  <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Generating...
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <Link size={18} /> Generate Universal Link
                </div>
              )}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.h3
              style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-xl)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Universal Link Ready
            </motion.h3>
            <motion.p
              style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Share this link — it auto-routes to the right platform
            </motion.p>
            <motion.div
              className="share-link-display"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="share-link-url" id="share-link-url">{fullUrl}</span>
              <motion.button
                className="btn btn-secondary btn-sm"
                onClick={handleCopy}
                id="copy-link-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.span
                      key="copied"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Check size={14} /> Copied
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Copy size={14} /> Copy
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
            <motion.a
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ marginTop: 'var(--space-3)', display: 'inline-flex' }}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              Preview Link →
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
