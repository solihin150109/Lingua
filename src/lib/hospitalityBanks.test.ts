import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DICTATION_BANK_150,
  getSessionSlice,
  GRAMMAR_BANK_150,
  LISTENING_BANK_150,
  PRONUNCIATION_BANK_150,
  SESSION_QUESTION_COUNT,
  TOTAL_BANK_SIZE,
} from './hospitalityBanks';

test('all 4 hospitality waiter banks contain exactly 150 unique items', () => {
  assert.equal(LISTENING_BANK_150.length, TOTAL_BANK_SIZE);
  assert.equal(DICTATION_BANK_150.length, TOTAL_BANK_SIZE);
  assert.equal(PRONUNCIATION_BANK_150.length, TOTAL_BANK_SIZE);
  assert.equal(GRAMMAR_BANK_150.length, TOTAL_BANK_SIZE);

  assert.equal(new Set(LISTENING_BANK_150.map((x) => x.phrase)).size, TOTAL_BANK_SIZE);
  assert.equal(new Set(DICTATION_BANK_150.map((x) => x.phrase)).size, TOTAL_BANK_SIZE);
  assert.equal(new Set(PRONUNCIATION_BANK_150.map((x) => x.phrase)).size, TOTAL_BANK_SIZE);
  assert.equal(new Set(GRAMMAR_BANK_150.map((x) => x.question)).size, TOTAL_BANK_SIZE);
});

test('grammar and listening questions have valid 4-option structure and cover all 7 basic grammars', () => {
  for (const item of LISTENING_BANK_150) {
    assert.equal(item.options.length, 4);
    assert.ok(item.correctIndex >= 0 && item.correctIndex < 4);
  }
  const grammarIds = new Set<string>();
  for (const q of GRAMMAR_BANK_150) {
    assert.equal(q.options.length, 4);
    assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
    grammarIds.add(q.grammarId);
  }
  assert.equal(grammarIds.size, 7);
});

test('getSessionSlice picks 30 items and rotates across different login seeds', () => {
  const s1 = getSessionSlice(LISTENING_BANK_150, 'user-a:login-1', SESSION_QUESTION_COUNT);
  const s2 = getSessionSlice(LISTENING_BANK_150, 'user-a:login-2', SESSION_QUESTION_COUNT);
  assert.equal(s1.length, 30);
  assert.equal(s2.length, 30);
  const ids1 = s1.map((x) => x.id).join(',');
  const ids2 = s2.map((x) => x.id).join(',');
  assert.notEqual(ids1, ids2);
});
