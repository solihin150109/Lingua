import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Loader2, Send, Sparkles, Volume2, X } from 'lucide-react';
import { useLingua } from '../context/LinguaContext';
import type { AssistantActionLink } from '../types/lingua';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: AssistantActionLink[];
}

const PRESET_QUESTIONS = [
  'Kalimat sopan menawarkan menu ke tamu?',
  'Cara menangani komplain makanan dingin?',
  'Beri latihan 7 grammar dasar waiter',
  'Mengapa "Wait, I bring menu" kurang tepat?',
];

export function PersonalAssistantDrawer() {
  const {
    assistantOpen,
    setAssistantOpen,
    assistantInitialPrompt,
    learnerContext,
    navigateToGrammarTopic,
    setActiveRoute,
    speakText,
    profile,
  } = useLingua();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const askCoachRef = useRef<(q: string) => void>(() => {});
  const autoSentPromptRef = useRef<string | null>(null);

  useEffect(() => {
    if (!assistantOpen) {
      autoSentPromptRef.current = null;
      return;
    }
    if (
      assistantInitialPrompt &&
      assistantInitialPrompt.trim() &&
      autoSentPromptRef.current !== assistantInitialPrompt
    ) {
      autoSentPromptRef.current = assistantInitialPrompt;
      askCoachRef.current(assistantInitialPrompt);
    }
  }, [assistantInitialPrompt, assistantOpen]);

  useEffect(() => {
    if (!assistantOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAssistantOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [assistantOpen, setAssistantOpen]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const handleActionClick = (action: AssistantActionLink) => {
    setAssistantOpen(false);
    if (action.route === 'grammar' && action.topicId) {
      navigateToGrammarTopic(action.topicId);
    } else {
      setActiveRoute(action.route);
    }
  };

  const askCoach = async (questionText: string) => {
    const clean = questionText.trim();
    if (!clean || streaming) return;

    setError(null);
    setInput('');
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: clean };
    const assistantId = `a-${Date.now() + 1}`;
    const historyPayload = messages
      .filter((m) => m.id !== 'coach-welcome')
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', text: '' }]);
    setStreaming(true);

    try {
      const res = await fetch('/api/ai/assistant/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: clean,
          history: historyPayload,
          learnerContext,
        }),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Could not reach Personal AI Coach.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const lines = frame.split('\n');
          const eventLine = lines.find((l) => l.startsWith('event:'));
          const dataLine = lines.find((l) => l.startsWith('data:'));
          if (!eventLine || !dataLine) continue;

          const eventName = eventLine.replace('event:', '').trim();
          const payload = JSON.parse(dataLine.replace('data:', '').trim());

          if (eventName === 'chunk' && payload.text) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: m.text + String(payload.text) } : m
              )
            );
          } else if (eventName === 'done') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      text: payload.fullText || m.text,
                      actions: Array.isArray(payload.actions) ? payload.actions : [],
                    }
                  : m
              )
            );
          } else if (eventName === 'error') {
            throw new Error(payload.error || 'Streaming error occurred.');
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach AI Coach.';
      setError(msg);
      setMessages((prev) =>
        prev.filter((m) => !(m.id === assistantId && !m.text.trim()))
      );
    } finally {
      setStreaming(false);
    }
  };

  askCoachRef.current = askCoach;

  if (!assistantOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close AI Coach drawer"
        onClick={() => setAssistantOpen(false)}
        className="fixed inset-0 bg-[#243B53]/30 backdrop-blur-[1px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Personal AI Learning Coach"
        className="relative z-10 w-full max-w-md bg-white dark:bg-[#16202C] h-full border-l border-[#E4E8EE] dark:border-[#263344] flex flex-col shadow-xl"
      >
        {/* Header */}
        <div className="h-16 px-5 border-b border-[#E4E8EE] dark:border-[#263344] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#3C8D8A] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#243447] dark:text-white truncate">
                Personal AI Coach
              </h2>
              <p className="text-[11px] text-[#718096] truncate">
                Waiter Hospitality · Kosakata &amp; 7 Grammar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAssistantOpen(false)}
            aria-label="Close coach"
            className="p-2 rounded-lg text-[#718096] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Context Strip */}
        <div className="px-5 py-3 bg-[#F7F8FA] dark:bg-[#1E2B3B] border-b border-[#E4E8EE] dark:border-[#263344] text-[11px] text-[#486581] dark:text-slate-300 space-y-1 shrink-0">
          <div className="flex items-center justify-between font-medium">
            <span>Level {learnerContext.level} · {learnerContext.preferredAccent}</span>
            <span className="font-mono tabular-nums text-[#3C8D8A]">
              {learnerContext.vocabMastered}/{learnerContext.vocabTotal} mastered
            </span>
          </div>
          {learnerContext.weakGrammarTopics.length > 0 && (
            <div className="truncate text-[#718096]">
              Focus grammar: {learnerContext.weakGrammarTopics.slice(0, 2).join(', ')}
            </div>
          )}
        </div>

        {/* Conversation Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex flex-col items-start">
            <div className="max-w-[90%] rounded-xl px-4 py-3 text-xs sm:text-sm leading-relaxed bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-[#243447] dark:text-slate-100">
              Halo {profile?.displayName || 'Partner'}. Tanyakan frasa waiter hotel/restoran, koreksi kalimat, atau 7 grammar dasar kapan saja.
            </div>
          </div>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#243B53] text-white'
                    : 'bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-[#243447] dark:text-slate-100'
                }`}
              >
                {msg.text || (streaming ? 'Thinking...' : '')}
              </div>

              {msg.role === 'assistant' && msg.text && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => speakText(msg.text.slice(0, 400))}
                    className="px-2 py-1 rounded-md border border-[#E4E8EE] dark:border-[#263344] text-[11px] text-[#718096] hover:text-[#243447] dark:hover:text-white flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3 text-[#3C8D8A]" />
                    <span>Listen</span>
                  </button>
                  {msg.actions?.map((act) => (
                    <button
                      key={`${msg.id}-${act.label}`}
                      type="button"
                      onClick={() => handleActionClick(act)}
                      className="px-2.5 py-1 rounded-md bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] text-[11px] font-semibold flex items-center gap-1 hover:bg-[#D5E6E1] transition-colors"
                    >
                      <span>{act.label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={feedEndRef} />
        </div>

        {/* Preset Quick Prompts & Input */}
        <div className="p-4 border-t border-[#E4E8EE] dark:border-[#263344] space-y-3 shrink-0 bg-white dark:bg-[#16202C]">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={streaming}
                onClick={() => askCoach(q)}
                className="px-2.5 py-1 rounded-md border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] hover:bg-[#E6F0ED] text-[11px] font-medium text-[#486581] dark:text-slate-300 text-left transition-colors"
              >
                {q}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setAssistantOpen(false);
                setActiveRoute('grammar');
              }}
              className="px-2.5 py-1 rounded-md border border-[#D5E6E1] dark:border-[#3C8D8A]/40 bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/15 text-[11px] font-semibold text-[#243B53] dark:text-[#E6F0ED] flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3 text-[#3C8D8A]" />
              <span>Analyze a Sentence</span>
            </button>
          </div>

          {error && (
            <p className="text-xs text-[#D65A5A]" role="alert">
              {error}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              askCoach(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your AI Coach anything..."
              aria-label="Ask Personal AI Coach"
              className="flex-1 px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40 focus:border-[#3C8D8A]"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              aria-label="Send question to AI Coach"
              className="px-3.5 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
            >
              {streaming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{streaming ? 'Streaming' : 'Ask'}</span>
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
