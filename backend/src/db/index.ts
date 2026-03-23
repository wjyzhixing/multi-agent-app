import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../data/agents.db');

// Ensure data directory exists
import { mkdirSync, existsSync } from 'fs';
const dataDir = path.dirname(dbPath);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export default db;