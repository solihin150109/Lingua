import type {
  GrammarLessonProgress,
  LearnerContextSummary,
  LearnerMemoryDoc,
  LearningInsight,
  LearningProgress,
  QuizResult,
  SentenceEvaluation,
  SpeakingSession,
  UserProfile,
  VocabularyItem,
} from '../types/lingua';
import { GRAMMAR_TOPICS } from './curriculum';

/**
 * Normalizes a vocabulary word or phrase for reliable duplicate detection.
 */
export function normalizeVocabWord(word: string): string {
  return word.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Checks if a word already exists in the learner's vocabulary list.
 */
export function findDuplicateVocabulary(
  items: VocabularyItem[],
  candidateWord: string
): VocabularyItem | undefined {
  const normalized = normalizeVocabWord(candidateWord);
  if (!normalized) return undefined;
  return items.find((item) => normalizeVocabWord(item.word) === normalized);
}

const GRAMMAR_KEYWORD_MAP: Array<{ pattern: RegExp; topicId: string }> = [
  { pattern: /present perfect continuous|have been .*ing|has been .*ing/i, topicId: 'present-perfect-continuous' },
  { pattern: /present perfect|have \+ v3|has \+ v3|ever|already|since|for /i, topicId: 'present-perfect' },
  { pattern: /past perfect continuous|had been .*ing/i, topicId: 'past-perfect-continuous' },
  { pattern: /past perfect|had \+ v3|by the time/i, topicId: 'past-perfect' },
  { pattern: /future perfect continuous|will have been/i, topicId: 'future-perfect-continuous' },
  { pattern: /future perfect|will have/i, topicId: 'future-perfect' },
  { pattern: /future continuous|will be .*ing/i, topicId: 'future-continuous' },
  { pattern: /simple future|going to|\bwill\b/i, topicId: 'simple-future' },
  { pattern: /present continuous|am\/is\/are \+ v-ing|happening now/i, topicId: 'present-continuous' },
  { pattern: /past continuous|was\/were \+ v-ing/i, topicId: 'past-continuous' },
  { pattern: /simple past|v2\b|past tense|yesterday|last week|didn't|did not/i, topicId: 'simple-past' },
  { pattern: /simple present|third person|doesn't|v1\(s\/es\)|routine|habit/i, topicId: 'simple-present' },
  { pattern: /conditional|if clause|would have|if i were/i, topicId: 'conditional-sentences' },
  { pattern: /passive|was sent|are saved|be \+ v3/i, topicId: 'passive-voice' },
  { pattern: /reported speech|backshift|told me that|said that/i, topicId: 'reported-speech' },
  { pattern: /relative clause|who|which|where|whose/i, topicId: 'relative-clauses' },
  { pattern: /gerund|infinitive|enjoy \+ v-ing|look forward to/i, topicId: 'gerunds-and-infinitives' },
  { pattern: /phrasal verb|figure out|go over|look up/i, topicId: 'phrasal-verbs' },
  { pattern: /modal|could|should|must|might|would/i, topicId: 'modal-verbs' },
  { pattern: /article|\ba\/an\b|\bthe\b|an hour|a university/i, topicId: 'articles' },
  { pattern: /preposition|\bin, on, at\b|on monday|at \d/i, topicId: 'prepositions' },
  { pattern: /conjunction|although|however|because/i, topicId: 'conjunctions' },
  { pattern: /pronoun|between you and me|subject pronoun|object pronoun/i, topicId: 'pronouns' },
  { pattern: /uncountable|countable|plural|noun/i, topicId: 'nouns' },
  { pattern: /adjective|comparative|superlative/i, topicId: 'adjectives' },
  { pattern: /adverb|frequency adverb/i, topicId: 'adverbs' },
];

/**
 * Matches free-text grammar mistake or topic description to the nearest built-in grammar lesson ID.
 */
export function mapMistakeToGrammarTopicId(text: string): string {
  const clean = (text || '').trim();
  if (!clean) return GRAMMAR_TOPICS[0].id;

  const exactById = GRAMMAR_TOPICS.find((t) => t.id === clean);
  if (exactById) return exactById.id;

  const exactByTitle = GRAMMAR_TOPICS.find(
    (t) => clean.toLowerCase().includes(t.title.toLowerCase())
  );
  if (exactByTitle) return exactByTitle.id;

  for (const entry of GRAMMAR_KEYWORD_MAP) {
    if (entry.pattern.test(clean)) {
      return entry.topicId;
    }
  }
  return 'simple-present';
}

/**
 * Resolves a grammar topic ID into its readable title.
 */
export function getGrammarTopicTitle(topicId: string): string {
  return GRAMMAR_TOPICS.find((t) => t.id === topicId)?.title || 'Simple Present';
}

/**
 * Determines whether genuine pronunciation audio analysis evidence exists in learner memory.
 */
export function hasAudioPronunciationEvidence(
  memory?: Pick<LearnerMemoryDoc, 'pronunciationSamplesCount'> | null
): boolean {
  return Boolean(memory && typeof memory.pronunciationSamplesCount === 'number' && memory.pronunciationSamplesCount > 0);
}

/**
 * Ensures Sentence Coach verdicts distinguish grammatically valid yet stiff/unnatural sentences
 * from genuinely incorrect grammar/vocabulary usage.
 */
export function normalizeSentenceEvaluation(evalData: SentenceEvaluation): SentenceEvaluation {
  const verdict =
    evalData.verdict ||
    (evalData.isCorrect
      ? evalData.correctnessScore >= 85
        ? 'natural'
        : 'correct_unnatural'
      : 'needs_correction');

  const isCorrect = verdict === 'natural' || verdict === 'correct_unnatural' ? true : Boolean(evalData.isCorrect);

  return {
    ...evalData,
    verdict,
    isCorrect,
    correctnessScore: Math.min(100, Math.max(0, Math.round(Number(evalData.correctnessScore) || 0))),
    nativeAlternatives: Array.isArray(evalData.nativeAlternatives) ? evalData.nativeAlternatives.slice(0, 4) : [],
  };
}

/**
 * Builds a compact, strictly token-budgeted summary of learner state for AI context injection.
 * Never dumps raw full transcripts or unbounded histories.
 */
export function buildCompactLearnerContext(params: {
  profile: UserProfile | null;
  progress: LearningProgress | null;
  vocabulary: VocabularyItem[];
  grammarProgress: GrammarLessonProgress[];
  quizResults: QuizResult[];
  speakingSessions: SpeakingSession[];
  insights: LearningInsight[];
  memory: LearnerMemoryDoc | null;
}): LearnerContextSummary {
  const { profile, progress, vocabulary, grammarProgress, quizResults, speakingSessions, insights, memory } = params;

  const weakVocabWords = vocabulary
    .filter((v) => v.errorCount > 0 || v.masteryStatus === 'New' || v.masteryStatus === 'Learning')
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 10)
    .map((v) => v.word);

  const knownVocabSample = vocabulary
    .filter((v) => v.masteryStatus === 'Familiar' || v.masteryStatus === 'Mastered')
    .slice(0, 12)
    .map((v) => v.word);

  const completedGrammarTopics = grammarProgress
    .filter((g) => g.completed && g.quizScore >= 75)
    .slice(0, 12)
    .map((g) => getGrammarTopicTitle(g.topicId));

  const lowQuizGrammar = grammarProgress
    .filter((g) => g.quizScore < 75)
    .map((g) => getGrammarTopicTitle(g.topicId));

  const insightGrammar = insights
    .slice(0, 8)
    .map((i) => getGrammarTopicTitle(i.grammarTopicId));

  const weakGrammarTopics = Array.from(
    new Set([...(memory?.grammarWeaknesses || []), ...lowQuizGrammar, ...insightGrammar])
  ).slice(0, 6);

  const recentQuizzes = quizResults.slice(0, 5).map((q) => ({
    quizType: q.quizType,
    topic: q.topic.slice(0, 60),
    score: q.score,
  }));

  const recentSpeakingTopics = speakingSessions.slice(0, 4).map((s) => ({
    sessionType: s.sessionType,
    topic: s.topic.slice(0, 60),
    durationSeconds: s.durationSeconds,
  }));

  const recentMistakes = insights.slice(0, 6).map((i) => ({
    original: i.mistakeOriginal.slice(0, 100),
    correction: i.correction.slice(0, 100),
    grammarTopicId: i.grammarTopicId,
  }));

  return {
    level: profile?.level || 'B1-B2',
    preferredAccent: profile?.preferredAccent || 'American',
    learningGoals: (profile?.learningGoals || 'Build everyday and workplace English fluency.').slice(0, 180),
    streakDays: profile?.streakDays || 1,
    xpPoints: profile?.xpPoints || 0,
    speakingMinutes: progress?.speakingMinutes || 0,
    knownVocabSample,
    weakVocabWords,
    vocabTotal: vocabulary.length,
    vocabMastered: vocabulary.filter((v) => v.masteryStatus === 'Mastered').length,
    completedGrammarTopics,
    weakGrammarTopics,
    recentQuizzes,
    recentSpeakingTopics,
    recentMistakes,
    hasPronunciationAudioEvidence: hasAudioPronunciationEvidence(memory),
    pronunciationAvgMatch: memory?.pronunciationAvgMatch || 0,
    pronunciationSamplesCount: memory?.pronunciationSamplesCount || 0,
  };
}
