import db from './index';

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    agent_type TEXT NOT NULL,
    user_input TEXT NOT NULL,
    agent_response TEXT NOT NULL,
    intent_score REAL DEFAULT 0,
    is_blocked INTEGER DEFAULT 0,
    session_id TEXT,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    rec_type TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  )
`);

// Career assessment sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS career_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    stage TEXT DEFAULT 'questioning',
    answers TEXT DEFAULT '[]',
    question_index INTEGER DEFAULT 0,
    current_question TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Documents table for markdown reports
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    content TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES career_sessions(id)
  )
`);

// Page builder sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS page_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Page versions table
db.exec(`
  CREATE TABLE IF NOT EXISTS page_versions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES page_sessions(id)
  )
`);

// Career job extensions table - 存储职业扩展详情
db.exec(`
  CREATE TABLE IF NOT EXISTS career_job_extensions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    job_title TEXT NOT NULL,
    content TEXT DEFAULT '',
    conversations TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES career_sessions(id),
    UNIQUE(session_id, job_title)
  )
`);

console.log('Database initialized successfully!');
