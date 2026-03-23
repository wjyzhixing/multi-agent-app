import { BaseAgent, AgentResponse, Recommendation, AgentContext } from './base';
import { chatWithAIStream, chatWithAI } from '../lib/ai-client';
import { PassThrough } from 'stream';
import * as dotenv from 'dotenv';

dotenv.config();

export class PsychologicalAgent extends BaseAgent {
  readonly name = '心理疏导智能体';
  readonly description = '为您提供心理疏导、情感支持，推荐治愈书籍和励志名言';

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
    return chatWithAIStream({
      messages: [{ role: 'user', content: input }],
      system: this.getSystemPrompt(),
      maxTokens: 800,
      temperature: 0.7,
    });
  }

  private getSystemPrompt(): string {
    return `你是一位温暖、专业的心理疏导专家，擅长提供情感支持和心理建议。

你的职责：
1. 用温暖、共情的语气回复用户
2. 提供实用的心理建议
3. 根据用户情况推荐真实的心理学书籍或励志名言

## 回复要求
- 直接用自然语言回复，不要使用 JSON 或代码块格式
- 保持回复简洁，200 字左右
- 如果推荐书籍或名言，直接在对话中自然提及
- 推荐的书籍和名言必须是真实存在的
- 书籍要标明作者，名言要标明出处

## 示例回复格式
"我能理解你现在的感受，工作压力确实让人喘不过气。建议你试着每天给自己留10分钟的'暂停时间'，哪怕只是发发呆也行。

推荐你读读《蛤蟆先生去看心理医生》（罗伯特·德博德著），这本书用童话的形式展示了心理咨询的过程，非常治愈。

记住罗曼·罗兰说过的话：世界上只有一种真正的英雄主义，就是在认清生活的真相后依然热爱生活。加油！"

## 注意事项
- 不要编造书籍或名言
- 如果不确定某个推荐，宁可不推荐也不要编造
- 始终保持温暖、支持的语气`;
  }
}