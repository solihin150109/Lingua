# LINGUA Firestore Security Specification

## 1. Data Invariants
1. **Owner-Scoped Personal Learning Data**: `users`, `vocabulary`, `vocabularySentences`, `grammarLessons`, `learningProgress`, `quizResults`, `tutorPreferences`, `notifications`, `achievements`, and `dailyChallenges` MUST belong strictly to `request.auth.uid`.
2. **PII Isolation (Split Collection)**: Email and blocked user lists live exclusively in `users/{userId}` (owner-only read/write). `userProfiles/{userId}` holds only public-safe learning card metadata (`displayName`, `level`, `preferredAccent`, `isOnline`) with no email or private PII.
3. **Referential & Participant Integrity**: `vocabularySentences` must reference an existing `vocabulary` item owned by the same user (`exists()` / `get()`). `speakingSessions` and `conversationTranscripts` restrict `participantIds` to `size() >= 1 && size() <= 2` and only allow reads/writes by participants.
4. **Role & Privilege Protection**: Users create their own `users/{userId}` record strictly with `role == 'learner'` and cannot escalate roles.
5. **Terminal State & Timestamp Integrity**: Completed `speakingSessions` (`status == 'completed'`) lock core session fields; all `createdAt` / `updatedAt` timestamps must match `request.time`.

## 2. "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read** on `/users/u1` -> `PERMISSION_DENIED`.
2. **Cross-user PII read** by `u2` on `/users/u1` -> `PERMISSION_DENIED`.
3. **Role escalation** on `/users/u1` create with `role: "admin"` -> `PERMISSION_DENIED`.
4. **Shadow/ghost field** on `/vocabulary/v1` create with `isAdminVerified: true` -> `PERMISSION_DENIED`.
5. **UID spoofing** by `u2` creating `/vocabulary/v1` with `userId: "u1"` -> `PERMISSION_DENIED`.
6. **Oversized document ID** (1.5KB junk string) on `/vocabulary/{longId}` -> `PERMISSION_DENIED`.
7. **Orphan sentence creation** on `/vocabularySentences/s1` referencing nonexistent `vocabId` -> `PERMISSION_DENIED`.
8. **Blanket list scraping** on `/notifications` without `userId == request.auth.uid` -> `PERMISSION_DENIED`.
9. **Immutable owner mutation** updating `vocabulary/v1` to change `userId` or `createdAt` -> `PERMISSION_DENIED`.
10. **Client-forged timestamp** creating `/quizResults/q1` with `createdAt` != `request.time` -> `PERMISSION_DENIED`.
11. **Unbounded array injection** on `/speakingSessions/s1` with 20 `participantIds` -> `PERMISSION_DENIED`.
12. **Reading another user's private transcript** by `u3` not in `participantIds` -> `PERMISSION_DENIED`.
