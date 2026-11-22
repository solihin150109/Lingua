import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('firestore.rules enforces Eight Pillars security primitives across all 17 collections', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  // 1. Rules v2 and global default-deny catch-all
  assert.match(rules, /rules_version\s*=\s*'2'/);
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;/);

  // 2. Path variable ID validation helper and usage
  assert.match(rules, /function isValidId\(id\)/);
  assert.match(rules, /isValidId\(vocabId\)/);
  assert.match(rules, /isValidId\(insightId\)/);

  // 3. Strict key checks (hasAll + hasOnly) and affectedKeys().hasOnly()
  assert.match(rules, /keys\(\)\.hasAll\(/);
  assert.match(rules, /keys\(\)\.hasOnly\(/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(/);

  // 4. Temporal integrity using request.time
  assert.match(rules, /request\.time/);

  // 5. No blanket allow list: if isSignedIn();
  assert.equal(/allow\s+(read|list)\s*:\s*if\s+isSignedIn\(\)\s*;/.test(rules), false);

  // 6. All 17 blueprint collections matched
  const collections = [
    'users',
    'userProfiles',
    'vocabulary',
    'vocabularySentences',
    'grammarLessons',
    'learningProgress',
    'quizResults',
    'speakingSessions',
    'conversationTranscripts',
    'tutorPreferences',
    'userConnections',
    'notifications',
    'achievements',
    'dailyChallenges',
    'reports',
    'learningInsights',
    'learnerMemories',
  ];
  for (const col of collections) {
    assert.ok(rules.includes(`match /${col}/`), `Missing match block for ${col}`);
  }
});
