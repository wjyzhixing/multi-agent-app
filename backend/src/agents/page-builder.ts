import { BaseAgent, AgentResponse, AgentContext } from './base';
import { chatWithAIStream, chatWithAI } from '../lib/ai-client';
import { PassThrough } from 'stream';
import * as dotenv from 'dotenv';

dotenv.config();

export class PageBuilderAgent extends BaseAgent {
  readonly name = '页面生成智能体';
  readonly description = '通过对话帮你生成HTML页面代码';

  async process(input: string, context?: AgentContext): Promise<AgentResponse> {
    try {
      const aiResponse = await chatWithAI({
        messages: [{ role: 'user', content: input }],
        system: this.getSystemPrompt(),
        maxTokens: 16000,
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
    const existingCode = context?.existingCode || '';

    (async () => {
      try {
        const systemPrompt = existingCode
          ? this.getUpdateSystemPrompt(existingCode)
          : this.getSystemPrompt();

        const stream = await chatWithAIStream({
          messages: [{ role: 'user', content: input }],
          system: systemPrompt,
          maxTokens: 16000,
          temperature: 0.7,
        });

        stream.pipe(passThrough);
      } catch (error: any) {
        console.error('PageBuilder agent error:', error);
        passThrough.write(`data: ${JSON.stringify({ error: error.message || '处理失败', done: true })}\n\n`);
        passThrough.end();
      }
    })();

    return passThrough;
  }

  private getSystemPrompt(): string {
    return `你是一位专业的前端开发工程师，专门帮助用户通过对话生成HTML页面代码。

你的职责：
1. 理解用户想要的页面效果
2. 生成完整的、可运行的HTML代码（包含内联CSS和JavaScript）
3. 代码要美观、现代、响应式

## 输出格式要求
直接输出HTML代码块，格式如下：

\`\`\`html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>页面标题</title>
  <style>
    /* 你的CSS样式 */
  </style>
</head>
<body>
  <!-- 你的HTML内容 -->
  <script>
    // 你的JavaScript代码
  </script>
</body>
</html>
\`\`\`

## 代码要求
- 必须是完整的、可直接运行的HTML文件
- CSS使用内联样式或<style>标签
- JavaScript使用<script>标签
- 使用现代CSS特性（flexbox、grid等）
- 支持响应式设计
- 可以使用Tailwind CSS CDN: https://cdn.tailwindcss.com
- 可以使用Google Fonts

## 重要提示
- 简短回复（一两句话），然后直接给代码
- 代码优先，解释从简
- 如果用户需求不明确，先询问清楚`;
  }

  private getUpdateSystemPrompt(existingCode: string): string {
    return `你是一位专业的前端开发工程师，用户有一个现有的HTML页面，可能会向你提问或请求修改。

现有的HTML代码：
\`\`\`html
${existingCode}
\`\`\`

## 重要：判断用户意图

1. **如果是问答**（询问代码内容、解释功能等）：
   - 直接回答问题，不要输出代码块
   - 例如："标题是什么？" → 直接回答标题内容
   - 例如："这个页面有什么功能？" → 描述功能

2. **如果是修改请求**（要求改动代码）：
   - 简短说明修改内容
   - 返回完整的修改后的HTML代码块

## 输出格式

问答时：
直接用文字回答，不要输出代码块

修改时：
\`\`\`html
<!DOCTYPE html>
...完整的HTML代码...
\`\`\`

## 修改要求
- 简短说明修改内容，然后直接给完整代码
- 不要遗漏任何原有功能
- 确保代码完整可运行`;
  }
}