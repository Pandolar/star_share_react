import React, { useCallback, useEffect, useRef, useState } from 'react';

type Message = { id: number; role: string; content: string; sender_name?: string; created_at?: string };
type Conversation = { id: number; status: string; unread?: number } | null;

const base = process.env.REACT_APP_API_BASE_URL || '';

const EmbedChatPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const productKey = params.get('product') || '';
  const [token, setToken] = useState<string>(params.get('token') || '');
  const [config, setConfig] = useState<Record<string, any> | null>(null);
  const [conversation, setConversation] = useState<Conversation>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastId = useRef(0);
  const scroller = useRef<HTMLDivElement | null>(null);

  const headers = useCallback((): Record<string, string> => {
    const result: Record<string, string> = { 'X-CS-Key': productKey };
    if (token) result['X-CS-User-Token'] = token;
    return result;
  }, [productKey, token]);

  const call = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...headers(), ...(init?.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.code !== 20000) throw new Error(body.msg || `请求失败（${response.status}）`);
    return body.data;
  }, [headers]);

  useEffect(() => {
    window.parent?.postMessage({ type: 'cs:ready', product: productKey }, '*');
    const onMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === 'cs:token' && typeof data.token === 'string') setToken(data.token);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [productKey]);

  useEffect(() => {
    if (!productKey) { setError('缺少 product 参数'); setLoading(false); return; }
    setLoading(true);
    void call(`/star-api/cs/config?key=${encodeURIComponent(productKey)}`)
      .then((data) => setConfig(data))
      .catch((caught) => setError(caught instanceof Error ? caught.message : '客服暂不可用'))
      .finally(() => setLoading(false));
  }, [productKey, call]);

  useEffect(() => {
    if (!token) return;
    void call('/star-api/cs/conversation')
      .then((data) => {
        setConversation(data.conversation);
        setMessages(data.messages || []);
        lastId.current = (data.messages || []).reduce((max: number, item: Message) => Math.max(max, item.id), 0);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : '会话加载失败'));
  }, [token, call]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => {
      void call(`/star-api/cs/conversation?after_id=${lastId.current}`)
        .then((data) => {
          if (!data.conversation) return;
          setConversation(data.conversation);
          const fresh: Message[] = data.messages || [];
          if (fresh.length) {
            setMessages((current) => [...current, ...fresh.filter((item) => item.id > lastId.current)]);
            lastId.current = fresh.reduce((max: number, item: Message) => Math.max(max, item.id), lastId.current);
          }
        })
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [token, call]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length]);

  const send = async () => {
    const content = input.trim();
    if (!content || busy) return;
    setBusy(true); setError('');
    try {
      const data = await call('/star-api/cs/messages', {
        method: 'POST',
        body: JSON.stringify({ content, client_msg_id: `web:${Date.now()}:${Math.random().toString(36).slice(2, 8)}` }),
      });
      setInput('');
      const message = data.message as Message | undefined;
      if (message) {
        setMessages((current) => [...current, message]);
        lastId.current = Math.max(lastId.current, message.id);
      }
      setConversation(data.conversation || null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '发送失败');
    } finally { setBusy(false); }
  };

  const welcome = config?.welcome || {};
  return <div className="flex h-dvh flex-col bg-white text-slate-900">
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{config?.product?.name || '在线客服'}</p>
        <p className="text-xs text-slate-500">{config?.ai_enabled ? 'AI 优先，复杂问题转人工' : '人工客服'}</p>
      </div>
      {conversation?.status && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{conversation.status === 'open' ? '进行中' : conversation.status === 'processing' ? '处理中' : '已结束'}</span>}
    </header>
    <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
      {loading && <p className="text-center text-sm text-slate-500">正在加载…</p>}
      {!loading && !token && <div className="rounded border border-dashed p-3 text-sm text-slate-600">
        <p>{welcome.message || '您好，请描述您遇到的问题。'}</p>
        <p className="mt-2 text-xs text-slate-500">需要登录后开始对话；宿主页面应通过 postMessage 传入 cs:token。</p>
      </div>}
      {messages.map((message) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${message.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800'}`}>{message.content}</div>
      </div>)}
    </div>
    {error && <p className="border-t bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>}
    <footer className="border-t p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }}
          rows={2}
          placeholder={token ? '输入消息，Enter 发送' : '等待登录…'}
          disabled={!token || busy}
          className="flex-1 resize-none rounded border px-2 py-1 text-sm outline-none focus:border-emerald-500"
        />
        <button type="button" onClick={() => void send()} disabled={!token || busy || !input.trim()}
          className="h-9 rounded bg-emerald-600 px-3 text-sm text-white disabled:opacity-50">{busy ? '发送中' : '发送'}</button>
      </div>
    </footer>
  </div>;
};

export default EmbedChatPage;
