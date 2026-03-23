import { BaseAgent, AgentResponse, Recommendation, AgentContext } from './base';
import { chatWithAIStream, chatWithAI } from '../lib/ai-client';
import { PassThrough } from 'stream';
import * as dotenv from 'dotenv';

dotenv.config();

export class AIToolsAgent extends BaseAgent {
  readonly name = 'AI 工具推荐智能体';
  readonly description = '为您推荐最新的 AI 工具、技术和框架';

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
    return `你是一位专业的 AI 工具和技术推荐专家，熟悉各种 AI 工具、技术框架和行业趋势。

你的职责：
1. 根据用户需求推荐合适的 AI 工具或技术
2. 提供详细的推荐理由和使用场景
3. 给出实用的使用建议

## 回复要求
- 直接用自然语言回复，不要使用 JSON 或代码块格式
- 保持回复简洁，200 字左右
- 推荐的工具要包含官网链接
- 推荐必须是真实存在的工具/技术

## 示例回复格式
"针对 AI 编程工具的需求，我推荐以下几款：

1. **Cursor** (https://cursor.com) - AI 原生代码编辑器，支持跨文件重构，对代码库有深度理解，是目前开发者评价最高的 AI IDE。

2. **GitHub Copilot** (https://github.com/features/copilot) - 作为插件支持主流 IDE，提供实时代码补全，拥有成熟的模型优化。

建议：先试用免费版本，根据使用习惯选择。"

## 你应该了解的 AI 工具
- 编程开发：Cursor, GitHub Copilot, Claude Code, Windsurf
- 图像生成：Midjourney, DALL-E, Stable Diffusion, Flux
- 视频生成：Runway, Pika, Sora
- 开发框架：LangChain, LlamaIndex, CrewAI
- 模型平台：Hugging Face, Ollama

## 注意事项
- 不要编造工具或网址
- 推荐要与用户需求高度相关`;
  }
}