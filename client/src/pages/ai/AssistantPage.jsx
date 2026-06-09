import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import {
  getConversations,
  getConversation,
  deleteConversation,
  assistantStreamUrl,
} from '../../api/ai';
import { streamAIRequest } from '../../utils/streamAI';
import { useToast } from '../../components/ui/Toast';
import { formatEAT } from '../../lib/datetime';

const SUGGESTED = [
  'Which attachees are falling behind this month?',
  'Summarize this week’s task completion',
  'Who has the best attendance record?',
  'Draft a note about department progress',
];

// Minimal, safe formatter: escape HTML, then render **bold** and preserve breaks.
function formatMessage(text) {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

export default function AssistantPage() {
  const { show } = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    try {
      const res = await getConversations();
      setConversations(res.data.conversations);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  async function openConversation(id) {
    try {
      const res = await getConversation(id);
      setActiveId(id);
      setMessages(res.data.conversation.messages || []);
    } catch {
      show('Failed to load conversation', 'error');
    }
  }

  function newConversation() {
    setActiveId(null);
    setMessages([]);
    setInput('');
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      if (id === activeId) newConversation();
      await loadConversations();
    } catch {
      show('Failed to delete', 'error');
    }
  }

  async function send(overrideText) {
    const text = (overrideText || input).trim();
    if (!text || streaming) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setStreaming(true);

    let newId = activeId;
    await streamAIRequest({
      url: assistantStreamUrl(),
      body: { question: text, conversation_id: activeId },
      onChunk: (chunk) => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      },
      onDone: (data) => {
        newId = data.conversation_id || activeId;
      },
      onError: (msg) => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: msg || 'Request failed.' };
          return copy;
        });
      },
    });

    setStreaming(false);
    if (newId && newId !== activeId) setActiveId(newId);
    loadConversations();
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversations sidebar */}
      <div className="hidden w-72 shrink-0 flex-col rounded-xl border border-line bg-card md:flex">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <MessageSquare size={15} /> Conversations
          </span>
        </div>
        <div className="p-3">
          <button
            onClick={newConversation}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-600 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-accentSoft"
          >
            <Plus size={15} /> New Conversation
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-subtle">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={`group flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                  c.id === activeId ? 'bg-accentSoft' : 'hover:bg-hover'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{c.title || 'Untitled'}</span>
                  <span className="text-xs text-subtle">{formatEAT(c.updated_at)}</span>
                </span>
                <span
                  onClick={(e) => handleDelete(c.id, e)}
                  className="mt-0.5 hidden text-subtle hover:text-[#dc2626] group-hover:block"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col rounded-xl border border-line bg-card">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Sparkles size={16} className="text-brand-600" />
          <h2 className="font-display text-base font-semibold text-ink">Department AI Assistant</h2>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accentSoft">
                <MessageSquare size={26} className="text-brand-600" />
              </div>
              <p className="mt-4 max-w-sm text-sm text-subtle">
                Ask questions about your department’s attendance, tasks, and attachees. Answers use
                your real department data only.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-ink hover:bg-hover"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'user' ? (
                  <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-2.5 text-sm leading-relaxed text-white">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-line bg-canvas px-4 py-2.5 text-sm leading-relaxed text-ink">
                    {m.content ? (
                      <span dangerouslySetInnerHTML={{ __html: formatMessage(m.content) }} />
                    ) : streaming && i === messages.length - 1 ? (
                      <Loader2 size={15} className="animate-spin text-subtle" />
                    ) : null}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-line p-3">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about your department…"
              disabled={streaming}
              className="max-h-32 flex-1 resize-none rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink placeholder-[#9ca3af] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || streaming}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-subtle">
            Generated by AI via NVIDIA NIM · answers reflect your department data only
          </p>
        </div>
      </div>
    </div>
  );
}
