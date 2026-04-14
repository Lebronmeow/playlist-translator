// In-memory link store with JSON file persistence
import { nanoid } from 'nanoid';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const DATA_FILE = join(DATA_DIR, 'links.json');

// In-memory store
let store = {};

// Load existing data from disk
function loadFromDisk() {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, 'utf-8');
      store = JSON.parse(raw);
      console.log(`📂 Loaded ${Object.keys(store).length} saved links from disk`);
    }
  } catch (err) {
    console.warn('Could not load links from disk:', err.message);
    store = {};
  }
}

// Save to disk
function saveToDisk() {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    console.warn('Could not save links to disk:', err.message);
  }
}

// Initialize on import
loadFromDisk();

/**
 * Create a new universal link.
 * Returns the generated short ID.
 */
export function createLink(playlistData) {
  const id = nanoid(8);
  store[id] = {
    ...playlistData,
    id,
    createdAt: new Date().toISOString(),
  };
  saveToDisk();
  return { id, url: `/p/${id}` };
}

/**
 * Get a universal link by ID.
 */
export function getLink(id) {
  return store[id] || null;
}

/**
 * Get all stored links (for admin/debug).
 */
export function getAllLinks() {
  return Object.values(store).map(link => ({
    id: link.id,
    name: link.name,
    trackCount: link.tracks?.length || 0,
    createdAt: link.createdAt,
  }));
}
