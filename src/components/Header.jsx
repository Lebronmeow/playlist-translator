import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <div className="header-logo-icon" style={{ backgroundColor: 'transparent', background: 'none' }}><Radio size={24} color="#FFF" /></div>
          <span>Playlist Translator</span>
        </Link>
        <nav className="header-nav">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="header-link"
          >
            Open Source
          </a>
        </nav>
      </div>
    </header>
  );
}
