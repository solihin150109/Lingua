import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Compass,
  Loader2,
  Lock,
  Mic,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { ACHIEVEMENT_BADGES, GRAMMAR_TOPICS } from '../../lib/curriculum';
import { calculateMasteryPercentage } from '../../lib/spacedRepetition';
import type { LearningEvaluationReport, NavRoute } from '../../types/lingua';
import { PageHeader, useToast } from '../ui/ToastAndPrimitives';

export function ProgressTabs({ active }: { active: NavRoute }) {
  const { setActiveRoute } = useLingua();
  const tabs: { id: NavRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'analytics', label: 'Analytics Overview', icon: BarChart3 },
    { id: 'learning-path', label: 'Learning Path', icon: Compass },
    { id: 'daily-challenge', label: 'Daily Challenge', icon: Calendar },
    { id: 'review-vocabulary', label: 'Vocabulary Review', icon: RefreshCw },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E4E8EE] dark:border-[#263344] pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveRoute(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED]'
                : 'text-[#718096] dark:text-slate-400 hover:bg-white dark:hover:bg-[#16202C]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AchievementsView() {
  const { achievements, profile } = useLingua();
  const unlockedSet = new Set(achievements.map((a) => a.badgeKey));
  const xp = profile?.xpPoints || 0;
  const xpLevel = Math.floor(xp / 200) + 1;
  const xpIntoLevel = xp % 200;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achievements"
        subtitle="Consistent practice unlocks milestones across vocabulary mastery, grammar completion, and live speaking."
        action={
          <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-xs">
            <div className="font-semibold text-[#243447] dark:text-white">
              Learner Level {xpLevel} · <span className="font-mono tabular-nums">{xp} XP</span>
            </div>
            <div className="text-[#718096] font-mono tabular-nums mt-0.5">
              {200 - xpIntoLevel} XP to Level {xpLevel + 1}
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ACHIEVEMENT_BADGES.map((badge) => {
          const unlocked = unlockedSet.has(badge.key);
          return (
            <div
              key={badge.key}
              className={`p-5 rounded-xl border space-y-3 transition-colors ${
                unlocked
                  ? 'bg-white dark:bg-[#16202C] border-[#D6AD60]/60 dark:border-[#D6AD60]/40'
                  : 'bg-[#F7F8FA] dark:bg-[#16202C]/50 border-[#E4E8EE] dark:border-[#263344] opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <Award
                  className={`w-5 h-5 ${unlocked ? 'text-[#D6AD60]' : 'text-[#A0AEC0]'}`}
                />
                {unlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-[#39856A]" />
                ) : (
                  <Lock className="w-4 h-4 text-[#A0AEC0]" />
                )}
              </div>
              <div>
                <div className="font-semibold text-sm text-[#243447] dark:text-white">
                  {badge.title}
                </div>
                <p className="text-xs text-[#718096] dark:text-slate-400 mt-1 leading-relaxed">
                  {badge.description}
                </p>
              </div>
              <div className="text-[11px] font-mono text-[#718096]">{badge.requirementLabel}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AnalyticsView() {
  const {
    vocabulary,
    grammarProgress,
    progress,
    quizResults,
    speakingSessions,
    learnerMemory,
    learnerContext,
    saveEvaluationReport,
    setActiveRoute,
  } = useLingua();
  const { showToast } = useToast();
  const masteryPct = calculateMasteryPercentage(vocabulary);

  const [generatingEval, setGeneratingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const evaluationReport: LearningEvaluationReport | undefined = learnerMemory?.lastEvaluation;

  const counts = {
    New: vocabulary.filter((v) => v.masteryStatus === 'New').length,
    Learning: vocabulary.filter((v) => v.masteryStatus === 'Learning').length,
    Familiar: vocabulary.filter((v) => v.masteryStatus === 'Familiar').length,
    Mastered: vocabulary.filter((v) => v.masteryStatus === 'Mastered').length,
  };

  const completedGrammar = grammarProgress.filter((g) => g.completed).length;
  const avgQuizScore =
    quizResults.length > 0
      ? Math.round(quizResults.reduce((s, q) => s + q.score, 0) / quizResults.length)
      : 0;

  const handleGenerateEvaluation = async () => {
    setGeneratingEval(true);
    setEvalError(null);
    try {
      const res = await fetch('/api/ai/analytics/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerContext }),
      });
      const data: LearningEvaluationReport = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error || 'Failed.');
      await saveEvaluationReport(data);
      showToast('AI Learning Evaluation updated', 'success');
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'Unable to generate AI evaluation.');
    } finally {
      setGeneratingEval(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Progress"
        subtitle="Measured directly from your vocabulary reviews, grammar assessments, recorded speaking sessions, and audio checks."
        action={
          <button
            type="button"
            disabled={generatingEval}
            onClick={handleGenerateEvaluation}
            className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            {generatingEval ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#D6AD60]" />
            )}
            <span>{evaluationReport ? 'Refresh AI Evaluation' : 'Generate AI Evaluation'}</span>
          </button>
        }
      />

      <ProgressTabs active="analytics" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5">
          <div className="text-xs text-[#718096]">Vocabulary Mastery</div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white tabular-nums mt-1">
            {masteryPct}%
          </div>
          <div className="text-xs text-[#718096] mt-1 tabular-nums">
            {vocabulary.length} total words
          </div>
        </div>
        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5">
          <div className="text-xs text-[#718096]">Grammar Completion</div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white tabular-nums mt-1">
            {Math.round((completedGrammar / GRAMMAR_TOPICS.length) * 100)}%
          </div>
          <div className="text-xs text-[#718096] mt-1 tabular-nums">
            {completedGrammar} / {GRAMMAR_TOPICS.length} topics
          </div>
        </div>
        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5">
          <div className="text-xs text-[#718096]">Average Quiz Score</div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white tabular-nums mt-1">
            {avgQuizScore}%
          </div>
          <div className="text-xs text-[#718096] mt-1 tabular-nums">
            {quizResults.length} assessments
          </div>
        </div>
        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5">
          <div className="text-xs text-[#718096]">Total Speaking Time</div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white tabular-nums mt-1">
            {progress?.speakingMinutes || 0} min
          </div>
          <div className="text-xs text-[#718096] mt-1 tabular-nums">
            {speakingSessions.length} sessions · {learnerContext.pronunciationSamplesCount} audio checks
          </div>
        </div>
      </div>

      {/* AI Learning Evaluation Panel */}
      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#243447] dark:text-white">
              AI Learning Evaluation
            </h2>
            <p className="text-xs text-[#718096]">
              Transparent skill analysis grounded in your recorded sessions, quizzes, and audio checks.
            </p>
          </div>
          {evaluationReport && (
            <span className="text-[11px] font-mono text-[#718096]">
              Generated {new Date(evaluationReport.generatedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {evalError && (
          <div className="p-3 rounded-lg bg-[#FDF2F2] dark:bg-[#D65A5A]/15 text-xs text-[#9E3535] dark:text-rose-200">
            {evalError}
          </div>
        )}

        {!evaluationReport ? (
          <div className="p-5 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-[#243447] dark:text-white">
                Generate your diagnostic evaluation report
              </div>
              <p className="text-[#718096]">
                Inspect strengths, weak spots, recommended lessons, and verified speaking/pronunciation metrics.
              </p>
            </div>
            <button
              type="button"
              disabled={generatingEval}
              onClick={handleGenerateEvaluation}
              className="px-4 py-2 rounded-lg bg-[#3C8D8A] hover:bg-[#317572] text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {generatingEval ? 'Evaluating...' : 'Run AI Evaluation'}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 6 Transparent Skill Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: 'Vocabulary', score: evaluationReport.vocabularyScore },
                { label: 'Grammar', score: evaluationReport.grammarScore },
                { label: 'Sentence Construction', score: evaluationReport.sentenceScore },
                { label: 'Listening', score: evaluationReport.listeningScore },
                { label: 'Speaking Fluency', score: evaluationReport.speakingFluencyScore },
                { label: 'Pronunciation', score: evaluationReport.pronunciationScore },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#486581] dark:text-slate-300">
                      {metric.label}
                    </span>
                    {metric.score === null ? (
                      <span className="text-[11px] font-semibold text-[#D69E36]">
                        Requires recorded audio
                      </span>
                    ) : (
                      <span className="font-mono tabular-nums font-semibold text-[#243447] dark:text-white">
                        {metric.score}/100
                      </span>
                    )}
                  </div>
                  {metric.score !== null ? (
                    <div className="h-1.5 rounded-full bg-[#E4E8EE] dark:bg-[#263344] overflow-hidden">
                      <div
                        className="h-full bg-[#3C8D8A] rounded-full"
                        style={{ width: `${metric.score}%` }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveRoute('pronunciation')}
                      className="text-[11px] font-semibold text-[#3C8D8A] hover:underline flex items-center gap-1"
                    >
                      <Mic className="w-3 h-3" />
                      <span>Record audio in Pronunciation</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-xs text-[#718096]">
              {evaluationReport.audioEvidenceNote}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-[#E4E8EE] dark:border-[#263344] space-y-1.5">
                <div className="font-semibold text-[#39856A]">Strengths</div>
                <ul className="list-disc pl-4 space-y-1 text-[#243447] dark:text-slate-200">
                  {evaluationReport.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl border border-[#E4E8EE] dark:border-[#263344] space-y-1.5">
                <div className="font-semibold text-[#D69E36]">Areas to Improve</div>
                <ul className="list-disc pl-4 space-y-1 text-[#243447] dark:text-slate-200">
                  {[...evaluationReport.weaknesses, ...evaluationReport.areasToImprove]
                    .slice(0, 4)
                    .map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl border border-[#E4E8EE] dark:border-[#263344] space-y-1.5">
                <div className="font-semibold text-[#243B53] dark:text-[#66B2AF]">Next Goals</div>
                <ul className="list-disc pl-4 space-y-1 text-[#243447] dark:text-slate-200">
                  {evaluationReport.nextGoals.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>

            {evaluationReport.recommendedLessons.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#718096]">Recommended Lessons</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {evaluationReport.recommendedLessons.map((lesson, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveRoute(lesson.route)}
                      className="p-3.5 rounded-xl border border-[#E4E8EE] dark:border-[#263344] hover:border-[#3C8D8A] text-left space-y-1 transition-colors"
                    >
                      <div className="text-xs font-semibold text-[#243447] dark:text-white flex items-center justify-between gap-2">
                        <span>{lesson.title}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#3C8D8A] shrink-0" />
                      </div>
                      <p className="text-[11px] text-[#718096]">{lesson.reason}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vocabulary Mastery Breakdown */}
      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#243447] dark:text-white">
          Vocabulary Mastery Breakdown
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['New', 'Learning', 'Familiar', 'Mastered'] as const).map((status) => (
            <div
              key={status}
              className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344]"
            >
              <div className="text-xs text-[#718096]">{status}</div>
              <div className="text-xl font-mono tabular-nums font-semibold text-[#243447] dark:text-white mt-1">
                {counts[status]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Quiz History Table */}
      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#243447] dark:text-white">
          Assessment &amp; Quiz Log
        </h2>
        {quizResults.length === 0 ? (
          <p className="text-xs text-[#718096]">
            Complete a Grammar quiz, Listening exercise, or Sentence Builder to view score trends.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4E8EE] dark:border-[#263344] text-[#718096]">
                  <th className="py-2 pr-4 font-medium">Topic</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium text-right">Score</th>
                  <th className="py-2 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8EE] dark:divide-[#263344]">
                {quizResults.slice(0, 12).map((q) => (
                  <tr key={q.id} className="h-10">
                    <td className="pr-4 font-medium text-[#243447] dark:text-white">{q.topic}</td>
                    <td className="pr-4 text-[#718096]">{q.quizType}</td>
                    <td className="pr-4 text-right font-mono tabular-nums font-semibold text-[#3C8D8A]">
                      {q.score}%
                    </td>
                    <td className="text-right font-mono tabular-nums text-[#718096]">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
