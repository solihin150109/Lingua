import React, { useEffect, useRef, useState } from 'react';
import { Loader2, PenTool, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { mapMistakeToGrammarTopicId } from '../../lib/aiMemory';
import { BASIC_GRAMMAR_STRUCTURES } from '../../lib/curriculum';
import type { SentenceEvaluation } from '../../types/lingua';
import { PageHeader, useToast } from '../ui/ToastAndPrimitives';

export function SentenceBuilderView() {
  const {
    vocabulary,
    learnerContext,
    recordQuizResult,
    recordLearningInsight,
    setActiveRoute,
    speakText,
    focusedSentenceWord,
    setFocusedSentenceWord,
    focusedSentenceGrammar,
    setFocusedSentenceGrammar,
  } = useLingua();
  const { showToast } = useToast();

  const [selectedWords, setSelectedWords] = useState<string[]>(
    vocabulary.slice(0, 1).map((v) => v.word)
  );
  const [grammarFocus, setGrammarFocus] = useState<string>('');
  const [challenge, setChallenge] = useState<{
    scenarioTitle: string;
    challengePrompt: string;
    grammarHint: string;
    exampleTarget: string;
  } | null>(null);
  const [userSentence, setUserSentence] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<SentenceEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const didInitDefaultWordRef = useRef<boolean>(vocabulary.length > 0);

  useEffect(() => {
    if (!didInitDefaultWordRef.current && vocabulary.length > 0 && selectedWords.length === 0 && !focusedSentenceWord) {
      didInitDefaultWordRef.current = true;
      setSelectedWords([vocabulary[0].word]);
    }
  }, [focusedSentenceWord, selectedWords.length, vocabulary]);

  useEffect(() => {
    if (focusedSentenceWord) {
      setSelectedWords([focusedSentenceWord]);
      setFocusedSentenceWord(null);
      setEvaluation(null);
    }
  }, [focusedSentenceWord, setFocusedSentenceWord]);

  useEffect(() => {
    if (focusedSentenceGrammar) {
      setGrammarFocus(focusedSentenceGrammar);
      setFocusedSentenceGrammar(null);
      setEvaluation(null);
    }
  }, [focusedSentenceGrammar, setFocusedSentenceGrammar]);

  const activeGrammarInfo = BASIC_GRAMMAR_STRUCTURES.find((g) => g.name === grammarFocus);

  const toggleWord = (word: string) => {
    setSelectedWords((prev) =>
      prev.includes(word)
        ? prev.filter((w) => w !== word)
        : prev.length < 4
        ? [...prev, word]
        : prev
    );
  };

  const handleGenerateChallenge = async () => {
    setError(null);
    setEvaluation(null);
    setLoadingChallenge(true);
    try {
      const res = await fetch('/api/ai/sentence-builder/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: selectedWords,
          grammarFocus: grammarFocus || undefined,
          learnerContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate prompt.');
      setChallenge(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt.');
    } finally {
      setLoadingChallenge(false);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = userSentence.trim();
    if (!trimmed) return;
    setError(null);
    setEvaluating(true);
    try {
      const promptParts: string[] = [];
      if (challenge?.challengePrompt) {
        promptParts.push(challenge.challengePrompt);
      } else {
        if (selectedWords.length > 0) {
          promptParts.push(`Write a natural sentence using: ${selectedWords.join(', ')}`);
        } else {
          promptParts.push('Write a clear and natural everyday English sentence.');
        }
        if (grammarFocus) {
          promptParts.push(`Target grammar: ${grammarFocus}`);
        }
      }

      const res = await fetch('/api/ai/sentence-builder/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: selectedWords,
          grammarFocus: grammarFocus || undefined,
          challengePrompt: promptParts.join(' '),
          userSentence: trimmed,
          learnerContext,
        }),
      });
      const data: SentenceEvaluation = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as unknown as { error?: string }).error || 'Could not evaluate sentence.'
        );
      }
      setEvaluation(data);

      await recordQuizResult(
        'sentence-builder',
        `Sentence Builder (${grammarFocus || 'Free'}${selectedWords.length ? ` · ${selectedWords.join(', ')}` : ''})`,
        data.correctnessScore || 80,
        1
      );

      if (data.verdict === 'needs_correction') {
        await recordLearningInsight({
          sourceModule: 'sentence-builder',
          mistakeOriginal: trimmed,
          correction: data.correctedSentence,
          explanation: data.explanation,
          grammarTopicId: mapMistakeToGrammarTopicId(
            `${data.grammarAssessment} ${data.explanation}`
          ),
          vocabWord: selectedWords[0] || '',
        });
      }

      showToast('Kalimat diperiksa', 'success', `Skor kealamian & grammar: ${data.correctnessScore}/100`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleReviseRetry = () => {
    setEvaluation(null);
    textareaRef.current?.focus();
  };

  const verdictBadge = evaluation
    ? evaluation.verdict === 'natural'
      ? {
          label: 'Natural & Accurate',
          cls: 'bg-[#E6F0ED] dark:bg-[#39856A]/20 text-[#285E4B] dark:text-emerald-200',
        }
      : evaluation.verdict === 'correct_unnatural'
      ? {
          label: 'Grammatically Correct — Can Sound More Natural',
          cls: 'bg-[#E6F0ED]/70 dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED]',
        }
      : {
          label: 'Needs Correction',
          cls: 'bg-[#FDF6E7] dark:bg-[#D69E36]/20 text-[#7A5615] dark:text-amber-200',
        }
    : null;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Sentence Builder"
        subtitle="Susun kalimat layanan waiter bebas tanpa level. Pilih kata/pola 7 grammar dasar (opsional), lalu cek koreksi AI."
      />

      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-[#718096]">
              1. Pilih Kosakata Anda (Opsional, maksimal 4 kata)
            </div>
            {selectedWords.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedWords([])}
                className="text-xs font-medium text-[#718096] hover:text-[#243447] dark:hover:text-white"
              >
                Kosongkan pilihan (bebas tulis)
              </button>
            )}
          </div>
          {vocabulary.length === 0 ? (
            <div className="flex items-center gap-3 text-xs text-[#718096]">
              <span>Belum ada kosakata tersimpan—Anda tetap bisa langsung menulis kalimat di bawah.</span>
              <button
                type="button"
                onClick={() => setActiveRoute('vocabulary')}
                className="font-semibold text-[#3C8D8A] hover:underline"
              >
                Tambah Kosakata
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {vocabulary.slice(0, 24).map((v) => {
                const picked = selectedWords.includes(v.word);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleWord(v.word)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      picked
                        ? 'border-[#3C8D8A] bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] font-semibold'
                        : 'border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
                    }`}
                  >
                    {v.word}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2.5 pt-3 border-t border-[#E4E8EE] dark:border-[#263344]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#718096]">
              2. Fokus 7 Grammar Dasar (Opsional — Bebas Tanpa Level)
            </span>
            <button
              type="button"
              onClick={handleGenerateChallenge}
              disabled={loadingChallenge}
              className="px-3.5 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] flex items-center gap-2 transition-colors"
            >
              {loadingChallenge ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#3C8D8A]" />
              )}
              <span>{loadingChallenge ? 'Membuat Ide Kalimat...' : 'Beri Ide Situasi Kalimat'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGrammarFocus('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                grammarFocus === ''
                  ? 'bg-[#243B53] text-white font-semibold'
                  : 'bg-[#F7F8FA] dark:bg-[#1E2B3B] text-[#486581] dark:text-slate-300'
              }`}
            >
              Bebas (Free)
            </button>
            {BASIC_GRAMMAR_STRUCTURES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGrammarFocus(g.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  grammarFocus === g.name
                    ? 'bg-[#243B53] text-white font-semibold'
                    : 'bg-[#F7F8FA] dark:bg-[#1E2B3B] text-[#486581] dark:text-slate-300'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {activeGrammarInfo && (
            <div className="p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-[#3C8D8A]">{activeGrammarInfo.name}: </span>
                <span className="font-mono font-semibold text-[#243447] dark:text-white">
                  {activeGrammarInfo.formula}
                </span>
              </div>
              <span className="text-[#718096] dark:text-slate-400">
                {activeGrammarInfo.explanationId}
              </span>
            </div>
          )}
        </div>

        {challenge && (
          <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-1.5">
            <div className="text-xs font-semibold text-[#3C8D8A]">{challenge.scenarioTitle}</div>
            <div className="text-sm font-medium text-[#243447] dark:text-white">
              {challenge.challengePrompt}
            </div>
            <div className="text-xs text-[#718096]">Petunjuk: {challenge.grammarHint}</div>
          </div>
        )}

        <form onSubmit={handleEvaluate} className="space-y-3">
          <label
            htmlFor="sentence-builder-input"
            className="block text-xs font-semibold text-[#718096]"
          >
            3. Tulis Kalimat Bahasa Inggris Anda
          </label>
          <textarea
            ref={textareaRef}
            id="sentence-builder-input"
            rows={3}
            required
            value={userSentence}
            onChange={(e) => setUserSentence(e.target.value)}
            placeholder={
              selectedWords.length > 0
                ? `Tulis kalimat waiter menggunakan: ${selectedWords.join(', ')}${
                    grammarFocus ? ` (${grammarFocus})` : ''
                  } — cth: "May I recommend our grilled salmon tonight?"`
                : `Tulis kalimat layanan waiter${
                    grammarFocus ? ` dengan pola ${grammarFocus}` : ''
                  } — cth: "Would you like some sparkling water?"`
            }
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40 focus:border-[#3C8D8A]"
          />

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-[#FDF2F2] dark:bg-[#D65A5A]/15 border border-[#F5C6C6] dark:border-[#D65A5A]/40 flex flex-wrap items-center justify-between gap-3 text-xs text-[#9E3535] dark:text-rose-200"
            >
              <span>{error}</span>
              <button
                type="submit"
                disabled={evaluating || !userSentence.trim()}
                className="px-3 py-1.5 rounded-md bg-[#243B53] text-white font-semibold shrink-0 disabled:opacity-60"
              >
                Coba Periksa Ulang
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={evaluating || !userSentence.trim()}
            className="px-4 py-2.5 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{evaluating ? 'Memeriksa kalimat...' : 'Periksa Kalimat Saya'}</span>
          </button>
        </form>
      </div>

      {evaluation && (
        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                AI Sentence Coach Feedback
              </h2>
              {verdictBadge && (
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${verdictBadge.cls}`}>
                  {verdictBadge.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono tabular-nums text-sm font-semibold text-[#3C8D8A]">
                {evaluation.correctnessScore}/100
              </span>
              <button
                type="button"
                onClick={handleReviseRetry}
                className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#3C8D8A]" />
                <span>Revisi &amp; Coba Lagi</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#E6F0ED]/50 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs text-[#718096]">Kalimat yang Disarankan</div>
              <div className="text-base font-semibold text-[#243447] dark:text-white">
                {evaluation.correctedSentence}
              </div>
            </div>
            <button
              type="button"
              onClick={() => speakText(evaluation.correctedSentence)}
              aria-label="Listen to recommended sentence"
              className="p-1.5 rounded-md text-[#3C8D8A] shrink-0"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* 5-Axis Evaluation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-[#E4E8EE] dark:border-[#263344] space-y-1">
              <div className="font-semibold text-[#718096]">1. Grammar Assessment</div>
              <p className="text-[#243447] dark:text-slate-200 leading-relaxed">
                {evaluation.grammarAssessment}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-[#E4E8EE] dark:border-[#263344] space-y-1">
              <div className="font-semibold text-[#718096]">2. Vocabulary Usage</div>
              <p className="text-[#243447] dark:text-slate-200 leading-relaxed">
                {evaluation.vocabularyUsageAssessment}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-[#E4E8EE] dark:border-[#263344] space-y-1">
              <div className="font-semibold text-[#718096]">3. Sentence Structure</div>
              <p className="text-[#243447] dark:text-slate-200 leading-relaxed">
                {evaluation.sentenceStructureAssessment || 'Clear clause order.'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-[#E4E8EE] dark:border-[#263344] space-y-1">
              <div className="font-semibold text-[#718096]">4. Context Relevance</div>
              <p className="text-[#243447] dark:text-slate-200 leading-relaxed">
                {evaluation.contextRelevanceAssessment || 'Fits the requested context.'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-[#E4E8EE] dark:border-[#263344] space-y-1 md:col-span-2 lg:col-span-2">
              <div className="font-semibold text-[#718096]">5. Naturalness</div>
              <p className="text-[#243447] dark:text-slate-200 leading-relaxed">
                {evaluation.naturalnessAssessment}
              </p>
            </div>
          </div>

          <div className="text-sm text-[#486581] dark:text-slate-300">
            <span className="font-semibold text-[#243447] dark:text-white">Penjelasan:</span>{' '}
            {evaluation.explanation}
          </div>

          {evaluation.nativeAlternatives?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#718096]">
                Alternatif Ungkapan Natural
              </div>
              <div className="space-y-1.5 text-sm text-[#243447] dark:text-slate-200">
                {evaluation.nativeAlternatives.map((alt) => (
                  <div
                    key={alt}
                    className="px-3 py-2 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] flex items-center justify-between gap-2"
                  >
                    <span>{alt}</span>
                    <button
                      type="button"
                      onClick={() => speakText(alt)}
                      aria-label={`Listen to ${alt}`}
                      className="p-1.5 rounded-md text-[#3C8D8A] shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
