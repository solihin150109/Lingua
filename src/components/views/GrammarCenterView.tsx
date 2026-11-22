import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookmarkPlus,
  CheckCircle2,
  Layers,
  Loader2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { GRAMMAR_TOPICS } from '../../lib/curriculum';
import type {
  GrammarAnalysisResult,
  GrammarTopic,
  GrammarTransformResult,
} from '../../types/lingua';
import { PageHeader, useToast } from '../ui/ToastAndPrimitives';

const TRANSFORM_TENSES = [
  'Simple Present',
  'Simple Past',
  'Present Perfect',
  'Past Continuous',
  'Simple Future',
  'Passive Voice',
];

export function GrammarCenterView() {
  const {
    profile,
    grammarProgress,
    completeGrammarLesson,
    recordQuizResult,
    recordLearningInsight,
    learnerContext,
    focusedGrammarTopicId,
    setFocusedGrammarTopicId,
    sentences,
    vocabulary,
    speakText,
    globalSearch,
  } = useLingua();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'lessons' | 'analyzer'>('lessons');
  const [categoryFilter, setCategoryFilter] = useState<'All' | GrammarTopic['category']>('All');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    focusedGrammarTopicId || GRAMMAR_TOPICS[0].id
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // AI Grammar Analyzer state
  const [sentenceInput, setSentenceInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GrammarAnalysisResult | null>(null);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);
  const [targetTense, setTargetTense] = useState('Present Perfect');
  const [transforming, setTransforming] = useState<string | null>(null);
  const [transformResult, setTransformResult] = useState<GrammarTransformResult | null>(null);

  useEffect(() => {
    if (focusedGrammarTopicId) {
      setSelectedTopicId(focusedGrammarTopicId);
      setViewMode('lessons');
      setQuizAnswers({});
      setQuizSubmitted(false);
      setFocusedGrammarTopicId(null);
    }
  }, [focusedGrammarTopicId, setFocusedGrammarTopicId]);

  const filteredTopics = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return GRAMMAR_TOPICS.filter((t) => {
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.summary.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, globalSearch]);

  const activeTopic =
    GRAMMAR_TOPICS.find((t) => t.id === selectedTopicId) || filteredTopics[0] || GRAMMAR_TOPICS[0];
  const topicStatus = grammarProgress.find((g) => g.topicId === activeTopic.id);

  const matchingUserSentences = useMemo(() => {
    const titleLower = activeTopic.title.toLowerCase();
    return sentences.filter((s) => s.tense.toLowerCase().includes(titleLower)).slice(0, 3);
  }, [activeTopic.title, sentences]);

  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setViewMode('lessons');
  };

  const handleSubmitQuiz = async () => {
    setQuizSubmitted(true);
    const total = activeTopic.quiz.length;
    const correct = activeTopic.quiz.reduce(
      (acc, q) => (quizAnswers[q.id] === q.correctIndex ? acc + 1 : acc),
      0
    );
    const pct = total > 0 ? Math.round((correct / total) * 100) : 100;
    await completeGrammarLesson(activeTopic.id, activeTopic.category, pct);
    await recordQuizResult('grammar', activeTopic.title, pct, total);
    showToast(`${activeTopic.title} completed`, 'success', `Quiz score: ${pct}% (+25 XP)`);
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
    showToast('Grammar insight saved', 'success', 'Added to your Learner Memory for personalized coaching.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grammar"
        subtitle="29 structured lessons across Basic Grammar, all 12 Tenses, and Advanced Grammar—plus an AI Grammar Analyzer for any English sentence."
        action={
          <div className="inline-flex rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] p-1">
            <button
              type="button"
              onClick={() => setViewMode('lessons')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'lessons'
                  ? 'bg-[#243B53] text-white'
                  : 'text-[#718096] dark:text-slate-300 hover:text-[#243447]'
              }`}
            >
              Grammar Lessons
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
              <span>AI Grammar Analyzer</span>
            </button>
          </div>
        }
      />

      {viewMode === 'analyzer' ? (
        <div className="space-y-6 max-w-5xl">
          <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                Sentence Structure &amp; Grammar Analyzer
              </h2>
              <p className="text-xs text-[#718096]">
                Paste or write any English sentence to inspect Subject, Verb, Object, Tense,
                naturalness, and 1-click transformations.
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
                placeholder='Example: "Yesterday I go to the office for discuss the new project with my manager."'
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40 focus:border-[#3C8D8A]"
              />
              {analyzerError && (
                <p className="text-xs text-[#D65A5A]" role="alert">
                  {analyzerError}
                </p>
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
                  <span>{analyzing ? 'Analyzing...' : 'Analyze Grammar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSentenceInput('Yesterday I go to the office and finish my report quickly.')
                  }
                  className="px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-medium text-[#718096] hover:text-[#243447] dark:hover:text-white"
                >
                  Try Sample Sentence
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
                      <span>Open Matching Lesson</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveInsight}
                    className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] flex items-center gap-1.5"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-[#3C8D8A]" />
                    <span>Save Insight</span>
                  </button>
                </div>
              </div>

              {/* Correction Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-1">
                  <div className="text-xs font-semibold text-[#718096]">Original Input</div>
                  <div className="font-medium text-[#243447] dark:text-slate-100">
                    {analysis.incorrectSentence || analysis.sentence}
                  </div>
                  <div className="text-xs text-[#718096] pt-1">
                    Naturalness: {analysis.naturalness}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#E6F0ED]/50 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 space-y-1 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[#3C8D8A]">Recommended Sentence</div>
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

              {/* Clause Part Breakdown */}
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
                <div className="font-semibold text-[#718096]">Pattern &amp; Explanation</div>
                <div className="font-mono font-semibold text-[#3C8D8A]">
                  {analysis.grammarPattern}
                </div>
                <p className="text-sm text-[#243447] dark:text-slate-200 leading-relaxed">
                  {analysis.explanation}
                </p>
              </div>

              {analysis.additionalExamples?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#718096]">
                    More Sentences Using This Pattern
                  </div>
                  <ul className="space-y-1.5 text-sm text-[#243447] dark:text-slate-200 list-disc pl-5">
                    {analysis.additionalExamples.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 6 Interactive Sentence Transformations */}
              <div className="pt-4 border-t border-[#E4E8EE] dark:border-[#263344] space-y-3">
                <div className="text-xs font-semibold text-[#718096]">
                  Interactive Sentence Transformations
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={Boolean(transforming)}
                    onClick={() => handleTransform('explain_words')}
                    className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] hover:bg-[#E6F0ED] text-xs font-semibold text-[#243447] dark:text-slate-200"
                  >
                    {transforming === 'explain_words' ? 'Working...' : 'Explain Every Word'}
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
                      {transforming === 'change_tense' ? '...' : 'Change Tense'}
                    </button>
                  </div>

                  {(
                    [
                      { key: 'negative', label: 'Convert to Negative' },
                      { key: 'interrogative', label: 'Convert to Interrogative' },
                      { key: 'natural', label: 'Make It More Natural' },
                      { key: 'translate_id', label: 'Translate to Indonesian' },
                    ] as const
                  ).map((btn) => (
                    <button
                      key={btn.key}
                      type="button"
                      disabled={Boolean(transforming)}
                      onClick={() => handleTransform(btn.key)}
                      className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] hover:bg-[#E6F0ED] text-xs font-semibold text-[#243447] dark:text-slate-200"
                    >
                      {transforming === btn.key ? 'Working...' : btn.label}
                    </button>
                  ))}
                </div>

                {transformResult && (
                  <div className="p-4 rounded-xl bg-[#E6F0ED]/50 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 space-y-2.5 text-xs">
                    <div className="font-semibold text-[#3C8D8A]">{transformResult.action}</div>
                    <div className="text-sm font-semibold text-[#243447] dark:text-white">
                      {transformResult.resultText}
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
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {(['All', 'Basic Grammar', 'Tenses', 'Advanced Grammar'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-[#243B53] text-white'
                    : 'bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Clean Syllabus Sidebar */}
            <div className="lg:col-span-4 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl divide-y divide-[#E4E8EE] dark:divide-[#263344] max-h-[680px] overflow-y-auto">
              {filteredTopics.map((topic) => {
                const done = grammarProgress.some((g) => g.topicId === topic.id && g.completed);
                const active = activeTopic.id === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleSelectTopic(topic.id)}
                    className={`w-full text-left px-4 py-3.5 flex items-center justify-between gap-2 transition-colors ${
                      active
                        ? 'bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/15'
                        : 'hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-[#718096]">{topic.category}</div>
                      <div className="text-sm font-semibold text-[#243447] dark:text-white truncate">
                        {topic.title}
                      </div>
                    </div>
                    {done && <CheckCircle2 className="w-4 h-4 text-[#39856A] shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Centered Lesson Material Reader */}
            <div className="lg:col-span-8 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#E4E8EE] dark:border-[#263344]">
                <div>
                  <div className="text-xs font-semibold text-[#3C8D8A] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{activeTopic.category}</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-[#243447] dark:text-white mt-1">
                    {activeTopic.title}
                  </h2>
                  <p className="text-sm text-[#718096] dark:text-slate-400 mt-1">
                    {activeTopic.summary}
                  </p>
                </div>
                {topicStatus?.completed && (
                  <div className="text-xs font-semibold text-[#39856A] font-mono tabular-nums">
                    Completed · Best {topicStatus.quizScore}%
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-[#718096]">Explanation</h3>
                <p className="text-sm text-[#243447] dark:text-slate-200 leading-relaxed">
                  {activeTopic.simpleExplanation}
                </p>
              </div>

              {/* Clear Visual Formula Box */}
              <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344]">
                <div className="text-[11px] font-semibold text-[#718096] uppercase tracking-wider mb-1">
                  Grammar Formula
                </div>
                <div className="font-mono text-sm font-semibold text-[#243B53] dark:text-[#66B2AF]">
                  {activeTopic.formula}
                </div>
              </div>

              {/* Examples */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-[#718096]">Examples &amp; Translations</h3>
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

              {/* Personal Vocabulary Integration */}
              {matchingUserSentences.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#718096]">
                    From Your Vocabulary ({vocabulary.length} words)
                  </h3>
                  <div className="space-y-2">
                    {matchingUserSentences.map((s) => (
                      <div
                        key={s.id}
                        className="p-3.5 rounded-xl bg-[#E6F0ED]/50 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 text-xs space-y-0.5"
                      >
                        <div className="font-semibold text-[#243447] dark:text-white">
                          {s.sentence}
                        </div>
                        <div className="text-[#486581] dark:text-slate-300">{s.translationId}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Common Mistakes */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[#718096]">Common Mistakes</h3>
                {activeTopic.commonMistakes.map((cm, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#FDF2F2]/60 dark:bg-[#D65A5A]/10 border border-[#F5C6C6] dark:border-[#D65A5A]/30 text-xs space-y-1"
                  >
                    <div className="text-[#9E3535] dark:text-rose-300">
                      <span className="font-semibold">Avoid:</span> {cm.incorrect}
                    </div>
                    <div className="text-[#285E4B] dark:text-emerald-300">
                      <span className="font-semibold">Use instead:</span> {cm.correct}
                    </div>
                    <div className="text-[#486581] dark:text-slate-300">{cm.why}</div>
                  </div>
                ))}
              </div>

              {/* Interactive Quiz */}
              <div className="pt-4 border-t border-[#E4E8EE] dark:border-[#263344] space-y-4">
                <h3 className="text-base font-semibold text-[#243447] dark:text-white">
                  Interactive Practice Quiz
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
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex items-center gap-3">
                  {!quizSubmitted ? (
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold transition-colors"
                    >
                      Submit &amp; Complete Lesson
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
                      Retake Quiz
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
