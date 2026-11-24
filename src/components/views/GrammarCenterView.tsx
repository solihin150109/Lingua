import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookmarkPlus,
  Layers,
  Loader2,
  PenTool,
  Shuffle,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { BASIC_GRAMMAR_STRUCTURES, GRAMMAR_TOPICS } from '../../lib/curriculum';
import {
  GRAMMAR_BANK_150,
  SESSION_QUESTION_COUNT,
  TOTAL_BANK_SIZE,
  getSessionSlice,
} from '../../lib/hospitalityBanks';
import type {
  GrammarAnalysisResult,
  GrammarTransformResult,
} from '../../types/lingua';
import { PageHeader, useToast } from '../ui/ToastAndPrimitives';

const TRANSFORM_TENSES = [
  'Simple Present',
  'Present Continuous',
  'Simple Past',
  'Simple Future',
  'Present Perfect',
  'Modal Verbs',
  'Imperatives',
];

const BASIC_GRAMMAR_IDS = new Set(BASIC_GRAMMAR_STRUCTURES.map((g) => g.id));

export function GrammarCenterView() {
  const {
    profile,
    recordLearningInsight,
    learnerContext,
    focusedGrammarTopicId,
    setFocusedGrammarTopicId,
    sentences,
    vocabulary,
    speakText,
    globalSearch,
    navigateToSentenceBuilder,
    quizSessionSeed,
    rotateQuizSessionSeed,
  } = useLingua();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'basic' | 'quiz' | 'analyzer'>('basic');
  const [showAllReferenceTopics, setShowAllReferenceTopics] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    focusedGrammarTopicId || BASIC_GRAMMAR_STRUCTURES[0].id
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [bankFilterId, setBankFilterId] = useState<string>('all');
  const [bankAnswers, setBankAnswers] = useState<Record<string, number>>({});
  const [bankPage, setBankPage] = useState(0);

  // AI Grammar Analyzer state
  const [sentenceInput, setSentenceInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GrammarAnalysisResult | null>(null);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);
  const [targetTense, setTargetTense] = useState('Modal Verbs');
  const [transforming, setTransforming] = useState<string | null>(null);
  const [transformResult, setTransformResult] = useState<GrammarTransformResult | null>(null);

  useEffect(() => {
    if (focusedGrammarTopicId) {
      setSelectedTopicId(focusedGrammarTopicId);
      if (!BASIC_GRAMMAR_IDS.has(focusedGrammarTopicId)) {
        setShowAllReferenceTopics(true);
      }
      setViewMode('basic');
      setQuizAnswers({});
      setQuizSubmitted(false);
      setFocusedGrammarTopicId(null);
    }
  }, [focusedGrammarTopicId, setFocusedGrammarTopicId]);

  const filteredTopics = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    const pool = showAllReferenceTopics
      ? GRAMMAR_TOPICS
      : GRAMMAR_TOPICS.filter((t) => BASIC_GRAMMAR_IDS.has(t.id));

    return pool.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.summary.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [globalSearch, showAllReferenceTopics]);

  const activeTopic =
    GRAMMAR_TOPICS.find((t) => t.id === selectedTopicId) ||
    filteredTopics[0] ||
    GRAMMAR_TOPICS.find((t) => t.id === BASIC_GRAMMAR_STRUCTURES[0].id) ||
    GRAMMAR_TOPICS[0];

  const activeBasicMeta = BASIC_GRAMMAR_STRUCTURES.find((g) => g.id === activeTopic.id);

  // Match sentences from user's vocabulary that belong to this grammar
  const vocabById = useMemo(() => {
    const map = new Map<string, string>();
    vocabulary.forEach((v) => map.set(v.id, v.word));
    return map;
  }, [vocabulary]);

  const matchingUserSentences = useMemo(() => {
    const titleLower = activeTopic.title.toLowerCase();
    return sentences
      .filter((s) => s.tense.toLowerCase().includes(titleLower))
      .map((s) => ({
        ...s,
        wordLabel: vocabById.get(s.vocabId) || '',
      }))
      .slice(0, 6);
  }, [activeTopic.title, sentences, vocabById]);

  const sessionGrammarBank = useMemo(
    () => getSessionSlice(GRAMMAR_BANK_150, `${quizSessionSeed}:grammar`, SESSION_QUESTION_COUNT),
    [quizSessionSeed]
  );

  const visibleBankQuestions = useMemo(() => {
    if (bankFilterId === 'all') return sessionGrammarBank;
    return sessionGrammarBank.filter((q) => q.grammarId === bankFilterId);
  }, [bankFilterId, sessionGrammarBank]);

  const PAGE_SIZE = 5;
  const totalBankPages = Math.max(1, Math.ceil(visibleBankQuestions.length / PAGE_SIZE));
  const safeBankPage = Math.min(bankPage, totalBankPages - 1);
  const pagedBankQuestions = visibleBankQuestions.slice(
    safeBankPage * PAGE_SIZE,
    safeBankPage * PAGE_SIZE + PAGE_SIZE
  );
  const answeredCount = visibleBankQuestions.filter((q) => bankAnswers[q.id] !== undefined).length;
  const correctCount = visibleBankQuestions.filter(
    (q) => bankAnswers[q.id] === q.correctIndex
  ).length;

  const handleReshuffleGrammar = () => {
    rotateQuizSessionSeed();
    setBankAnswers({});
    setBankPage(0);
    showToast('30 soal grammar baru disiapkan', 'success', `Diacak dari ${TOTAL_BANK_SIZE} bank soal.`);
  };

  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    if (!BASIC_GRAMMAR_IDS.has(id)) {
      setShowAllReferenceTopics(true);
    }
    setQuizAnswers({});
    setQuizSubmitted(false);
    setViewMode('basic');
  };

  const handleCheckPractice = () => {
    setQuizSubmitted(true);
    const total = activeTopic.quiz.length;
    const correct = activeTopic.quiz.reduce(
      (acc, q) => (quizAnswers[q.id] === q.correctIndex ? acc + 1 : acc),
      0
    );
    showToast('Latihan diperiksa', 'success', `${correct} dari ${total} jawaban benar.`);
  };

  const handleAnalyzeSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sentenceInput.trim();
    if (!clean || analyzing) return;
    setAnalyzerError(null);
    setTransformResult(null);
    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai/grammar/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: clean,
          level: profile?.level || 'B1-B2',
          learnerContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not analyze sentence.');
      setAnalysis(data);
    } catch (err) {
      setAnalyzerError(err instanceof Error ? err.message : 'Grammar analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTransform = async (
    action: 'explain_words' | 'change_tense' | 'negative' | 'interrogative' | 'natural' | 'translate_id'
  ) => {
    const baseSentence = (analysis?.correctedSentence || sentenceInput).trim();
    if (!baseSentence || transforming) return;
    setTransforming(action);
    setAnalyzerError(null);
    try {
      const res = await fetch('/api/ai/grammar/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: baseSentence,
          action,
          targetTense: action === 'change_tense' ? targetTense : undefined,
          level: profile?.level || 'B1-B2',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not transform sentence.');
      setTransformResult(data);
    } catch (err) {
      setAnalyzerError(err instanceof Error ? err.message : 'Transformation failed.');
    } finally {
      setTransforming(null);
    }
  };

  const handleSaveInsight = async () => {
    if (!analysis) return;
    await recordLearningInsight({
      sourceModule: 'grammar-analyzer',
      mistakeOriginal: analysis.incorrectSentence || analysis.sentence,
      correction: analysis.correctedSentence,
      explanation: analysis.explanation,
      grammarTopicId: analysis.linkedGrammarTopicId,
    });
    showToast('Catatan grammar disimpan', 'success', 'Tersimpan untuk referensi belajar Anda.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="7 Grammar Dasar Waiter"
        subtitle="7 pola inti layanan hotel & restoran, rumus ringkas, contoh kosakata, dan 30 soal latihan per login (Bank 150)."
        action={
          <div className="inline-flex flex-wrap rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] p-1 gap-1">
            <button
              type="button"
              onClick={() => setViewMode('basic')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'basic'
                  ? 'bg-[#243B53] text-white'
                  : 'text-[#718096] dark:text-slate-300 hover:text-[#243447]'
              }`}
            >
              7 Grammar Dasar
            </button>
            <button
              type="button"
              onClick={() => setViewMode('quiz')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'quiz'
                  ? 'bg-[#243B53] text-white'
                  : 'text-[#718096] dark:text-slate-300 hover:text-[#243447]'
              }`}
            >
              Latihan 30 Soal
            </button>
            <button
              type="button"
              onClick={() => setViewMode('analyzer')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'analyzer'
                  ? 'bg-[#243B53] text-white'
                  : 'text-[#718096] dark:text-slate-300 hover:text-[#243447]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#3C8D8A]" />
              <span>AI Analyzer</span>
            </button>
          </div>
        }
      />

      {viewMode === 'quiz' ? (
        <div className="max-w-4xl space-y-5">
          <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                  Latihan Grammar Waiter ({visibleBankQuestions.length} Soal · Bank {TOTAL_BANK_SIZE})
                </h2>
                <p className="text-xs text-[#718096]">
                  Skor sesi: {correctCount} benar dari {answeredCount} dijawab · Klik pilihan untuk cek langsung.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReshuffleGrammar}
                className="px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] hover:bg-[#E6F0ED] text-xs font-semibold text-[#243447] dark:text-slate-200 flex items-center gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5 text-[#3C8D8A]" />
                <span>Acak 30 Soal Baru</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setBankFilterId('all');
                  setBankPage(0);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                  bankFilterId === 'all'
                    ? 'bg-[#243B53] border-[#243B53] text-white'
                    : 'border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300'
                }`}
              >
                Semua ({sessionGrammarBank.length})
              </button>
              {BASIC_GRAMMAR_STRUCTURES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setBankFilterId(g.id);
                    setBankPage(0);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                    bankFilterId === g.id
                      ? 'bg-[#243B53] border-[#243B53] text-white'
                      : 'border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {pagedBankQuestions.map((q, localIdx) => {
              const chosen = bankAnswers[q.id];
              const isAnswered = chosen !== undefined;
              const grammarLabel =
                BASIC_GRAMMAR_STRUCTURES.find((g) => g.id === q.grammarId)?.name || q.grammarId;
              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-[#3C8D8A]">
                      Soal {safeBankPage * PAGE_SIZE + localIdx + 1} · {grammarLabel}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-[#243447] dark:text-white">
                    {q.question}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => {
                      const isPicked = chosen === oIdx;
                      const isRight = oIdx === q.correctIndex;
                      let cls =
                        'border-[#E4E8EE] dark:border-[#263344] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]';
                      if (isAnswered) {
                        if (isRight) {
                          cls =
                            'border-[#39856A] bg-[#E6F0ED] dark:bg-[#39856A]/20 text-[#285E4B] dark:text-emerald-200';
                        } else if (isPicked) {
                          cls =
                            'border-[#D65A5A] bg-[#FDF2F2] dark:bg-[#D65A5A]/20 text-[#9E3535] dark:text-rose-200';
                        }
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setBankAnswers((prev) => ({ ...prev, [q.id]: oIdx }))
                          }
                          className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-colors ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {isAnswered && (
                    <p className="text-xs text-[#486581] dark:text-slate-300 bg-[#F7F8FA] dark:bg-[#1E2B3B] p-2.5 rounded-lg">
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl px-5 py-3 text-xs">
            <button
              type="button"
              disabled={safeBankPage === 0}
              onClick={() => setBankPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] font-semibold disabled:opacity-40"
            >
              ← Halaman Sebelumnya
            </button>
            <span className="font-mono text-[#718096]">
              Halaman {safeBankPage + 1} / {totalBankPages}
            </span>
            <button
              type="button"
              disabled={safeBankPage >= totalBankPages - 1}
              onClick={() => setBankPage((p) => Math.min(totalBankPages - 1, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-[#243B53] text-white font-semibold disabled:opacity-40"
            >
              Halaman Berikutnya →
            </button>
          </div>
        </div>
      ) : viewMode === 'analyzer' ? (
        <div className="space-y-6 max-w-5xl">
          <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                Cek &amp; Analisis Kalimat Waiter
              </h2>
              <p className="text-xs text-[#718096]">
                Tulis kalimat layanan tamu untuk melihat koreksi otomatis, pola grammar, dan ubahan tense.
              </p>
            </div>

            <form onSubmit={handleAnalyzeSentence} className="space-y-3">
              <label htmlFor="grammar-analyzer-input" className="sr-only">
                English sentence to analyze
              </label>
              <textarea
                id="grammar-analyzer-input"
                rows={3}
                value={sentenceInput}
                onChange={(e) => setSentenceInput(e.target.value)}
                placeholder='Contoh: "Yesterday I serve table five and bring the menu quickly."'
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40 focus:border-[#3C8D8A]"
              />
              {analyzerError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-[#FDF2F2] dark:bg-[#D65A5A]/15 border border-[#F5C6C6] dark:border-[#D65A5A]/30 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9E3535] dark:text-rose-200"
                >
                  <span>{analyzerError}</span>
                  <button
                    type="submit"
                    disabled={analyzing || !sentenceInput.trim()}
                    className="px-3 py-1 rounded-md bg-[#243B53] text-white font-semibold shrink-0 disabled:opacity-60"
                  >
                    Coba Analisis Ulang
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={analyzing || !sentenceInput.trim()}
                  className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  {analyzing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{analyzing ? 'Menganalisis...' : 'Analisis Grammar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSentenceInput('May I recommend our grilled salmon for you tonight?')
                  }
                  className="px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-medium text-[#718096] hover:text-[#243447] dark:hover:text-white"
                >
                  Coba Contoh Kalimat Waiter
                </button>
              </div>
            </form>
          </div>

          {analysis && (
            <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E8EE] dark:border-[#263344]">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      analysis.isCorrect
                        ? 'bg-[#E6F0ED] dark:bg-[#39856A]/20 text-[#285E4B] dark:text-emerald-200'
                        : 'bg-[#FDF2F2] dark:bg-[#D65A5A]/20 text-[#9E3535] dark:text-rose-200'
                    }`}
                  >
                    {analysis.isCorrect ? 'Grammatically Correct' : 'Needs Grammar Correction'}
                  </span>
                  <span className="text-xs font-mono text-[#718096]">
                    {analysis.tense} · {analysis.sentenceStructure}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {analysis.linkedGrammarTopicId && (
                    <button
                      type="button"
                      onClick={() => handleSelectTopic(analysis.linkedGrammarTopicId!)}
                      className="px-3 py-1.5 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>Buka Materi Grammar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveInsight}
                    className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] flex items-center gap-1.5"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-[#3C8D8A]" />
                    <span>Simpan Catatan</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-1">
                  <div className="text-xs font-semibold text-[#718096]">Kalimat Asli</div>
                  <div className="font-medium text-[#243447] dark:text-slate-100">
                    {analysis.incorrectSentence || analysis.sentence}
                  </div>
                  <div className="text-xs text-[#718096] pt-1">
                    Naturalness: {analysis.naturalness}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#E6F0ED]/50 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 space-y-1 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[#3C8D8A]">Kalimat yang Disarankan</div>
                    <div className="font-semibold text-[#243447] dark:text-white mt-0.5">
                      {analysis.correctedSentence}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakText(analysis.correctedSentence)}
                    aria-label="Listen to corrected sentence"
                    className="p-1.5 rounded-md text-[#3C8D8A] shrink-0"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                {[
                  { label: 'Subject', value: analysis.subject },
                  { label: 'Verb', value: analysis.verb },
                  { label: 'Object', value: analysis.object },
                  { label: 'Complement', value: analysis.complement },
                  { label: 'Adverbial', value: analysis.adverbial },
                ].map((part) => (
                  <div
                    key={part.label}
                    className="p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344]"
                  >
                    <div className="text-[11px] font-semibold text-[#718096]">{part.label}</div>
                    <div className="font-medium text-[#243447] dark:text-white mt-0.5">
                      {part.value || 'None'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-1.5 text-xs">
                <div className="font-semibold text-[#718096]">Pola &amp; Penjelasan</div>
                <div className="font-mono font-semibold text-[#3C8D8A]">
                  {analysis.grammarPattern}
                </div>
                <p className="text-sm text-[#243447] dark:text-slate-200 leading-relaxed">
                  {analysis.explanation}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E4E8EE] dark:border-[#263344] space-y-3">
                <div className="text-xs font-semibold text-[#718096]">
                  Ubah Bentuk Kalimat
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={Boolean(transforming)}
                    onClick={() => handleTransform('explain_words')}
                    className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] hover:bg-[#E6F0ED] text-xs font-semibold text-[#243447] dark:text-slate-200"
                  >
                    {transforming === 'explain_words' ? 'Memproses...' : 'Jelaskan Tiap Kata'}
                  </button>

                  <div className="inline-flex items-center gap-1 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] p-0.5">
                    <select
                      aria-label="Target tense for transformation"
                      value={targetTense}
                      onChange={(e) => setTargetTense(e.target.value)}
                      className="bg-transparent px-2 py-1 text-xs font-medium text-[#243447] dark:text-slate-200 focus:outline-none"
                    >
                      {TRANSFORM_TENSES.map((t) => (
                        <option key={t} value={t} className="dark:bg-[#16202C]">
                          {t}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={Boolean(transforming)}
                      onClick={() => handleTransform('change_tense')}
                      className="px-2.5 py-1 rounded-md bg-[#243B53] text-white text-xs font-semibold"
                    >
                      {transforming === 'change_tense' ? '...' : 'Ubah Tense'}
                    </button>
                  </div>

                  {(
                    [
                      { key: 'negative', label: 'Bentuk Negatif (-)' },
                      { key: 'interrogative', label: 'Bentuk Tanya (?)' },
                      { key: 'natural', label: 'Buat Lebih Natural' },
                      { key: 'translate_id', label: 'Terjemahkan (ID)' },
                    ] as const
                  ).map((btn) => (
                    <button
                      key={btn.key}
                      type="button"
                      disabled={Boolean(transforming)}
                      onClick={() => handleTransform(btn.key)}
                      className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] hover:bg-[#E6F0ED] text-xs font-semibold text-[#243447] dark:text-slate-200"
                    >
                      {transforming === btn.key ? 'Memproses...' : btn.label}
                    </button>
                  ))}
                </div>

                {transformResult && (
                  <div className="p-4 rounded-xl bg-[#E6F0ED]/50 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-semibold text-[#3C8D8A]">{transformResult.action}</div>
                        <div className="text-sm font-semibold text-[#243447] dark:text-white">
                          {transformResult.resultText}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakText(transformResult.resultText)}
                        aria-label="Listen to transformed sentence"
                        className="p-1.5 rounded-md bg-white/80 dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-[#3C8D8A] shrink-0"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[#486581] dark:text-slate-300 leading-relaxed">
                      {transformResult.explanation}
                    </p>
                    {transformResult.wordBreakdown && transformResult.wordBreakdown.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {transformResult.wordBreakdown.map((wb, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-white/80 dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344]"
                          >
                            <span className="font-semibold text-[#243447] dark:text-white">
                              {wb.word}
                            </span>{' '}
                            <span className="font-mono text-[11px] text-[#3C8D8A]">({wb.role})</span>
                            <div className="text-[#718096] mt-0.5">{wb.note}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {BASIC_GRAMMAR_STRUCTURES.map((g) => {
                const active = activeTopic.id === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectTopic(g.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-[#243B53] text-white'
                        : 'bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowAllReferenceTopics((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] text-xs font-semibold text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]"
            >
              {showAllReferenceTopics ? 'Sederhanakan (7 Dasar)' : `Topik Lain (${GRAMMAR_TOPICS.length})`}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Simple Grammar List */}
            <div className="lg:col-span-4 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl divide-y divide-[#E4E8EE] dark:divide-[#263344] max-h-[680px] overflow-y-auto">
              {filteredTopics.map((topic) => {
                const basicMeta = BASIC_GRAMMAR_STRUCTURES.find((g) => g.id === topic.id);
                const active = activeTopic.id === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleSelectTopic(topic.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      active
                        ? 'bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/15'
                        : 'hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
                    }`}
                  >
                    <div className="text-[11px] font-medium text-[#3C8D8A]">
                      {basicMeta ? basicMeta.shortLabel : topic.category}
                    </div>
                    <div className="text-sm font-semibold text-[#243447] dark:text-white truncate mt-0.5">
                      {topic.title}
                    </div>
                    <div className="text-[11px] font-mono text-[#718096] dark:text-slate-400 truncate mt-0.5">
                      {basicMeta ? basicMeta.formula : topic.formula}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Simplified Lesson Card */}
            <div className="lg:col-span-8 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#E4E8EE] dark:border-[#263344]">
                <div>
                  <div className="text-xs font-semibold text-[#3C8D8A] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{activeBasicMeta ? `Grammar Dasar · ${activeBasicMeta.shortLabel}` : activeTopic.category}</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-[#243447] dark:text-white mt-1">
                    {activeTopic.title}
                  </h2>
                  <p className="text-sm text-[#718096] dark:text-slate-400 mt-1">
                    {activeBasicMeta ? activeBasicMeta.explanationId : activeTopic.summary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigateToSentenceBuilder(undefined, activeTopic.title)}
                  className="px-3.5 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold flex items-center gap-2 shrink-0 transition-colors"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Latih Buat Kalimat</span>
                </button>
              </div>

              {/* Formula & Time Signal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344]">
                  <div className="text-[11px] font-semibold text-[#718096] uppercase tracking-wider mb-1">
                    Rumus Praktis
                  </div>
                  <div className="font-mono text-sm font-semibold text-[#243B53] dark:text-[#66B2AF]">
                    {activeBasicMeta ? activeBasicMeta.formula : activeTopic.formula}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344]">
                  <div className="text-[11px] font-semibold text-[#718096] uppercase tracking-wider mb-1">
                    Penanda Waktu / Konteks
                  </div>
                  <div className="text-sm font-medium text-[#243447] dark:text-slate-200">
                    {activeBasicMeta ? activeBasicMeta.whenToUseId : activeTopic.simpleExplanation}
                  </div>
                </div>
              </div>

              {/* Vocabulary Integration: Sentences Generated From User Vocabulary */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-[#718096]">
                    Kalimat dari Kosakata Anda ({vocabulary.length} kata tersimpan)
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigateToSentenceBuilder(undefined, activeTopic.title)}
                    className="text-xs font-semibold text-[#3C8D8A] hover:underline"
                  >
                    Buat kalimat sendiri →
                  </button>
                </div>
                {matchingUserSentences.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-xs text-[#718096]">
                    Tambahkan kosakata di menu Vocabulary untuk melihat kalimat {activeTopic.title} otomatis dari kata pilihan Anda.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {matchingUserSentences.map((s) => (
                      <div
                        key={s.id}
                        className="p-3.5 rounded-xl bg-[#E6F0ED]/50 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          {s.wordLabel && (
                            <span className="inline-block font-mono text-[11px] font-semibold text-[#3C8D8A] capitalize">
                              Kata: {s.wordLabel}
                            </span>
                          )}
                          <div className="text-sm font-semibold text-[#243447] dark:text-white">
                            {s.sentence}
                          </div>
                          <div className="text-[#486581] dark:text-slate-300">{s.translationId}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakText(s.sentence)}
                          aria-label={`Play sentence: ${s.sentence}`}
                          className="p-2 rounded-lg bg-white/80 dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-[#3C8D8A] shrink-0"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Examples */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-[#718096]">Contoh Sederhana &amp; Arti</h3>
                {activeTopic.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[#E4E8EE] dark:border-[#263344] flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-[#243447] dark:text-white">
                        {ex.english}
                      </div>
                      <div className="text-xs text-[#718096] dark:text-slate-400">{ex.indonesian}</div>
                      <div className="text-[11px] font-mono text-[#3C8D8A] pt-0.5">{ex.highlight}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakText(ex.english)}
                      aria-label={`Play example: ${ex.english}`}
                      className="p-2 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-[#3C8D8A] shrink-0"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Quick Self-Check Quiz (Optional, No Tracking/XP) */}
              <div className="pt-4 border-t border-[#E4E8EE] dark:border-[#263344] space-y-4">
                <h3 className="text-base font-semibold text-[#243447] dark:text-white">
                  Cek Pemahaman Singkat
                </h3>
                {activeTopic.quiz.map((q, qIdx) => (
                  <div key={q.id} className="space-y-2">
                    <div className="text-sm font-medium text-[#243447] dark:text-white">
                      {qIdx + 1}. {q.question}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const selected = quizAnswers[q.id] === optIdx;
                        const isCorrectOpt = optIdx === q.correctIndex;
                        let cls =
                          'border-[#E4E8EE] dark:border-[#263344] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]';
                        if (quizSubmitted) {
                          if (isCorrectOpt) {
                            cls =
                              'border-[#39856A] bg-[#E6F0ED] dark:bg-[#39856A]/20 text-[#285E4B] dark:text-emerald-200';
                          } else if (selected) {
                            cls =
                              'border-[#D65A5A] bg-[#FDF2F2] dark:bg-[#D65A5A]/20 text-[#9E3535] dark:text-rose-200';
                          }
                        } else if (selected) {
                          cls =
                            'border-[#3C8D8A] bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-white';
                        }

                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={quizSubmitted}
                            onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                            className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-colors ${cls}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {quizSubmitted && (
                      <p className="text-xs text-[#486581] dark:text-slate-300 bg-[#F7F8FA] dark:bg-[#1E2B3B] p-2.5 rounded-lg">
                        Penjelasan: {q.explanation}
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex items-center gap-3">
                  {!quizSubmitted ? (
                    <button
                      type="button"
                      onClick={handleCheckPractice}
                      className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold transition-colors"
                    >
                      Periksa Jawaban
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                      }}
                      className="px-4 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA]"
                    >
                      Ulangi Cek
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
