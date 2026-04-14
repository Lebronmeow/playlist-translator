// Express.js backend server
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import playlistRoutes from './routes/playlist.js';
import linkRoutes from './routes/links.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/playlist', playlistRoutes);
app.use('/api/link', linkRoutes);
app.use('/api/links', linkRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server locally (Vercel uses module export)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   🎵 Playlist Translator Backend        ║
  ║   Running on http://localhost:${PORT}       ║
  ║   No API keys required!                  ║
  ╚══════════════════════════════════════════╝
    `);
  });
}

export default app;
