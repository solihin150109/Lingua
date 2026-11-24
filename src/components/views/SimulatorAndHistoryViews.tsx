import React, { useState } from 'react';
import {
  ArrowRight,
  BookmarkPlus,
  History,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { SIMULATOR_SCENARIOS } from '../../lib/curriculum';
import type { SpeakingSession, SpeakingSummaryReport, TranscriptEntry } from '../../types/lingua';
import { EmptyState, PageHeader, useToast } from '../ui/ToastAndPrimitives';

function ConversationPracticeHeader({ activeTab }: { activeTab: 'simulator' | 'speaking-history' }) {
  const { setActiveRoute } = useLingua();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roleplay Waiter Hotel & Restoran"
        subtitle="Simulasi melayani tamu hotel/restoran dan tinjau riwayat percakapan Anda."
      />
      <div className="flex items-center gap-1.5 border-b border-[#E4E8EE] dark:border-[#263344] pb-2">
        <button
          type="button"
          onClick={() => setActiveRoute('simulator')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'simulator'
              ? 'bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED]'
              : 'text-[#718096] dark:text-slate-400 hover:bg-white dark:hover:bg-[#16202C]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Roleplay Waiter</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveRoute('speaking-history')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'speaking-history'
              ? 'bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED]'
              : 'text-[#718096] dark:text-slate-400 hover:bg-white dark:hover:bg-[#16202C]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat Speaking</span>
        </button>
      </div>
    </div>
  );
}

export function ConversationSimulatorView() {
  const { profile, speakText, saveSpeakingSession } = useLingua();
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState(SIMULATOR_SCENARIOS[0].id);
  const scenario =
    SIMULATOR_SCENARIOS.find((s) => s.id === selectedId) || SIMULATOR_SCENARIOS[0];

  const [messages, setMessages] = useState<TranscriptEntry[]>([
    {
      id: 'sim-0',
      speaker: scenario.aiRole,
      text: scenario.starterLine,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [evaluation, setEvaluation] = useState<{
    overallSummary: string;
    strengths: string[];
    improvements: string[];
    suggestedExpressions: string[];
    readinessScore: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);

  const handleSelectScenario = (id: string) => {
    const next = SIMULATOR_SCENARIOS.find((s) => s.id === id) || SIMULATOR_SCENARIOS[0];
    setSelectedId(id);
    setEvaluation(null);
    setError(null);
    setLastFailedInput(null);
    setMessages([
      {
        id: `sim-${id}-0`,
        speaker: next.aiRole,
        text: next.starterLine,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const sendMessageText = async (clean: string, isRetry = false) => {
    if (!clean || sending) return;
    setError(null);
    setLastFailedInput(null);
    if (!isRetry) {
      setInput('');
    }

    const userMsg: TranscriptEntry = {
      id: `u-${Date.now()}`,
      speaker: scenario.userRole,
      text: clean,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = isRetry ? messages : [...messages, userMsg];
    if (!isRetry) {
      setMessages(nextHistory);
    }
    setSending(true);

    try {
      const res = await fetch('/api/ai/simulator/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioTitle: scenario.title,
          aiRole: scenario.aiRole,
          userRole: scenario.userRole,
          context: scenario.context,
          level: profile?.level || 'B1-B2',
          history: nextHistory.map((m) => ({ speaker: m.speaker, text: m.text })),
          userMessage: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Simulation response failed.');

      const aiMsg: TranscriptEntry = {
        id: `ai-${Date.now()}`,
        speaker: scenario.aiRole,
        text: data.reply,
        translationId: data.translationId,
        naturalAlternative: data.coachingTip,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakText(data.reply);
    } catch (err) {
      setLastFailedInput(clean);
      setError(err instanceof Error ? err.message : 'Unable to continue simulation.');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = input.trim();
    if (!clean) return;
    await sendMessageText(clean);
  };

  const handleFinishAndEvaluate = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/ai/simulator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioTitle: scenario.title,
          level: profile?.level || 'B1-B2',
          history: messages.map((m) => ({ speaker: m.speaker, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not evaluate simulation.');
      setEvaluation(data);
      await saveSpeakingSession({
        sessionType: 'simulator',
        topic: scenario.title,
        durationSeconds: Math.max(60, messages.length * 25),
        summaryText: data.overallSummary,
        transcript: messages,
      });
      showToast('Simulation evaluated & saved', 'success', `Readiness: ${data.readinessScore}/100`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <ConversationPracticeHeader activeTab="simulator" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Scenario Picker */}
        <div className="lg:col-span-4 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl divide-y divide-[#E4E8EE] dark:divide-[#263344] overflow-hidden">
          {SIMULATOR_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => handleSelectScenario(sc.id)}
              className={`w-full text-left p-4 transition-colors ${
                sc.id === scenario.id
                  ? 'bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/15'
                  : 'hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
              }`}
            >
              <div className="text-sm font-semibold text-[#243447] dark:text-white">{sc.title}</div>
              <div className="text-xs text-[#718096] mt-0.5">
                {sc.subtitle} · Role: {sc.userRole}
              </div>
            </button>
          ))}
        </div>

        {/* Roleplay Chat */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 flex flex-col h-[500px]">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#E4E8EE] dark:border-[#263344]">
              <div>
                <div className="text-xs font-semibold text-[#3C8D8A]">
                  Your Role: {scenario.userRole} · Partner: {scenario.aiRole}
                </div>
                <div className="font-semibold text-base text-[#243447] dark:text-white mt-0.5">
                  {scenario.title}
                </div>
                <p className="text-xs text-[#718096] mt-0.5">{scenario.context}</p>
              </div>
              <button
                type="button"
                disabled={sending || messages.length < 2}
                onClick={handleFinishAndEvaluate}
                className="px-3.5 py-2 rounded-lg bg-[#3C8D8A] hover:bg-[#317572] disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
              >
                Finish &amp; Evaluate
              </button>
            </div>

            {error && (
              <div className="mt-2 p-2.5 rounded-lg bg-[#FDF2F2] dark:bg-[#D65A5A]/15 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9E3535] dark:text-rose-200">
                <span>{error}</span>
                {lastFailedInput && (
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => void sendMessageText(lastFailedInput, true)}
                    className="px-2.5 py-1 rounded bg-[#243B53] text-white font-semibold shrink-0"
                  >
                    Coba Lagi
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {messages.map((m) => {
                const isAI = m.speaker === scenario.aiRole;
                return (
                  <div key={m.id} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-sm space-y-1 ${
                        isAI
                          ? 'bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-[#243447] dark:text-slate-100'
                          : 'bg-[#243B53] text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[11px] opacity-75">
                        <span className="font-semibold">{m.speaker}</span>
                        {isAI && (
                          <button
                            type="button"
                            onClick={() => speakText(m.text)}
                            aria-label="Play audio"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p>{m.text}</p>
                      {m.translationId && (
                        <p className="text-xs opacity-75">ID: {m.translationId}</p>
                      )}
                    </div>
                    {m.naturalAlternative && (
                      <div className="mt-1 text-xs text-[#718096]">Tip: {m.naturalAlternative}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleSend}
              className="pt-3 border-t border-[#E4E8EE] dark:border-[#263344] flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Respond as ${scenario.userRole}...`}
                className="flex-1 px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40"
              />
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>

          {evaluation && (
            <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[#243447] dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#3C8D8A]" />
                  <span>Simulation Evaluation</span>
                </h3>
                <span className="font-mono tabular-nums font-semibold text-[#3C8D8A]">
                  {evaluation.readinessScore}/100
                </span>
              </div>
              <p className="text-[#486581] dark:text-slate-300">{evaluation.overallSummary}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div>
                  <div className="font-semibold text-[#39856A] mb-1">Strengths</div>
                  <ul className="list-disc pl-4 space-y-1 text-[#243447] dark:text-slate-200">
                    {evaluation.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-[#D69E36] mb-1">To Improve</div>
                  <ul className="list-disc pl-4 space-y-1 text-[#243447] dark:text-slate-200">
                    {evaluation.improvements.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {evaluation.suggestedExpressions && evaluation.suggestedExpressions.length > 0 && (
                <div className="pt-2 border-t border-[#E4E8EE] dark:border-[#263344] space-y-1.5 text-xs">
                  <div className="font-semibold text-[#3C8D8A]">Useful Expressions for Next Time</div>
                  <div className="flex flex-wrap gap-2">
                    {evaluation.suggestedExpressions.map((exp) => (
                      <button
                        key={exp}
                        type="button"
                        onClick={() => speakText(exp)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] hover:border-[#3C8D8A] text-left text-[#243447] dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#3C8D8A] shrink-0" />
                        <span>{exp}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SpeakingHistoryView() {
  const {
    speakingSessions,
    setActiveRoute,
    saveWordFromAnywhere,
    navigateToGrammarTopic,
    openAssistantWithPrompt,
  } = useLingua();
  const { showToast } = useToast();

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [reportsBySession, setReportsBySession] = useState<Record<string, SpeakingSummaryReport>>({});

  const handleAnalyzeSession = async (session: SpeakingSession) => {
    setAnalyzingId(session.id);
    try {
      const res = await fetch('/api/ai/speaking-guide/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: session.topic,
          durationSeconds: session.durationSeconds,
          transcript: [
            {
              speaker: 'Session Notes',
              text: session.summaryText || `Conversation practice on ${session.topic}`,
            },
          ],
        }),
      });
      const data: SpeakingSummaryReport = await res.json();
      if (!res.ok) {
        throw new Error((data as unknown as { error?: string }).error || 'Analysis failed.');
      }
      setReportsBySession((prev) => ({ ...prev, [session.id]: data }));
    } catch (err) {
      showToast(
        'Could not analyze session',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ConversationPracticeHeader activeTab="speaking-history" />

      {speakingSessions.length === 0 ? (
        <EmptyState
          icon={<History className="w-5 h-5" />}
          title="Belum ada riwayat speaking"
          description="Mulai sesi di Speaking Partner (Script) atau Roleplay Waiter untuk melihat riwayat latihan Anda di sini."
          action={
            <button
              type="button"
              onClick={() => setActiveRoute('speaking-community')}
              className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold"
            >
              Buka Speaking Partner
            </button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl divide-y divide-[#E4E8EE] dark:divide-[#263344]">
          {speakingSessions.map((session) => {
            const report = reportsBySession[session.id];
            return (
              <div key={session.id} className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-[#718096]">
                      {session.sessionType} · {new Date(session.createdAt).toLocaleString()}
                    </div>
                    <div className="font-semibold text-base text-[#243447] dark:text-white">
                      {session.topic}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-mono tabular-nums text-[#486581] dark:text-slate-300">
                      {Math.max(1, Math.round(session.durationSeconds / 60))} min
                      {session.rating ? ` · Rating ${session.rating}/5` : ''}
                    </div>
                    <button
                      type="button"
                      disabled={analyzingId === session.id}
                      onClick={() => handleAnalyzeSession(session)}
                      className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] flex items-center gap-1.5"
                    >
                      {analyzingId === session.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3C8D8A]" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-[#3C8D8A]" />
                      )}
                      <span>Analyze Conversation</span>
                    </button>
                  </div>
                </div>
                {session.summaryText && (
                  <p className="text-xs text-[#718096] dark:text-slate-400 leading-relaxed">
                    {session.summaryText}
                  </p>
                )}

                {report && (
                  <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-3 text-xs">
                    <p className="text-[#243447] dark:text-slate-100 leading-relaxed">
                      {report.summary || report.speakingPerformance}
                    </p>

                    {report.newVocabulary && report.newVocabulary.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {report.newVocabulary.map((nv) => (
                          <button
                            key={nv.word}
                            type="button"
                            onClick={async () => {
                              await saveWordFromAnywhere(nv.word);
                              showToast(`Saved "${nv.word}"`, 'success');
                            }}
                            className="px-2.5 py-1 rounded-md bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-[#243447] dark:text-slate-200 flex items-center gap-1.5"
                          >
                            <BookmarkPlus className="w-3 h-3 text-[#3C8D8A]" />
                            <span>Save "{nv.word}"</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          navigateToGrammarTopic(report.linkedGrammarTopicIds?.[0] || 'simple-past')
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] font-semibold flex items-center gap-1"
                      >
                        <span>Review Grammar</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openAssistantWithPrompt(
                            `Help me practice mistakes and expressions from my "${session.topic}" session.`
                          )
                        }
                        className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] font-semibold"
                      >
                        Practice Mistakes
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveRoute(
                            session.sessionType === 'community'
                              ? 'speaking-community'
                              : 'simulator'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#243B53] text-white font-semibold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Repeat Conversation</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
