'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// 神经网络粒子背景
function NeuralNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    interface Node {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      radius: number;
      phase: number;
    }

    const nodes: Node[] = [];
    const nodeCount = 12;

    const init = () => {
      nodes.length = 0;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.35;

      nodes.push({
        x: centerX,
        y: centerY,
        baseX: centerX,
        baseY: centerY,
        radius: 8,
        phase: 0,
      });

      for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * Math.PI * 2 - Math.PI / 2;
        const distance = radius * (0.7 + Math.random() * 0.3);
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        nodes.push({
          x,
          y,
          baseX: x,
          baseY: y,
          radius: 4 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const animate = () => {
      time += 0.01;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nodes.forEach((node, i) => {
        if (i > 0) {
          const offsetX = Math.sin(time + node.phase) * 8;
          const offsetY = Math.cos(time * 0.8 + node.phase) * 8;
          node.x = node.baseX + offsetX;
          node.y = node.baseY + offsetY;
        }
      });

      const center = nodes[0];
      nodes.slice(1).forEach((node, i) => {
        const alpha = 0.1 + Math.sin(time * 2 + i) * 0.05;

        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(node.x, node.y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        const nextNode = nodes[((i + 1) % (nodeCount)) + 1];
        if (nextNode) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(nextNode.x, nextNode.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
          ctx.stroke();
        }
      });

      nodes.slice(1).forEach((node, i) => {
        const progress = (time * 0.5 + i * 0.1) % 1;
        const dx = node.x - center.x;
        const dy = node.y - center.y;
        const x = center.x + dx * progress;
        const y = center.y + dy * progress;

        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(1 - progress) * 0.5})`;
        ctx.fill();
      });

      nodes.forEach((node, i) => {
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.radius * 3
        );
        gradient.addColorStop(0, i === 0 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    init();
    animate();

    window.addEventListener('resize', () => {
      resize();
      init();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0" />;
}

const agentLabels = [
  { name: '心理疏导', angle: -75 },
  { name: 'AI 工具', angle: -25 },
  { name: '职业测评', angle: 25 },
  { name: '页面生成', angle: 75 },
];

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少6个字符');
      return;
    }

    setLoading(true);

    const res = await register(username, email, password);

    if (res.success && res.data) {
      setAuth(res.data.user, res.data.token);
      router.push('/agents/career');
    } else {
      setError(res.error || '注册失败');
    }

    setLoading(false);
  };

  return (
    <div className="no-sidebar min-h-screen flex relative overflow-hidden bg-black">
      <NeuralNetwork />

      {/* 左侧品牌区 */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center relative z-10">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {agentLabels.map((label, i) => (
            <div
              key={label.name}
              className="absolute text-xs text-neutral-500 tracking-wider"
              style={{
                transform: `rotate(${label.angle}deg) translateY(-180px) rotate(${-label.angle}deg)`,
              }}
            >
              {label.name}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-light text-white tracking-wide">智能体助手</h1>
          <p className="text-neutral-600 text-sm mt-2 tracking-widest">AI AGENT PLATFORM</p>
        </div>
      </div>

      {/* 右侧注册区 */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm">
          {/* 移动端标题 */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-light text-white tracking-wide">智能体助手</h1>
            <p className="text-neutral-600 text-xs mt-1 tracking-widest">AI AGENT PLATFORM</p>
          </div>

          <div
            className="rounded-xl p-8"
            style={{
              background: 'rgba(18, 18, 18, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div className="text-center mb-8">
              <h2 className="text-xl text-white font-medium">欢迎注册</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-neutral-700 outline-none transition-all focus:border-white/20 focus:bg-white/[0.07]"
                  placeholder="3-20个字符"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-neutral-700 outline-none transition-all focus:border-white/20 focus:bg-white/[0.07]"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-neutral-700 outline-none transition-all focus:border-white/20 focus:bg-white/[0.07]"
                  placeholder="至少6个字符"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1.5">确认密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-neutral-700 outline-none transition-all focus:border-white/20 focus:bg-white/[0.07]"
                  placeholder="再次输入密码"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition-colors"
              >
                {loading ? '注册中...' : '注册'}
              </button>
            </form>

            <p className="text-center text-sm text-neutral-700 mt-6">
              已有账号？{' '}
              <Link href="/login" className="text-neutral-500 hover:text-white transition-colors">
                立即登录
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-32 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
    </div>
  );
}