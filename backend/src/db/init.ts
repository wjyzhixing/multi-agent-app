import db from './index';
import bcrypt from 'bcryptjs';

// User functions
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export function createUser(username: string, email: string, password: string, role: 'user' | 'admin' = 'user'): string {
  const id = crypto.randomUUID();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(`
    INSERT INTO users (id, username, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, username, email, hashedPassword, role);
  return id;
}

export function getUserById(id: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | null;
}

export function getUserByUsername(username: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) as User | null;
}

export function getUserByEmail(email: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as User | null;
}

export function verifyPassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.password);
}

export function updateUserPassword(id: string, newPassword: string): void {
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const stmt = db.prepare(`
    UPDATE users SET password = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(hashedPassword, id);
}

// Conversation functions
export function initConversation(agentType: string, userInput: string, agentResponse: string, intentScore: number, isBlocked: boolean, sessionId?: string, userId?: string): string {
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO conversations (id, agent_type, user_input, agent_response, intent_score, is_blocked, session_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, agentType, userInput, agentResponse, intentScore, isBlocked ? 1 : 0, sessionId || null, userId || null);
  return id;
}

export function saveRecommendation(id: string, conversationId: string, recType: string, content: string, metadata?: string): void {
  const stmt = db.prepare(`
    INSERT INTO recommendations (id, conversation_id, rec_type, content, metadata)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, conversationId, recType, content, metadata || null);
}

export function getConversationHistory(agentType?: string, limit: number = 20, userId?: string): any[] {
  let query = `
    SELECT id, agent_type, user_input, agent_response, intent_score, is_blocked, session_id, user_id, created_at
    FROM conversations
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (agentType) {
    conditions.push('agent_type = ?');
    params.push(agentType);
  }

  if (userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const stmt = db.prepare(query);
  return stmt.all(...params) as any[];
}

// Career session functions
export interface CareerSession {
  id: string;
  user_id: string | null;
  stage: 'questioning' | 'analyzing' | 'completed';
  answers: string;
  question_index: number;
  current_question: string | null;
  created_at: string;
  updated_at: string;
}

export function createCareerSession(userId?: string): string {
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO career_sessions (id, user_id, stage, answers, question_index)
    VALUES (?, ?, 'questioning', '[]', 0)
  `);
  stmt.run(id, userId || null);
  return id;
}

export function getCareerSession(sessionId: string): CareerSession | null {
  const stmt = db.prepare('SELECT * FROM career_sessions WHERE id = ?');
  return stmt.get(sessionId) as CareerSession | null;
}

export function getLatestCareerSession(userId?: string): CareerSession | null {
  let query = 'SELECT * FROM career_sessions WHERE stage != ?';
  const params: any[] = ['completed'];

  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  query += ' ORDER BY created_at DESC LIMIT 1';

  const stmt = db.prepare(query);
  return stmt.get(...params) as CareerSession | null;
}

export function updateCareerSession(
  sessionId: string,
  updates: Partial<Pick<CareerSession, 'stage' | 'answers' | 'question_index' | 'current_question'>>
): void {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.stage !== undefined) {
    fields.push('stage = ?');
    values.push(updates.stage);
  }
  if (updates.answers !== undefined) {
    fields.push('answers = ?');
    values.push(updates.answers);
  }
  if (updates.question_index !== undefined) {
    fields.push('question_index = ?');
    values.push(updates.question_index);
  }
  if (updates.current_question !== undefined) {
    fields.push('current_question = ?');
    values.push(updates.current_question);
  }

  fields.push("updated_at = datetime('now')");
  values.push(sessionId);

  const stmt = db.prepare(`UPDATE career_sessions SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

// Document functions
export interface Document {
  id: string;
  session_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function createDocument(sessionId: string, content: string = ''): string {
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO documents (id, session_id, content)
    VALUES (?, ?, ?)
  `);
  stmt.run(id, sessionId, content);
  return id;
}

export function getDocument(sessionId: string): Document | null {
  const stmt = db.prepare('SELECT * FROM documents WHERE session_id = ?');
  return stmt.get(sessionId) as Document | null;
}

export function updateDocument(sessionId: string, content: string): void {
  const stmt = db.prepare(`
    UPDATE documents SET content = ?, updated_at = datetime('now')
    WHERE session_id = ?
  `);
  stmt.run(content, sessionId);
}
