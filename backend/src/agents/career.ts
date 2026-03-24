import { BaseAgent, AgentResponse, AgentContext } from './base';
import { chatWithAIStream, chatWithAI } from '../lib/ai-client';
import { PassThrough } from 'stream';
import {
  createCareerSession,
  getLatestCareerSession,
  updateCareerSession,
  getCareerSession,
  createDocument,
  getDocument,
  updateDocument,
  initConversation,
  CareerSession
} from '../db/init';
import * as dotenv from 'dotenv';

dotenv.config();

// Career assessment questions
const QUESTIONS = [
  {
    key: 'personality',
    question: '你觉得自己是一个怎样的人？比如在工作中更喜欢独立完成任务还是团队协作？喜欢有明确规划的工作还是灵活多变的挑战？',
    aspect: '性格特点'
  },
  {
    key: 'skills',
    question: '你目前最擅长的技能是什么？（比如沟通协调、数据分析、创意设计、技术编程、管理等）',
    aspect: '核心技能'
  },
  {
    key: 'interests',
    question: '在工作之外，你有什么兴趣爱好？或者有什么事情是你愿意花大量时间去做的？',
    aspect: '兴趣爱好'
  },
  {
    key: 'values',
    question: '你在工作中最看重什么？（比如：收入、成就感、工作生活平衡、社会价值、成长空间等）请按重要性排序。',
    aspect: '价值观'
  },
  {
    key: 'experience',
    question: '简单描述一下你的工作经历或教育背景，有哪些让你印象深刻的经历？',
    aspect: '经历背景'
  },
  {
    key: 'challenges',
    question: '你觉得目前工作中（或生活中）最大的困难或挑战是什么？',
    aspect: '当前挑战'
  },
  {
    key: 'goals',
    question: '你对未来3-5年的职业发展有什么期望或目标吗？',
    aspect: '职业目标'
  }
];

export class CareerAgent extends BaseAgent {
  readonly name = '职业测评智能体';
  readonly description = '通过对话分析您的性格、技能和兴趣，推荐适合的职业方向';

  async process(input: string, context?: AgentContext): Promise<AgentResponse> {
    try {
      const aiResponse = await chatWithAI({
        messages: [{ role: 'user', content: input }],
        system: this.getSystemPrompt(),
        maxTokens: 800,
        temperature: 0.7,
      });

      return this.formatResponse(aiResponse, []);
    } catch (error) {
      return this.formatResponse(
        '抱歉，我现在无法处理您的请求。请稍后再试。',
        []
      );
    }
  }

  async processStream(input: string, context?: AgentContext): Promise<PassThrough> {
    const passThrough = new PassThrough();
    const sessionId = context?.conversationId;
    const userId = context?.userId;

    (async () => {
      try {
        // Get or create session
        let session: CareerSession | null = null;

        if (sessionId) {
          session = getCareerSession(sessionId);
        }

        if (!session) {
          session = getLatestCareerSession(userId);
        }

        if (!session) {
          const newSessionId = createCareerSession(userId);
          session = getCareerSession(newSessionId);
        }

        if (!session) {
          passThrough.write(`data: ${JSON.stringify({ error: 'Failed to create session', done: true })}\n\n`);
          passThrough.end();
          return;
        }

        const currentSessionId = session.id;
        let answers = JSON.parse(session.answers || '[]');
        let questionIndex = session.question_index;

        // If completed, just chat normally
        if (session.stage === 'completed') {
          const doc = getDocument(currentSessionId);
          if (doc) {
            const stream = await chatWithAIStream({
              messages: [{ role: 'user', content: input }],
              system: this.getChatPrompt(doc.content),
              maxTokens: 500,
              temperature: 0.7,
            });

            stream.pipe(passThrough);
            return;
          }
        }

        // Store user's answer
        if (questionIndex > 0 || answers.length > 0) {
          answers.push({
            question: QUESTIONS[questionIndex - 1]?.question || 'Initial',
            answer: input,
            aspect: QUESTIONS[questionIndex - 1]?.aspect || 'General'
          });
        }

        // Move to next question
        questionIndex++;

        // Check if all questions answered
        if (questionIndex > QUESTIONS.length) {
          updateCareerSession(currentSessionId, {
            stage: 'analyzing',
            answers: JSON.stringify(answers),
            question_index: questionIndex
          });

          // Send analyzing message
          passThrough.write(`data: ${JSON.stringify({
            text: '感谢你的回答！我现在开始分析你的职业方向...\n\n',
            done: false,
            sessionId: currentSessionId
          })}\n\n`);

          // Generate report
          const report = await this.generateReport(answers);

          // Save document
          createDocument(currentSessionId, report);

          // Update session
          updateCareerSession(currentSessionId, { stage: 'completed' });

          const reportIntro = '分析完成！以下是你的职业测评报告：\n\n';
          const fullReport = reportIntro + report;

          // Save conversation history with session_id and user_id
          initConversation('career', input, fullReport, 1, false, currentSessionId, userId);

          // Send report
          passThrough.write(`data: ${JSON.stringify({
            text: fullReport,
            done: true,
            fullText: fullReport,
            sessionId: currentSessionId,
            documentReady: true
          })}\n\n`);

          passThrough.end();
          return;
        }

        // Save progress
        updateCareerSession(currentSessionId, {
          answers: JSON.stringify(answers),
          question_index: questionIndex,
          current_question: QUESTIONS[questionIndex - 1].question
        });

        // Send next question with progress
        const progress = `[${questionIndex}/${QUESTIONS.length}] `;
        const nextQuestion = QUESTIONS[questionIndex - 1].question;

        // Generate contextual response
        const contextualPrompt = this.getContextualPrompt(input, answers, questionIndex);
        const response = await chatWithAI({
          messages: [{ role: 'user', content: input }],
          system: contextualPrompt,
          maxTokens: 300,
          temperature: 0.7,
        });

        const fullResponse = progress + response + '\n\n' + nextQuestion;

        // Save conversation history with session_id and user_id
        initConversation('career', input, fullResponse, 1, false, currentSessionId, userId);

        passThrough.write(`data: ${JSON.stringify({
          text: fullResponse,
          done: true,
          fullText: fullResponse,
          sessionId: currentSessionId,
          questionIndex: questionIndex,
          totalQuestions: QUESTIONS.length
        })}\n\n`);

        passThrough.end();

      } catch (error: any) {
        console.error('Career agent error:', error);
        passThrough.write(`data: ${JSON.stringify({ error: error.message || '处理失败', done: true })}\n\n`);
        passThrough.end();
      }
    })();

    return passThrough;
  }

  private getContextualPrompt(input: string, answers: any[], questionIndex: number): string {
    const answeredAspects = answers.map(a => a.aspect).join('、');
    const currentAspect = QUESTIONS[questionIndex - 1]?.aspect || '';

    return `你是一位专业的职业咨询师。用户刚刚回答了关于"${answeredAspects}"的问题。
现在需要你简短地回应他的回答（表示理解和认可，1-2句话），然后自然地过渡到下一个问题。

要求：
- 回应要简短温暖，不要重复用户的话
- 不要问新问题（系统会自动显示下一个问题）
- 当前阶段：了解用户的${currentAspect}`;
  }

  private async generateReport(answers: any[]): Promise<string> {
    const answerSummary = answers.map(a => `**${a.aspect}**：${a.answer}`).join('\n\n');

    const systemPrompt = `你是一位资深的职业规划师，需要根据用户的回答生成一份专业的职业测评报告。

用户的回答：
${answerSummary}

请生成一份 Markdown 格式的报告，包含以下内容：

## 🎯 职业测评报告

### 核心特质分析
分析用户的性格、技能、价值观等核心特质（100字左右）

### 适合的职业方向
推荐3-5个具体的职业方向，每个包含：
- 职业名称
- 匹配度（高/中/低）
- 推荐理由（一句话）
- 发展路径建议

### 能力雷达图
使用 Mermaid 的 pie 图展示用户能力分布（技术能力、沟通能力、创造力、执行力、领导力），示例格式：
\`\`\`mermaid
pie showData
  title 个人能力分布
  "技术能力" : 75
  "沟通能力" : 80
  "创造力" : 70
  "执行力" : 55
  "领导力" : 50
\`\`\`

### 发展建议
针对性的职业发展建议（100字左右）

### 行动计划
未来3个月的行动建议（3-5条）

注意：
- 报告要具体，不要泛泛而谈
- 推荐的职业要符合用户的实际情况
- Mermaid 图表使用 pie 语法，这是最广泛支持的格式`;

    try {
      const response = await chatWithAI({
        messages: [{ role: 'user', content: '请根据我的回答生成职业测评报告' }],
        system: systemPrompt,
        maxTokens: 2000,
        temperature: 0.7,
      });

      return response;
    } catch (error) {
      return '报告生成失败，请稍后重试。';
    }
  }

  private getSystemPrompt(): string {
    return `你是一位专业的职业规划咨询师，帮助用户找到适合的职业方向。

你的职责：
1. 通过对话了解用户的性格、技能、兴趣和价值观
2. 分析用户的职业倾向
3. 给出切实可行的职业建议

回复要求：
- 语言亲切自然
- 回复简洁，200字左右`;
  }

  private getChatPrompt(reportContent: string): string {
    return `你是一位专业的职业规划咨询师。用户已经完成了职业测评，以下是测评报告：

${reportContent}

现在用户可能会继续和你讨论这个报告。你的职责：
1. 回答用户关于报告的问题
2. 提供更详细的职业建议
3. 帮助用户制定行动计划

回复要求：
- 基于报告内容回答
- 保持专业但亲切的语气
- 回复简洁，200字左右`;
  }
}