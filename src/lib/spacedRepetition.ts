import type { EnglishLevel, MasteryStatus, VocabularyItem } from '../types/lingua';

export interface ReviewUpdate {
  masteryStatus: MasteryStatus;
  reviewCount: number;
  errorCount: number;
  nextReviewAt: string;
}

/**
 * Computes next spaced-repetition status and review timestamp.
 * Higher error counts keep words in 'New' or 'Learning' with shorter intervals.
 */
export function computeNextReview(
  current: Pick<VocabularyItem, 'masteryStatus' | 'reviewCount' | 'errorCount'>,
  wasCorrect: boolean,
  now: Date = new Date()
): ReviewUpdate {
  const reviewCount = current.reviewCount + 1;
  const errorCount = wasCorrect ? current.errorCount : current.errorCount + 1;

  let masteryStatus: MasteryStatus = current.masteryStatus;
  let hoursUntilNext = 4;

  if (!wasCorrect) {
    if (current.masteryStatus === 'Mastered') {
      masteryStatus = 'Familiar';
      hoursUntilNext = 12;
    } else if (current.masteryStatus === 'Familiar') {
      masteryStatus = 'Learning';
      hoursUntilNext = 4;
    } else {
      masteryStatus = 'New';
      hoursUntilNext = 1;
    }
  } else {
    const netSuccess = reviewCount - errorCount;
    if (netSuccess >= 5 && current.masteryStatus === 'Familiar') {
      masteryStatus = 'Mastered';
      hoursUntilNext = 168; // 7 days
    } else if (netSuccess >= 3 || current.masteryStatus === 'Learning') {
      masteryStatus = 'Familiar';
      hoursUntilNext = 48; // 2 days
    } else {
      masteryStatus = 'Learning';
      hoursUntilNext = 12;
    }
  }

  const nextReviewAt = new Date(now.getTime() + hoursUntilNext * 60 * 60 * 1000).toISOString();
  return {
    masteryStatus,
    reviewCount,
    errorCount,
    nextReviewAt,
  };
}

/**
 * Prioritizes overdue words and words with higher error counts.
 */
export function sortReviewQueue(items: VocabularyItem[], now: Date = new Date()): VocabularyItem[] {
  const nowMs = now.getTime();
  return [...items].sort((a, b) => {
    const aDue = new Date(a.nextReviewAt).getTime() <= nowMs ? 1 : 0;
    const bDue = new Date(b.nextReviewAt).getTime() <= nowMs ? 1 : 0;
    if (aDue !== bDue) return bDue - aDue;

    // Frequent mistakes come first
    if (a.errorCount !== b.errorCount) return b.errorCount - a.errorCount;

    // Lower mastery comes before mastered
    const rank: Record<MasteryStatus, number> = {
      New: 0,
      Learning: 1,
      Familiar: 2,
      Mastered: 3,
    };
    if (rank[a.masteryStatus] !== rank[b.masteryStatus]) {
      return rank[a.masteryStatus] - rank[b.masteryStatus];
    }

    return new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime();
  });
}

export function calculateMasteryPercentage(items: VocabularyItem[]): number {
  if (items.length === 0) return 0;
  const weights: Record<MasteryStatus, number> = {
    New: 0,
    Learning: 0.35,
    Familiar: 0.7,
    Mastered: 1,
  };
  const total = items.reduce((sum, item) => sum + weights[item.masteryStatus], 0);
  return Math.round((total / items.length) * 100);
}

export function evaluatePlacementLevel(correctCount: number, totalQuestions: number): {
  recommendedLevel: EnglishLevel;
  percentage: number;
  summary: string;
} {
  if (totalQuestions <= 0) {
    return {
      recommendedLevel: 'A1-A2',
      percentage: 0,
      summary: 'Foundational English track recommended.',
    };
  }
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  if (percentage >= 80) {
    return {
      recommendedLevel: 'C1-C2',
      percentage,
      summary: 'Strong command of nuanced grammar and vocabulary. Recommended: Advanced fluency & executive speaking.',
    };
  }
  if (percentage >= 45) {
    return {
      recommendedLevel: 'B1-B2',
      percentage,
      summary: 'Solid conversational foundation. Recommended: Intermediate tenses, sentence construction, and live speaking.',
    };
  }
  return {
    recommendedLevel: 'A1-A2',
    percentage,
    summary: 'Great starting point. Recommended: Core vocabulary, basic grammar patterns, and guided daily conversations.',
  };
}

export function validateVocabularyInput(word: string): { valid: boolean; cleanWord: string; error?: string } {
  const cleanWord = word.trim();
  if (!cleanWord) {
    return { valid: false, cleanWord: '', error: 'Please enter an English word or short phrase.' };
  }
  if (cleanWord.length > 80) {
    return { valid: false, cleanWord, error: 'Vocabulary entry must be 80 characters or fewer.' };
  }
  if (!/^[a-zA-Z\s'-]+$/.test(cleanWord)) {
    return { valid: false, cleanWord, error: 'Use standard English letters, spaces, hyphens, or apostrophes.' };
  }
  return { valid: true, cleanWord };
}

export function computeUnlockedAchievementKeys(stats: {
  vocabTotal: number;
  vocabMastered: number;
  grammarCompleted: number;
  speakingMinutes: number;
  streakDays: number;
  sentenceBuilderCount: number;
}): string[] {
  const unlocked: string[] = [];
  if (stats.vocabTotal >= 1) unlocked.push('first_word');
  if (stats.vocabTotal >= 50) unlocked.push('first_50_words');
  if (stats.vocabMastered >= 5) unlocked.push('word_master');
  if (stats.grammarCompleted >= 3) unlocked.push('grammar_beginner');
  if (stats.speakingMinutes >= 10) unlocked.push('ten_min_speaking');
  if (stats.speakingMinutes >= 60) unlocked.push('confident_speaker');
  if (stats.streakDays >= 7) unlocked.push('seven_day_streak');
  if (stats.sentenceBuilderCount >= 5) unlocked.push('sentence_architect');
  return unlocked;
}
