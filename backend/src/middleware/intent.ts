// Intent recognition configuration
export interface IntentConfig {
  threshold: number;
  keywords: Record<string, string[]>;
}

export const INTENT_CONFIG: IntentConfig = {
  threshold: 0.2,
  keywords: {
    psychological: [
      '心情', '情绪', '压力', '焦虑', '抑郁', '困惑', '烦恼',
      '痛苦', '难过', '悲伤', '孤独', '迷茫', '挫折', '失败',
      '书籍', '名言', '励志', '安慰', '鼓励', '心理', '健康',
      '怎么办', '如何面对', '怎么调整', '好累', '不开心',
      '帮助', '疏导', '倾诉', '烦恼', '困扰', '担忧', '害怕',
      '紧张', '恐惧', '不安', '烦躁', '郁闷', '委屈', '愤怒'
    ],
    aiTools: [
      'ai', 'AI', '人工智能', '工具', '技术', '推荐', '最新',
      '模型', 'llm', 'LLM', '大模型', '机器学习', '深度学习',
      '神经网络', 'nlp', 'NLP', 'cv', 'CV', '计算机视觉',
      '框架', '库', 'api', 'API', ' sdk', 'SDK', '开源',
      'github', 'hugging', 'transformer', 'diffusion',
      'chatgpt', 'claude', 'midjourney', 'stable diffusion',
      'agent', '智能体', '自动化', '工作流', '低代码',
      '编程', '代码', '开发', '前端', '后端', '全栈'
    ]
  }
};

export interface IntentResult {
  type: 'psychological' | 'aiTools' | 'unknown';
  score: number;
  isRelevant: boolean;
  matchedKeywords: string[];
}

export function recognizeIntent(input: string, expectedType: 'psychological' | 'aiTools'): IntentResult {
  const keywords = INTENT_CONFIG.keywords[expectedType];
  const inputLower = input.toLowerCase();

  const matchedKeywords: string[] = [];
  let matchCount = 0;

  for (const keyword of keywords) {
    const kwLower = keyword.toLowerCase();
    if (inputLower.includes(kwLower)) {
      matchedKeywords.push(keyword);
      matchCount++;
    }
  }

  // Calculate relevance score
  const score = matchedKeywords.length > 0
    ? Math.min(1, matchedKeywords.length / 5) // Normalize: 5+ matches = full score
    : 0;

  const isRelevant = score >= INTENT_CONFIG.threshold;

  return {
    type: isRelevant ? expectedType : 'unknown',
    score,
    isRelevant,
    matchedKeywords
  };
}

export function getBlockMessage(expectedType: 'psychological' | 'aiTools'): string {
  if (expectedType === 'psychological') {
    return '抱歉，我主要负责心理疏导、情感支持和书籍名言推荐。您的问题似乎与心理疏导不太相关，如果您有心情、压力、情绪等方面的问题，我很乐意帮助您。';
  } else {
    return '抱歉，我主要负责 AI 工具和技术推荐。您的问题似乎与 AI 工具不太相关，如果您想了解最新的 AI 技术、工具或框架，我很乐意为您推荐。';
  }
}
