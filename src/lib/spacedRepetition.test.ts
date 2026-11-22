import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMasteryPercentage,
  computeNextReview,
  computeUnlockedAchievementKeys,
  evaluatePlacementLevel,
  sortReviewQueue,
  validateVocabularyInput,
} from './spacedRepetition';
import type { VocabularyItem } from '../types/lingua';

test('computeNextReview promotes correct answers and demotes mistakes', () => {
  const now = new Date('2026-11-22T10:00:00Z');
  const promoted = computeNextReview(
    { masteryStatus: 'New', reviewCount: 0, errorCount: 0 },
    true,
    now
  );
  assert.equal(promoted.masteryStatus, 'Learning');
  assert.equal(promoted.reviewCount, 1);
  assert.equal(promoted.errorCount, 0);

  const demoted = computeNextReview(
    { masteryStatus: 'Mastered', reviewCount: 6, errorCount: 0 },
    false,
    now
  );
  assert.equal(demoted.masteryStatus, 'Familiar');
  assert.equal(demoted.errorCount, 1);
});

test('sortReviewQueue prioritizes overdue items and frequent errors', () => {
  const now = new Date('2026-11-22T10:00:00Z');
  const base: Omit<VocabularyItem, 'id' | 'word' | 'errorCount' | 'nextReviewAt' | 'masteryStatus'> = {
    userId: 'u1',
    meaningId: 'arti',
    category: 'verb',
    ipa: '/test/',
    grammarExplanation: '',
    synonyms: [],
    antonyms: [],
    relatedWords: [],
    reviewCount: 2,
    isFavorite: false,
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  };

  const items: VocabularyItem[] = [
    { ...base, id: '1', word: 'easy', errorCount: 0, masteryStatus: 'Mastered', nextReviewAt: '2026-11-25T00:00:00Z' },
    { ...base, id: '2', word: 'hard', errorCount: 4, masteryStatus: 'Learning', nextReviewAt: '2026-11-21T00:00:00Z' },
    { ...base, id: '3', word: 'medium', errorCount: 1, masteryStatus: 'New', nextReviewAt: '2026-11-21T00:00:00Z' },
  ];

  const sorted = sortReviewQueue(items, now);
  assert.deepEqual(sorted.map((i) => i.word), ['hard', 'medium', 'easy']);
});

test('calculateMasteryPercentage computes weighted mastery', () => {
  const makeItem = (masteryStatus: VocabularyItem['masteryStatus']): VocabularyItem => ({
    id: masteryStatus,
    userId: 'u1',
    word: 'test',
    meaningId: 'tes',
    category: 'noun',
    ipa: '',
    grammarExplanation: '',
    synonyms: [],
    antonyms: [],
    relatedWords: [],
    masteryStatus,
    reviewCount: 0,
    errorCount: 0,
    isFavorite: false,
    nextReviewAt: '2026-11-22T00:00:00Z',
    createdAt: '2026-11-22T00:00:00Z',
    updatedAt: '2026-11-22T00:00:00Z',
  });

  assert.equal(calculateMasteryPercentage([]), 0);
  assert.equal(calculateMasteryPercentage([makeItem('New'), makeItem('Mastered')]), 50);
});

test('evaluatePlacementLevel maps scores to A1-A2, B1-B2, and C1-C2', () => {
  assert.equal(evaluatePlacementLevel(1, 5).recommendedLevel, 'A1-A2');
  assert.equal(evaluatePlacementLevel(3, 5).recommendedLevel, 'B1-B2');
  assert.equal(evaluatePlacementLevel(5, 5).recommendedLevel, 'C1-C2');
});

test('validateVocabularyInput rejects empty and invalid characters', () => {
  assert.equal(validateVocabularyInput('   ').valid, false);
  assert.equal(validateVocabularyInput('improve123!').valid, false);
  assert.equal(validateVocabularyInput('  improve  ').cleanWord, 'improve');
  assert.equal(validateVocabularyInput('break down').valid, true);
});

test('computeUnlockedAchievementKeys unlocks matching milestones', () => {
  const keys = computeUnlockedAchievementKeys({
    vocabTotal: 52,
    vocabMastered: 6,
    grammarCompleted: 4,
    speakingMinutes: 15,
    streakDays: 7,
    sentenceBuilderCount: 5,
  });
  assert.ok(keys.includes('first_50_words'));
  assert.ok(keys.includes('grammar_beginner'));
  assert.ok(keys.includes('ten_min_speaking'));
  assert.ok(keys.includes('seven_day_streak'));
  assert.ok(keys.includes('sentence_architect'));
  assert.equal(keys.includes('confident_speaker'), false);
});
