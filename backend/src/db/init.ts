import db from './index';

export function initConversation(agentType: string, userInput: string, agentResponse: string, intentScore: number, isBlocked: boolean): string {
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO conversations (id, agent_type, user_input, agent_response, intent_score, is_blocked)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, agentType, userInput, agentResponse, intentScore, isBlocked ? 1 : 0);
  return id;
}

export function saveRecommendation(id: string, conversationId: string, recType: string, content: string, metadata?: string): void {
  const stmt = db.prepare(`
    INSERT INTO recommendations (id, conversation_id, rec_type, content, metadata)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, conversationId, recType, content, metadata || null);
}

export function getConversationHistory(agentType?: string, limit: number = 20): any[] {
  let query = `
    SELECT id, agent_type, user_input, agent_response, intent_score, is_blocked, created_at
    FROM conversations
  `;
  const params: any[] = [];

  if (agentType) {
    query += ' WHERE agent_type = ?';
    params.push(agentType);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const stmt = db.prepare(query);
  return stmt.all(...params) as any[];
}
