import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Compass, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { getTodayChallenge, GRAMMAR_TOPICS } from '../../lib/curriculum';
import type {
  AiDailyChallenge,
  NavRoute,
  PersonalizedLearningPath,
  SentenceEvaluation,
} from '../../types/lingua';
import { PageHeader, useToast } from '../ui/ToastAndPrimitives';
import { ProgressTabs } from './ProgressViews';

export function LearningPathView() {
  const {
    profile,
    vocabulary,
    grammarProgress,
    progress,
    learnerMemory,
    learnerContext,
    savePersonalizedPath,
    navigateToGrammarTopic,
    setActiveRoute,
  } = useLingua();
  const { showToast } = useToast();
  const level = profile?.level || 'B1-B2';
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiPath: PersonalizedLearningPath | undefined = learnerMemory?.personalizedPath;

  const baselineMilestones: {
    stage: string;
    title: string;
    description: string;
    focusReason: string;
    route: NavRoute;
    cta: string;
    priority: 'high' | 'medium' | 'normal';
    done?: boolean;
    grammarTopicId?: string;
  }[] = [
    {
      stage: 'Stage 01',
      title: 'Core Lexicon & Sentence Patterns',
      description: 'Add 10 active words and inspect their usage, collocations, and dialogues.',
      focusReason: `${vocabulary.length} / 10 active vocabulary words`,
      done: vocabulary.length >= 10,
      route: 'vocabulary',
      cta: 'Open Vocabulary',
      priority: vocabulary.length < 10 ? 'high' : 'normal',
    },
    {
      stage: 'Stage 02',
      title: learnerContext.weakGrammarTopics[0]
        ? `Strengthen ${learnerContext.weakGrammarTopics[0]}`
        : 'Foundational Grammar & Tenses',
      description: 'Complete structured grammar lessons and mastery quizzes aligned with your errors.',
      focusReason: `${grammarProgress.filter((g) => g.completed).length} / ${GRAMMAR_TOPICS.length} lessons completed`,
      done: grammarProgress.filter((g) => g.completed).length >= 5,
      route: 'grammar',
      cta: 'Study Grammar',
      priority: 'high',
    },
    {
      stage: 'Stage 03',
      title: 'Active Sentence Construction',
      description: 'Practice writing original sentences using your vocabulary with 5-axis AI coaching.',
      focusReason: 'Builds grammatical accuracy and native-like phrasing',
      route: 'sentence-builder',
      cta: 'Build Sentences',
      priority: 'medium',
    },
    {
      stage: 'Stage 04',
      title: 'Listening & Accent Calibration',
      description: `Train comprehension and record voice checks in ${profile?.preferredAccent || 'American'} English.`,
      focusReason: learnerContext.hasPronunciationAudioEvidence
        ? `${learnerContext.pronunciationSamplesCount} audio check(s) recorded`
        : 'Record 1 audio sample to unlock pronunciation scoring',
      route: 'pronunciation',
      cta: 'Practice Speaking',
      priority: learnerContext.hasPronunciationAudioEvidence ? 'normal' : 'high',
    },
    {
      stage: 'Stage 05',
      title: 'Live AI Tutor & Peer Speaking Rooms',
      description: 'Apply everything in real-time voice conversations with adaptive pacing.',
      focusReason: `${progress?.speakingMinutes || 0} / 30 speaking minutes completed`,
      done: (progress?.speakingMinutes || 0) >= 30,
      route: 'ai-tutor',
      cta: 'Open AI Tutor',
      priority: 'medium',
    },
  ];

  const handleGeneratePath = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/learning-path/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerContext }),
      });
      const data: PersonalizedLearningPath = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error || 'Failed.');
      await savePersonalizedPath(data);
      showToast('Personalized Learning Path updated', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate personalized path.');
    } finally {
      setGenerating(false);
    }
  };

  const stagesToRender = aiPath?.stages?.length ? aiPath.stages : baselineMilestones;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Learning Path"
        subtitle={`Adaptive progression tailored to your ${level} level, weak grammar topics, vocabulary mastery, and goals.`}
        action={
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex text-xs font-semibold text-[#3C8D8A] items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>Level {level}</span>
            </div>
            <button
              type="button"
              disabled={generating}
              onClick={handleGeneratePath}
              className="px-3.5 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#D6AD60]" />
              )}
              <span>{aiPath ? 'Refresh AI Path' : 'Personalize with AI'}</span>
            </button>
          </div>
        }
      />

      <ProgressTabs active="learning-path" />

      {error && (
        <div className="p-3 rounded-lg bg-[#FDF2F2] dark:bg-[#D65A5A]/15 border border-[#F5C6C6] text-xs text-[#9E3535] dark:text-rose-200">
          {error}
        </div>
      )}

      {aiPath && (
        <div className="bg-[#E6F0ED]/50 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5 max-w-3xl">
            <div className="font-semibold text-[#243B53] dark:text-white">
              AI Roadmap Summary
            </div>
            <p className="text-[#486581] dark:text-slate-300 leading-relaxed">{aiPath.summary}</p>
          </div>
          <span className="font-mono text-[11px] text-[#718096]">
            Updated {new Date(aiPath.generatedAt).toLocaleDateString()}
          </span>
        </div>
      )}

      <div className="space-y-3">
        {stagesToRender.map((m, idx) => (
          <div
            key={`${m.stage}-${idx}`}
            className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="text-xs font-mono text-[#718096] flex flex-wrap items-center gap-2">
                <span>{m.stage}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={`font-semibold ${
                    m.priority === 'high' ? 'text-[#3C8D8A]' : 'text-[#718096]'
                  }`}
                >
                  {m.priority.toUpperCase()} PRIORITY
                </span>
                {'done' in m && Boolean(m.done) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#39856A] font-semibold">Completed</span>
                  </>
                )}
              </div>
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">{m.title}</h2>
              <p className="text-sm text-[#718096] dark:text-slate-400">{m.description}</p>
              <div className="text-xs text-[#3C8D8A] font-medium pt-0.5">
                Why this fits you: {m.focusReason}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (m.route === 'grammar' && m.grammarTopicId) {
                  navigateToGrammarTopic(m.grammarTopicId);
                } else {
                  setActiveRoute(m.route);
                }
              }}
              className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center transition-colors"
            >
              <span>{m.cta}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const CHALLENGE_TYPES: { key: AiDailyChallenge['challengeType']; label: string }[] = [
  { key: 'sentence', label: 'Sentence' },
  { key: 'vocabulary', label: 'Vocabulary' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'speaking', label: 'Speaking' },
  { key: 'listening', label: 'Listening' },
];

export function DailyChallengeView() {
  const {
    dailyChallenges,
    completeTodayChallenge,
    profile,
    learnerMemory,
    learnerContext,
    saveAiDailyChallenge,
    speakText,
  } = useLingua();
  const { showToast } = useToast();

  const fallbackToday = getTodayChallenge();
  const savedChallenge = learnerMemory?.dailyChallenge;
  const activeChallenge: AiDailyChallenge =
    savedChallenge && savedChallenge.dateKey === fallbackToday.dateKey
      ? savedChallenge
      : {
          dateKey: fallbackToday.dateKey,
          challengeType: 'sentence',
          title: fallbackToday.title,
          prompt: fallbackToday.prompt,
          targetWords: fallbackToday.targetWords,
          hint: 'Aim for natural English phrasing and accurate verb tense.',
          xp: fallbackToday.xp,
        };

  const alreadyDone = dailyChallenges.some(
    (d) => d.dateKey === activeChallenge.dateKey && d.completed
  );

  const [preferredType, setPreferredType] =
    useState<AiDailyChallenge['challengeType']>('sentence');
  const [generating, setGenerating] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<SentenceEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateChallenge = async () => {
    setGenerating(true);
    setError(null);
    setEvaluation(null);
    try {
      const recentTitles = [
        activeChallenge.title,
        ...dailyChallenges.slice(-5).map((d) => d.title),
      ];
      const res = await fetch('/api/ai/daily-challenge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerContext,
          recentTitles,
          preferredType,
        }),
      });
      const data: AiDailyChallenge = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error || 'Failed.');
      await saveAiDailyChallenge(data);
      showToast('Fresh AI Daily Challenge ready', 'success', data.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate daily challenge.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseText.trim()) return;
    setError(null);
    setEvaluating(true);
    try {
      const res = await fetch('/api/ai/sentence-builder/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: activeChallenge.targetWords,
          difficulty: profile?.level || 'Intermediate',
          challengePrompt: activeChallenge.prompt,
          userSentence: responseText.trim(),
          learnerContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not evaluate challenge response.');
      setEvaluation(data);
      await completeTodayChallenge(activeChallenge.title, activeChallenge.xp);
      showToast('Daily Challenge completed', 'success', `+${activeChallenge.xp} XP awarded`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Daily Challenge"
        subtitle={`${activeChallenge.dateKey} · +${activeChallenge.xp} XP Reward · Type: ${activeChallenge.challengeType}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Challenge type"
              value={preferredType}
              onChange={(e) =>
                setPreferredType(e.target.value as AiDailyChallenge['challengeType'])
              }
              className="px-2.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] text-xs font-medium text-[#243447] dark:text-slate-200"
            >
              {CHALLENGE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateChallenge}
              className="px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] flex items-center gap-1.5"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3C8D8A]" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-[#3C8D8A]" />
              )}
              <span>Generate AI Challenge</span>
            </button>
          </div>
        }
      />

      <ProgressTabs active="daily-challenge" />

      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#3C8D8A] font-semibold">
              {activeChallenge.challengeType} challenge
            </div>
            <h2 className="text-lg font-semibold text-[#243447] dark:text-white">
              {activeChallenge.title}
            </h2>
          </div>
          {alreadyDone && (
            <span className="flex items-center gap-1 text-xs font-semibold text-[#39856A] whitespace-nowrap">
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed Today</span>
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-[#486581] dark:text-slate-300 leading-relaxed">
            {activeChallenge.prompt}
          </p>
          <button
            type="button"
            onClick={() => speakText(activeChallenge.prompt)}
            className="text-xs font-semibold text-[#3C8D8A] hover:underline shrink-0"
          >
            Listen
          </button>
        </div>
        <div className="text-xs text-[#718096]">
          Suggested focus words:{' '}
          <span className="font-mono font-semibold text-[#243447] dark:text-white">
            {activeChallenge.targetWords.join(' · ')}
          </span>
        </div>
        {activeChallenge.hint && (
          <div className="text-xs text-[#718096]">Coach hint: {activeChallenge.hint}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="daily-challenge-input"
              className="block text-xs font-medium text-[#486581] dark:text-slate-300 mb-1.5"
            >
              Your English Response
            </label>
            <textarea
              id="daily-challenge-input"
              rows={3}
              required
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Write your natural English response here..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FDF2F2] dark:bg-[#D65A5A]/15 border border-[#F5C6C6] text-xs text-[#9E3535] dark:text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={evaluating}
            className="px-4 py-2.5 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>{evaluating ? 'Evaluating with AI...' : 'Submit & Claim XP'}</span>
          </button>
        </form>
      </div>

      {evaluation && (
        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#243447] dark:text-white">AI Feedback</h3>
            <span className="font-mono tabular-nums text-sm font-semibold text-[#3C8D8A]">
              Score: {evaluation.correctnessScore}/100
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-[#243447] dark:text-slate-100">
              <span className="font-semibold">Polished Version:</span> {evaluation.correctedSentence}
            </p>
            <p className="text-[#486581] dark:text-slate-300">{evaluation.explanation}</p>
            {evaluation.nativeAlternatives?.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-[#718096] mb-1">
                  Native-like Alternatives
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[#243447] dark:text-slate-200">
                  {evaluation.nativeAlternatives.map((alt) => (
                    <li key={alt}>{alt}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
