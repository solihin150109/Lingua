import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Calendar,
  Flame,
  Layers,
  Mic,
  Play,
  Sparkles,
  Users,
  Volume2,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { getTodayChallenge, GRAMMAR_TOPICS } from '../../lib/curriculum';
import { mapMistakeToGrammarTopicId } from '../../lib/aiMemory';
import { calculateMasteryPercentage } from '../../lib/spacedRepetition';
import type { NavRoute } from '../../types/lingua';

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardView() {
  const {
    profile,
    progress,
    vocabulary,
    grammarProgress,
    dailyChallenges,
    learnerContext,
    learningInsights,
    setActiveRoute,
    navigateToGrammarTopic,
    openAssistantWithPrompt,
    speakText,
  } = useLingua();

  const totalVocab = vocabulary.length;
  const masteredVocab = vocabulary.filter((v) => v.masteryStatus === 'Mastered').length;
  const masteryPct = calculateMasteryPercentage(vocabulary);
  const completedGrammar = grammarProgress.filter((g) => g.completed).length;
  const speakingMins = progress?.speakingMinutes || 0;
  const streakDays = profile?.streakDays || 1;
  const dailyTarget = profile?.dailyTargetMinutes || 20;
  const todayMins = progress?.weeklyMinutes?.[6] || 0;
  const targetPct = Math.min(100, Math.round((todayMins / dailyTarget) * 100));

  const todayChallenge = getTodayChallenge();
  const challengeDone = dailyChallenges.some(
    (c) => c.dateKey === todayChallenge.dateKey && c.completed
  );

  const dailyVocab = vocabulary[0];
  const weakTopicName = learnerContext.weakGrammarTopics[0];
  const recommendedGrammar =
    GRAMMAR_TOPICS.find(
      (t) =>
        weakTopicName && t.title.toLowerCase().includes(weakTopicName.toLowerCase())
    ) ||
    GRAMMAR_TOPICS.find((t) => !grammarProgress.some((g) => g.topicId === t.id && g.completed)) ||
    GRAMMAR_TOPICS[0];

  const latestInsight = learningInsights[0];
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
  const weeklyMinutes = progress?.weeklyMinutes || [0, 0, 0, 0, 0, 0, 0];
  const maxWeekly = Math.max(30, ...weeklyMinutes);
  const resumeRoute: NavRoute = (progress?.lastModule as NavRoute) || 'vocabulary';

  return (
    <div className="space-y-6">
      {/* Section 1: Welcome Message, Learning Streak & Daily Learning Progress */}
      <section className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#718096] dark:text-slate-400">
            <span>Level {profile?.level || 'B1-B2'}</span>
            <span aria-hidden="true">·</span>
            <span>{profile?.preferredAccent || 'American'} English</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-[#243B53] dark:text-slate-200 font-semibold">
              <Flame className="w-3.5 h-3.5 text-[#D6AD60]" />
              <span className="tabular-nums">{streakDays}-day streak</span>
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#243447] dark:text-white tracking-tight">
            {getTimeGreeting()}, {profile?.displayName || 'Learner'}.
          </h1>
          <p className="text-sm text-[#718096] dark:text-slate-400 leading-relaxed">
            {profile?.learningGoals || 'Build daily fluency and expand your active English vocabulary.'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => openAssistantWithPrompt('What should I learn today?')}
              className="px-3.5 py-2 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 border border-[#C3DED6] dark:border-[#3C8D8A]/40 text-[#243B53] dark:text-[#E6F0ED] hover:bg-[#D5E6E1] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#3C8D8A]" />
              <span>Ask AI Coach: What to Study Today</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToGrammarTopic(recommendedGrammar.id)}
              className="px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Focus: {recommendedGrammar.title}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Daily Learning Progress Bar */}
        <div className="w-full lg:w-72 shrink-0 bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#243447] dark:text-white">
              Daily Learning Progress
            </span>
            <span className="font-mono tabular-nums text-[#718096] dark:text-slate-300">
              {todayMins} / {dailyTarget} min
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#E4E8EE] dark:bg-[#263344] overflow-hidden">
            <div
              className="h-full bg-[#3C8D8A] rounded-full transition-all duration-300"
              style={{ width: `${targetPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#718096] dark:text-slate-400">
            <span className="tabular-nums">{targetPct}% of daily goal</span>
            <span className="font-mono tabular-nums text-[#243B53] dark:text-slate-200 font-medium">
              {profile?.xpPoints || 0} XP
            </span>
          </div>
          {latestInsight && (
            <button
              type="button"
              onClick={() =>
                navigateToGrammarTopic(
                  latestInsight.grammarTopicId ||
                    mapMistakeToGrammarTopicId(latestInsight.explanation)
                )
              }
              className="w-full text-left pt-2 border-t border-[#E4E8EE] dark:border-[#263344] text-[11px] text-[#486581] dark:text-slate-300 hover:text-[#3C8D8A] transition-colors truncate"
            >
              Recent note: <span className="font-semibold">{latestInsight.correction}</span>
            </button>
          )}
        </div>
      </section>

      {/* Section 2: Maximum 4 Summary Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-[#718096] dark:text-slate-400">
            <span>Vocabulary Learned</span>
            <BookOpen className="w-4 h-4 text-[#3C8D8A]" />
          </div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white tabular-nums">
            {totalVocab}
          </div>
          <div className="text-xs text-[#718096] dark:text-slate-400 tabular-nums">
            {masteredVocab} mastered · {masteryPct}% score
          </div>
        </div>

        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-[#718096] dark:text-slate-400">
            <span>Grammar Progress</span>
            <Layers className="w-4 h-4 text-[#486581] dark:text-slate-300" />
          </div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white tabular-nums">
            {completedGrammar} / {GRAMMAR_TOPICS.length}
          </div>
          <div className="text-xs text-[#718096] dark:text-slate-400">Structured lessons done</div>
        </div>

        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-[#718096] dark:text-slate-400">
            <span>Speaking Minutes</span>
            <Mic className="w-4 h-4 text-[#3C8D8A]" />
          </div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white tabular-nums">
            {speakingMins} min
          </div>
          <div className="text-xs text-[#718096] dark:text-slate-400">AI tutor &amp; peer rooms</div>
        </div>

        <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-[#718096] dark:text-slate-400">
            <span>Learning Streak</span>
            <Flame className="w-4 h-4 text-[#D6AD60]" />
          </div>
          <div className="text-2xl font-semibold text-[#243447] dark:text-white tabular-nums">
            {streakDays} {streakDays === 1 ? 'day' : 'days'}
          </div>
          <div className="text-xs text-[#718096] dark:text-slate-400">Consistent daily study</div>
        </div>
      </section>

      {/* Section 3: Continue Learning, Daily Vocabulary, Recommended Practice & Weekly Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Continue Learning + Recommended Practice */}
        <div className="lg:col-span-7 space-y-6">
          {/* Continue Learning */}
          <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#3C8D8A]">Continue Learning</div>
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                {progress?.lastLessonTitle || 'Vocabulary & Grammar Practice'}
              </h2>
              <p className="text-xs text-[#718096] dark:text-slate-400">
                Pick up directly where you left off in your learning plan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveRoute(resumeRoute)}
              className="px-4 py-2.5 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] dark:bg-[#3C8D8A] dark:hover:bg-[#317572] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume Lesson</span>
            </button>
          </div>

          {/* Recommended Practice */}
          <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                Recommended Practice
              </h2>
              <button
                type="button"
                onClick={() => setActiveRoute('learning-path')}
                className="text-xs font-semibold text-[#3C8D8A] hover:underline"
              >
                View Learning Path
              </button>
            </div>

            <div className="divide-y divide-[#E4E8EE] dark:divide-[#263344]">
              <div className="py-3.5 first:pt-1 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#718096]">
                    {recommendedGrammar.category}
                  </div>
                  <div className="text-sm font-semibold text-[#243447] dark:text-white mt-0.5">
                    {recommendedGrammar.title}
                  </div>
                  <div className="text-xs text-[#718096] dark:text-slate-400 mt-0.5 line-clamp-1">
                    {recommendedGrammar.summary}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateToGrammarTopic(recommendedGrammar.id)}
                  className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] whitespace-nowrap shrink-0"
                >
                  Open Grammar
                </button>
              </div>

              <div className="py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#718096]">AI Tutor</div>
                  <div className="text-sm font-semibold text-[#243447] dark:text-white mt-0.5">
                    5-Minute Conversation with Emma
                  </div>
                  <div className="text-xs text-[#718096] dark:text-slate-400 mt-0.5">
                    Real-time dialogue with instant grammar and phrasing tips
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRoute('ai-tutor')}
                  className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5 text-[#3C8D8A]" />
                  <span>Start Session</span>
                </button>
              </div>

              <div className="py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#718096]">
                    Daily Challenge · +{todayChallenge.xp} XP
                  </div>
                  <div className="text-sm font-semibold text-[#243447] dark:text-white mt-0.5">
                    {todayChallenge.title}
                  </div>
                  <div className="text-xs text-[#718096] dark:text-slate-400 mt-0.5 line-clamp-1">
                    {todayChallenge.prompt}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRoute('daily-challenge')}
                  className="px-3 py-1.5 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] text-xs font-semibold hover:bg-[#D5E6E1] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#3C8D8A]" />
                  <span>{challengeDone ? 'Review' : 'Practice'}</span>
                </button>
              </div>

              <div className="py-3.5 last:pb-1 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#718096]">Speaking Partner</div>
                  <div className="text-sm font-semibold text-[#243447] dark:text-white mt-0.5">
                    Join a Guided Peer Voice Room
                  </div>
                  <div className="text-xs text-[#718096] dark:text-slate-400 mt-0.5">
                    Live WebRTC audio call with adaptive conversation prompts
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRoute('speaking-community')}
                  className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-[#486581]" />
                  <span>Find Partner</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Daily Vocabulary + Weekly Learning Activity */}
        <div className="lg:col-span-5 space-y-6">
          {/* Daily Vocabulary */}
          <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                Daily Vocabulary
              </h2>
              <button
                type="button"
                onClick={() => setActiveRoute('vocabulary')}
                className="text-xs font-semibold text-[#3C8D8A] hover:underline"
              >
                All Words
              </button>
            </div>

            {dailyVocab ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold text-[#243447] dark:text-white capitalize">
                      {dailyVocab.word}
                    </div>
                    <div className="text-xs text-[#718096] font-mono mt-0.5">
                      {dailyVocab.ipa || '/.../'} · {dailyVocab.category} · {dailyVocab.masteryStatus}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakText(dailyVocab.word)}
                    aria-label={`Pronounce ${dailyVocab.word}`}
                    className="p-2 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-[#243B53] dark:text-slate-200 hover:bg-[#E6F0ED] transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-[#486581] dark:text-slate-300">
                  Meaning:{' '}
                  <span className="font-semibold text-[#243447] dark:text-white">
                    {dailyVocab.meaningId}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setActiveRoute('review-vocabulary')}
                  className="w-full py-2 px-3 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] hover:bg-[#E6F0ED] dark:hover:bg-[#3C8D8A]/20 text-xs font-semibold text-[#243B53] dark:text-slate-100 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Review Flashcards</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#718096] leading-relaxed">
                  Add your first vocabulary word to generate IPA, Indonesian meanings, and 7-tense sentence examples.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveRoute('vocabulary')}
                  className="px-4 py-2 rounded-lg bg-[#243B53] text-white text-xs font-semibold"
                >
                  Add Vocabulary
                </button>
              </div>
            )}
          </div>

          {/* Weekly Learning Activity */}
          <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                  Weekly Learning Activity
                </h2>
                <p className="text-xs text-[#718096] dark:text-slate-400">
                  Minutes practiced over the past 7 days
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveRoute('analytics')}
                className="text-xs font-semibold text-[#3C8D8A] hover:underline whitespace-nowrap"
              >
                Details
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2.5 items-end h-36 pt-2">
              {weeklyMinutes.map((mins, idx) => {
                const heightPct = Math.max(8, Math.round((mins / maxWeekly) * 100));
                const isToday = idx === 6;
                return (
                  <div
                    key={weekDays[idx]}
                    className="flex flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <span className="text-[11px] font-mono tabular-nums text-[#718096]">
                      {mins}m
                    </span>
                    <div className="w-full max-w-[32px] bg-[#F7F8FA] dark:bg-[#1E2B3B] rounded-md h-20 flex items-end overflow-hidden border border-[#E4E8EE] dark:border-[#263344]">
                      <div
                        className={`w-full rounded-sm transition-all duration-300 ${
                          isToday ? 'bg-[#3C8D8A]' : 'bg-[#486581]/60 dark:bg-[#486581]'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[11px] ${
                        isToday ? 'font-semibold text-[#243447] dark:text-white' : 'text-[#718096]'
                      }`}
                    >
                      {weekDays[idx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
