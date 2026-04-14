import React, { useState } from 'react';
import { Link, Check, Copy } from 'lucide-react';

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
    <div className="share-section">
      {!linkUrl ? (
        <button
          className="btn btn-primary btn-lg"
          onClick={onGenerate}
          disabled={generating}
          id="generate-link-btn"
        >
          {generating ? (
            <>
              <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              Generating...
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Link size={18} /> Generate Universal Link</div>
          )}
        </button>
      ) : (
        <>
          <h3 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-xl)' }}>
            Universal Link Ready
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
            Share this link — it auto-routes to the right platform
          </p>
          <div className="share-link-display">
            <span className="share-link-url" id="share-link-url">{fullUrl}</span>
            <button className="btn btn-secondary btn-sm" onClick={handleCopy} id="copy-link-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
          <a
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ marginTop: 'var(--space-3)' }}
          >
            Preview Link →
          </a>
        </>
      )}
    </div>
  );
}
