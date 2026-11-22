import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCompactLearnerContext,
  findDuplicateVocabulary,
  hasAudioPronunciationEvidence,
  mapMistakeToGrammarTopicId,
  normalizeSentenceEvaluation,
  normalizeVocabWord,
} from './aiMemory';
import type { VocabularyItem } from '../types/lingua';

function makeVocab(id: string, word: string, overrides: Partial<VocabularyItem> = {}): VocabularyItem {
  const now = new Date().toISOString();
  return {
    id,
    userId: 'u1',
    word,
    meaningId: 'arti kata',
    category: 'verb',
    ipa: '/test/',
    grammarExplanation: 'note',
    synonyms: [],
    antonyms: [],
    relatedWords: [],
    masteryStatus: 'New',
    reviewCount: 0,
    errorCount: 0,
    isFavorite: false,
    nextReviewAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test('normalizeVocabWord and findDuplicateVocabulary match case/space variants cleanly', () => {
  assert.equal(normalizeVocabWord('  Improve   Fast  '), 'improve fast');
  const list = [makeVocab('v1', 'Collaborate'), makeVocab('v2', 'Look forward to')];
  assert.equal(findDuplicateVocabulary(list, '  collaborate ')?.id, 'v1');
  assert.equal(findDuplicateVocabulary(list, 'LOOK   FORWARD TO')?.id, 'v2');
  assert.equal(findDuplicateVocabulary(list, 'resilient'), undefined);
});

test('mapMistakeToGrammarTopicId links common ESL error descriptions to accurate grammar lessons', () => {
  assert.equal(mapMistakeToGrammarTopicId('Did you saw the film? Simple Past error'), 'simple-past');
  assert.equal(mapMistakeToGrammarTopicId('I have visited Bali last year vs Present Perfect'), 'present-perfect');
  assert.equal(mapMistakeToGrammarTopicId('Wrong article: an university instead of a university'), 'articles');
  assert.equal(mapMistakeToGrammarTopicId('Preposition mistake: in Monday'), 'prepositions');
  assert.equal(mapMistakeToGrammarTopicId('Gerund missing after look forward to'), 'gerunds-and-infinitives');
});

test('normalizeSentenceEvaluation treats valid-but-unnatural sentences as grammatically correct', () => {
  const normalized = normalizeSentenceEvaluation({
    isCorrect: false,
    verdict: 'correct_unnatural',
    correctnessScore: 78,
    grammarAssessment: 'Grammar is valid.',
    vocabularyUsageAssessment: 'Word used accurately.',
    naturalnessAssessment: 'A native speaker would phrase this slightly more concisely.',
    correctedSentence: 'I would like to improve my fluency.',
    explanation: 'Grammatically valid; consider a smoother phrasing.',
    nativeAlternatives: ['I want to boost my speaking fluency.'],
  });
  assert.equal(normalized.verdict, 'correct_unnatural');
  assert.equal(normalized.isCorrect, true);
});

test('hasAudioPronunciationEvidence enforces explicit audio gating', () => {
  assert.equal(hasAudioPronunciationEvidence(null), false);
  assert.equal(
    hasAudioPronunciationEvidence({
      pronunciationSamplesCount: 0,
    }),
    false
  );
  assert.equal(
    hasAudioPronunciationEvidence({
      pronunciationSamplesCount: 2,
    }),
    true
  );
});

test('buildCompactLearnerContext caps context budgets and surfaces weak areas', () => {
  const vocab = Array.from({ length: 25 }, (_, i) =>
    makeVocab(`v${i}`, `word${i}`, {
      masteryStatus: i < 15 ? 'Mastered' : 'Learning',
      errorCount: i >= 15 ? i - 10 : 0,
    })
  );
  const ctx = buildCompactLearnerContext({
    profile: {
      uid: 'u1',
      displayName: 'Budi',
      level: 'B1-B2',
      learningGoals: 'Job interviews and fluent workplace communication',
      preferredAccent: 'British',
      dailyTargetMinutes: 30,
      streakDays: 5,
      xpPoints: 420,
      onboardingCompleted: true,
      isOnline: true,
      updatedAt: '',
    },
    progress: {
      userId: 'u1',
      vocabTotal: 25,
      vocabMastered: 15,
      grammarCompleted: 4,
      speakingMinutes: 25,
      lastModule: 'grammar',
      lastLessonTitle: 'Simple Past',
      weeklyMinutes: [10, 15, 20, 15, 10, 25, 20],
      updatedAt: '',
    },
    vocabulary: vocab,
    grammarProgress: [
      { id: 'g1', userId: 'u1', topicId: 'simple-past', category: 'Tenses', completed: true, quizScore: 55, updatedAt: '' },
      { id: 'g2', userId: 'u1', topicId: 'simple-present', category: 'Tenses', completed: true, quizScore: 100, updatedAt: '' },
    ],
    quizResults: [],
    speakingSessions: [],
    insights: [
      {
        id: 'in1',
        userId: 'u1',
        sourceModule: 'ai-tutor',
        mistakeOriginal: 'I go yesterday',
        correction: 'I went yesterday',
        explanation: 'Use V2 for past events',
        grammarTopicId: 'simple-past',
        vocabWord: '',
        createdAt: '',
      },
    ],
    memory: null,
  });

  assert.ok(ctx.weakVocabWords.length <= 10);
  assert.ok(ctx.knownVocabSample.length <= 12);
  assert.ok(ctx.weakGrammarTopics.includes('Simple Past'));
  assert.equal(ctx.hasPronunciationAudioEvidence, false);
});
