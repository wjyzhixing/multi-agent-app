import ChatInterface from '@/components/ChatInterface';

export default function AIToolsPage() {
  return (
    <ChatInterface
      agentType="aiTools"
      placeholder="问问你想了解的工具或技术..."
    />
  );
}
