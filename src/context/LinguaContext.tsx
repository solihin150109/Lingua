import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseAuthProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  clampString,
  clampStringArray,
  db,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '../lib/firebase';
import {
  ACHIEVEMENT_BADGES,
  getTodayChallenge,
  STARTER_SENTENCES,
  STARTER_VOCAB,
} from '../lib/curriculum';
import { computeNextReview, computeUnlockedAchievementKeys } from '../lib/spacedRepetition';
import {
  buildCompactLearnerContext,
  findDuplicateVocabulary,
  getGrammarTopicTitle,
} from '../lib/aiMemory';
import type {
  AchievementUnlock,
  AiDailyChallenge,
  DailyChallengeProgress,
  EnglishAccent,
  EnglishLevel,
  GrammarLessonProgress,
  LearnerContextSummary,
  LearnerMemoryDoc,
  LearningEvaluationReport,
  LearningInsight,
  LearningProgress,
  NavRoute,
  NotificationItem,
  PersonalizedLearningPath,
  QuizResult,
  SpeakingSession,
  SpeakingSpeed,
  TranscriptEntry,
  TutorPreference,
  UserAccount,
  UserProfile,
  VocabCategory,
  VocabularyDailyConversation,
  VocabularyItem,
  VocabularySentence,
} from '../types/lingua';

interface LinguaContextValue {
  authReady: boolean;
  firebaseUser: User | null;
  isPreviewMode: boolean;
  enterPreviewMode: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;

  activeRoute: NavRoute;
  setActiveRoute: (route: NavRoute) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;

  account: UserAccount | null;
  profile: UserProfile | null;
  progress: LearningProgress | null;
  vocabulary: VocabularyItem[];
  sentences: VocabularySentence[];
  grammarProgress: GrammarLessonProgress[];
  quizResults: QuizResult[];
  speakingSessions: SpeakingSession[];
  tutorPrefs: TutorPreference | null;
  notifications: NotificationItem[];
  achievements: AchievementUnlock[];
  dailyChallenges: DailyChallengeProgress[];
  learningInsights: LearningInsight[];
  learnerMemory: LearnerMemoryDoc | null;
  learnerContext: LearnerContextSummary;
  serverHealth: { ok: boolean; geminiConfigured: boolean; webrtcSignaling: boolean } | null;

  focusedGrammarTopicId: string | null;
  setFocusedGrammarTopicId: (id: string | null) => void;
  focusedVocabId: string | null;
  setFocusedVocabId: (id: string | null) => void;
  navigateToGrammarTopic: (topicId: string) => void;
  navigateToVocabPractice: (vocabId: string) => void;

  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  assistantInitialPrompt: string;
  openAssistantWithPrompt: (prompt?: string) => void;

  completeOnboarding: (payload: {
    level: EnglishLevel;
    learningGoals: string;
    preferredAccent: EnglishAccent;
    dailyTargetMinutes: number;
    placementScore?: number;
    placementTotal?: number;
  }) => Promise<void>;
  updateUserProfile: (patch: Partial<UserProfile>) => Promise<void>;
  grantAudioConsent: (granted: boolean) => Promise<void>;
  addVocabularyWithAI: (word: string) => Promise<VocabularyItem>;
  saveWordFromAnywhere: (word: string) => Promise<{ item: VocabularyItem; existed: boolean }>;
  toggleFavoriteVocab: (vocabId: string) => Promise<void>;
  deleteVocabulary: (vocabId: string) => Promise<void>;
  recordVocabReview: (vocabId: string, wasCorrect: boolean) => Promise<void>;
  completeGrammarLesson: (
    topicId: string,
    category: 'Basic Grammar' | 'Tenses' | 'Advanced Grammar',
    score: number
  ) => Promise<void>;
  recordQuizResult: (
    quizType: QuizResult['quizType'],
    topic: string,
    score: number,
    totalQuestions: number
  ) => Promise<void>;
  saveSpeakingSession: (params: {
    sessionType: SpeakingSession['sessionType'];
    topic: string;
    tutorId?: string;
    peerId?: string;
    durationSeconds: number;
    rating?: number;
    summaryText?: string;
    transcript?: TranscriptEntry[];
  }) => Promise<void>;
  updateTutorPreferences: (patch: Partial<TutorPreference>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  completeTodayChallenge: (customTitle?: string, customXp?: number) => Promise<void>;
  recordLearningInsight: (params: {
    sourceModule: LearningInsight['sourceModule'];
    mistakeOriginal: string;
    correction: string;
    explanation: string;
    grammarTopicId?: string;
    vocabWord?: string;
  }) => Promise<void>;
  recordPronunciationEvidence: (matchPercentage: number) => Promise<void>;
  savePersonalizedPath: (path: PersonalizedLearningPath) => Promise<void>;
  saveEvaluationReport: (report: LearningEvaluationReport) => Promise<void>;
  saveAiDailyChallenge: (challenge: AiDailyChallenge) => Promise<void>;
  blockUser: (targetUid: string) => Promise<void>;
  unblockUser: (targetUid: string) => Promise<void>;
  reportUser: (targetUid: string, reason: string) => Promise<void>;
  speakText: (
    text: string,
    accent?: EnglishAccent,
    voiceName?: string,
    speed?: SpeakingSpeed
  ) => Promise<void>;
  isSpeakingAudio: boolean;
  lastError: string | null;
  clearLastError: () => void;
}

const LinguaContext = createContext<LinguaContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(val: unknown): string {
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export function LinguaProvider({ children }: { children: React.ReactNode }) {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(isAutostart);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const [activeRoute, setActiveRoute] = useState<NavRoute>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const [account, setAccount] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [sentences, setSentences] = useState<VocabularySentence[]>([]);
  const [grammarProgress, setGrammarProgress] = useState<GrammarLessonProgress[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [speakingSessions, setSpeakingSessions] = useState<SpeakingSession[]>([]);
  const [tutorPrefs, setTutorPrefs] = useState<TutorPreference | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [achievements, setAchievements] = useState<AchievementUnlock[]>([]);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallengeProgress[]>([]);
  const [learningInsights, setLearningInsights] = useState<LearningInsight[]>([]);
  const [learnerMemory, setLearnerMemory] = useState<LearnerMemoryDoc | null>(null);
  const [focusedGrammarTopicId, setFocusedGrammarTopicId] = useState<string | null>(null);
  const [focusedVocabId, setFocusedVocabId] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState('');
  const [serverHealth, setServerHealth] = useState<{
    ok: boolean;
    geminiConfigured: boolean;
    webrtcSignaling: boolean;
  } | null>(null);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);

  const ttsCacheRef = useRef<Map<string, string>>(new Map());
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode((d) => !d), []);

  const navigateToGrammarTopic = useCallback((topicId: string) => {
    setFocusedGrammarTopicId(topicId);
    setActiveRoute('grammar');
  }, []);

  const navigateToVocabPractice = useCallback((vocabId: string) => {
    setFocusedVocabId(vocabId);
    setActiveRoute('vocabulary');
  }, []);

  const openAssistantWithPrompt = useCallback((prompt?: string) => {
    setAssistantInitialPrompt(prompt || '');
    setAssistantOpen(true);
  }, []);

  // Check Firestore connection and server health on mount
  useEffect(() => {
    testConnection();
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setServerHealth(d))
      .catch(() => setServerHealth({ ok: false, geminiConfigured: false, webrtcSignaling: false }));
  }, []);

  // Seed preview workspace ONLY when explicitly in Preview Mode (?autostart=1 or user clicks preview)
  const seedPreviewWorkspace = useCallback(() => {
    const now = new Date().toISOString();
    setAccount({
      uid: 'preview',
      email: 'learner@lingua.app',
      role: 'learner',
      audioConsentGranted: false,
      blockedUserIds: [],
      createdAt: now,
      updatedAt: now,
    });
    setProfile({
      uid: 'preview',
      displayName: 'Alex Pratama',
      level: 'B1-B2',
      learningGoals: 'Speak confidently in international meetings and daily conversations.',
      preferredAccent: 'American',
      dailyTargetMinutes: 25,
      streakDays: 4,
      xpPoints: 240,
      onboardingCompleted: true,
      isOnline: true,
      updatedAt: now,
    });
    setProgress({
      userId: 'preview',
      vocabTotal: 1,
      vocabMastered: 0,
      grammarCompleted: 2,
      speakingMinutes: 14,
      lastModule: 'vocabulary',
      lastLessonTitle: 'Vocabulary: improve',
      weeklyMinutes: [15, 22, 18, 25, 12, 30, 14],
      updatedAt: now,
    });
    setVocabulary([STARTER_VOCAB]);
    setSentences(STARTER_SENTENCES);
    setTutorPrefs({
      userId: 'preview',
      selectedTutorId: 'emma',
      preferredMode: 'Friendly Conversation',
      showTranslations: true,
      speakingSpeed: 'normal',
      updatedAt: now,
    });
    setLearnerMemory({
      userId: 'preview',
      grammarWeaknesses: ['Simple Past', 'Present Perfect'],
      weakVocabWords: ['improve'],
      recentSessionSummaries: [],
      pronunciationSamplesCount: 0,
      pronunciationAvgMatch: 0,
      updatedAt: now,
    });
    setLearningInsights([
      {
        id: 'insight-preview-1',
        userId: 'preview',
        sourceModule: 'ai-tutor',
        mistakeOriginal: 'Yesterday I go to the client office.',
        correction: 'Yesterday I went to the client office.',
        explanation: 'Completed past time marker "Yesterday" requires Simple Past (went).',
        grammarTopicId: 'simple-past',
        vocabWord: '',
        createdAt: now,
      },
    ]);
    setNotifications([
      {
        id: 'notif-welcome',
        userId: 'preview',
        type: 'challenge',
        title: 'Daily Challenge Ready',
        body: getTodayChallenge().title,
        read: false,
        actionRoute: 'daily-challenge',
        createdAt: now,
      },
      {
        id: 'notif-review',
        userId: 'preview',
        type: 'review',
        title: '1 Vocabulary Word Due for Review',
        body: 'Review "improve" to strengthen long-term recall.',
        read: false,
        actionRoute: 'review-vocabulary',
        createdAt: now,
      },
    ]);
  }, []);

  useEffect(() => {
    if (isPreviewMode) {
      seedPreviewWorkspace();
    }
  }, [isPreviewMode, seedPreviewWorkspace]);

  // Firebase Auth listener & initial user document provisioning
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);

      if (user) {
        setIsPreviewMode(false);
        const uid = user.uid;
        try {
          const userDocRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists() && user.emailVerified) {
            await setDoc(userDocRef, {
              uid,
              email: clampString(user.email || `${uid}@lingua.local`, 254),
              role: 'learner',
              audioConsentGranted: false,
              blockedUserIds: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          const profileRef = doc(db, 'userProfiles', uid);
          const profileSnap = await getDoc(profileRef);
          if (!profileSnap.exists() && user.emailVerified) {
            await setDoc(profileRef, {
              uid,
              displayName: clampString(user.displayName || user.email?.split('@')[0] || 'Learner', 80),
              photoURL: clampString(user.photoURL || '', 512),
              level: 'B1-B2',
              learningGoals: 'Build daily speaking confidence and expand active vocabulary.',
              preferredAccent: 'American',
              dailyTargetMinutes: 20,
              streakDays: 1,
              xpPoints: 50,
              onboardingCompleted: false,
              isOnline: true,
              updatedAt: serverTimestamp(),
            });
          } else if (profileSnap.exists() && user.emailVerified) {
            await updateDoc(profileRef, {
              isOnline: true,
              updatedAt: serverTimestamp(),
            });
          }

          const progressRef = doc(db, 'learningProgress', uid);
          const progressSnap = await getDoc(progressRef);
          if (!progressSnap.exists() && user.emailVerified) {
            await setDoc(progressRef, {
              userId: uid,
              vocabTotal: 0,
              vocabMastered: 0,
              grammarCompleted: 0,
              speakingMinutes: 0,
              lastModule: 'grammar',
              lastLessonTitle: 'Simple Present Tense',
              weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
              updatedAt: serverTimestamp(),
            });
          }

          const tutorRef = doc(db, 'tutorPreferences', uid);
          const tutorSnap = await getDoc(tutorRef);
          if (!tutorSnap.exists() && user.emailVerified) {
            await setDoc(tutorRef, {
              userId: uid,
              selectedTutorId: 'emma',
              preferredMode: 'Friendly Conversation',
              showTranslations: true,
              speakingSpeed: 'normal',
              updatedAt: serverTimestamp(),
            });
          }

          const memoryRef = doc(db, 'learnerMemories', uid);
          const memorySnap = await getDoc(memoryRef);
          if (!memorySnap.exists() && user.emailVerified) {
            await setDoc(memoryRef, {
              userId: uid,
              grammarWeaknesses: [],
              weakVocabWords: [],
              recentSessionSummaries: [],
              pronunciationSamplesCount: 0,
              pronunciationAvgMatch: 0,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error('Bootstrap user profile failed:', err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Firestore real-time subscriptions when authenticated and verified
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || isPreviewMode) return;
    const uid = firebaseUser.uid;
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setAccount({
              uid: d.uid,
              email: d.email,
              role: d.role,
              audioConsentGranted: Boolean(d.audioConsentGranted),
              blockedUserIds: Array.isArray(d.blockedUserIds) ? d.blockedUserIds : [],
              createdAt: toIso(d.createdAt),
              updatedAt: toIso(d.updatedAt),
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'userProfiles', uid),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setProfile({
              uid: d.uid,
              displayName: d.displayName,
              photoURL: d.photoURL,
              level: d.level,
              learningGoals: d.learningGoals || '',
              preferredAccent: d.preferredAccent,
              dailyTargetMinutes: d.dailyTargetMinutes,
              streakDays: d.streakDays,
              xpPoints: d.xpPoints,
              onboardingCompleted: Boolean(d.onboardingCompleted),
              isOnline: Boolean(d.isOnline),
              updatedAt: toIso(d.updatedAt),
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `userProfiles/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'learningProgress', uid),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setProgress({
              userId: d.userId,
              vocabTotal: d.vocabTotal,
              vocabMastered: d.vocabMastered,
              grammarCompleted: d.grammarCompleted,
              speakingMinutes: d.speakingMinutes,
              lastModule: d.lastModule,
              lastLessonTitle: d.lastLessonTitle,
              weeklyMinutes: Array.isArray(d.weeklyMinutes) ? d.weeklyMinutes : [0, 0, 0, 0, 0, 0, 0],
              updatedAt: toIso(d.updatedAt),
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `learningProgress/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'tutorPreferences', uid),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setTutorPrefs({
              userId: d.userId,
              selectedTutorId: d.selectedTutorId,
              preferredMode: d.preferredMode,
              showTranslations: Boolean(d.showTranslations),
              speakingSpeed: d.speakingSpeed,
              updatedAt: toIso(d.updatedAt),
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `tutorPreferences/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'vocabulary'), where('userId', '==', uid)),
        (snap) => {
          const rows: VocabularyItem[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              userId: d.userId,
              word: d.word,
              meaningId: d.meaningId,
              category: d.category,
              ipa: d.ipa || '',
              grammarExplanation: d.grammarExplanation || '',
              commonUsage: d.commonUsage || '',
              synonyms: Array.isArray(d.synonyms) ? d.synonyms : [],
              antonyms: Array.isArray(d.antonyms) ? d.antonyms : [],
              collocations: Array.isArray(d.collocations) ? d.collocations : [],
              phrasalVerbs: Array.isArray(d.phrasalVerbs) ? d.phrasalVerbs : [],
              relatedWords: Array.isArray(d.relatedWords) ? d.relatedWords : [],
              commonMistakes: Array.isArray(d.commonMistakes) ? d.commonMistakes : [],
              dailyConversations: Array.isArray(d.dailyConversations) ? d.dailyConversations : [],
              masteryStatus: d.masteryStatus,
              reviewCount: d.reviewCount || 0,
              errorCount: d.errorCount || 0,
              isFavorite: Boolean(d.isFavorite),
              nextReviewAt: toIso(d.nextReviewAt),
              createdAt: toIso(d.createdAt),
              updatedAt: toIso(d.updatedAt),
            };
          });
          setVocabulary(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'vocabulary')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'learningInsights'), where('userId', '==', uid)),
        (snap) => {
          const rows: LearningInsight[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              userId: d.userId,
              sourceModule: d.sourceModule,
              mistakeOriginal: d.mistakeOriginal || '',
              correction: d.correction || '',
              explanation: d.explanation || '',
              grammarTopicId: d.grammarTopicId || '',
              vocabWord: d.vocabWord || '',
              createdAt: toIso(d.createdAt),
            };
          });
          setLearningInsights(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'learningInsights')
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'learnerMemories', uid),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const safeParse = <T,>(raw: unknown): T | undefined => {
              if (typeof raw !== 'string' || !raw) return undefined;
              try {
                return JSON.parse(raw) as T;
              } catch {
                return undefined;
              }
            };
            setLearnerMemory({
              userId: d.userId,
              grammarWeaknesses: Array.isArray(d.grammarWeaknesses) ? d.grammarWeaknesses : [],
              weakVocabWords: Array.isArray(d.weakVocabWords) ? d.weakVocabWords : [],
              recentSessionSummaries: Array.isArray(d.recentSessionSummaries) ? d.recentSessionSummaries : [],
              pronunciationSamplesCount: Number(d.pronunciationSamplesCount || 0),
              pronunciationAvgMatch: Number(d.pronunciationAvgMatch || 0),
              personalizedPath: safeParse<PersonalizedLearningPath>(d.personalizedPathJson),
              lastEvaluation: safeParse<LearningEvaluationReport>(d.lastEvaluationJson),
              dailyChallenge: safeParse<AiDailyChallenge>(d.dailyChallengeJson),
              updatedAt: toIso(d.updatedAt),
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `learnerMemories/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'vocabularySentences'), where('userId', '==', uid)),
        (snap) => {
          const rows: VocabularySentence[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              userId: d.userId,
              vocabId: d.vocabId,
              tense: d.tense,
              sentence: d.sentence,
              translationId: d.translationId,
              formula: d.formula,
              subject: d.subject || '',
              verb: d.verb || '',
              objectComplement: d.objectComplement || '',
              structureReason: d.structureReason || '',
              dailyUsage: d.dailyUsage || '',
              affirmative: d.affirmative || '',
              negative: d.negative || '',
              interrogative: d.interrogative || '',
              createdAt: toIso(d.createdAt),
            };
          });
          setSentences(rows);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'vocabularySentences')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'grammarLessons'), where('userId', '==', uid)),
        (snap) => {
          setGrammarProgress(
            snap.docs.map((docSnap) => {
              const d = docSnap.data();
              return {
                id: d.id,
                userId: d.userId,
                topicId: d.topicId,
                category: d.category,
                completed: Boolean(d.completed),
                quizScore: d.quizScore || 0,
                updatedAt: toIso(d.updatedAt),
              };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'grammarLessons')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'quizResults'), where('userId', '==', uid)),
        (snap) => {
          const rows: QuizResult[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              userId: d.userId,
              quizType: d.quizType,
              topic: d.topic,
              score: d.score,
              totalQuestions: d.totalQuestions,
              createdAt: toIso(d.createdAt),
            };
          });
          setQuizResults(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'quizResults')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'speakingSessions'), where('participantIds', 'array-contains', uid)),
        (snap) => {
          const rows: SpeakingSession[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              hostId: d.hostId,
              peerId: d.peerId,
              participantIds: d.participantIds,
              sessionType: d.sessionType,
              topic: d.topic,
              tutorId: d.tutorId,
              durationSeconds: d.durationSeconds,
              rating: d.rating,
              status: d.status,
              summaryText: d.summaryText,
              createdAt: toIso(d.createdAt),
              updatedAt: toIso(d.updatedAt),
            };
          });
          setSpeakingSessions(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'speakingSessions')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', uid)),
        (snap) => {
          const rows: NotificationItem[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              userId: d.userId,
              type: d.type,
              title: d.title,
              body: d.body,
              read: Boolean(d.read),
              actionRoute: d.actionRoute || 'dashboard',
              createdAt: toIso(d.createdAt),
            };
          });
          setNotifications(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'achievements'), where('userId', '==', uid)),
        (snap) => {
          setAchievements(
            snap.docs.map((docSnap) => {
              const d = docSnap.data();
              return {
                id: d.id,
                userId: d.userId,
                badgeKey: d.badgeKey,
                title: d.title,
                description: d.description || '',
                unlockedAt: toIso(d.unlockedAt),
              };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'achievements')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'dailyChallenges'), where('userId', '==', uid)),
        (snap) => {
          setDailyChallenges(
            snap.docs.map((docSnap) => {
              const d = docSnap.data();
              return {
                id: d.id,
                userId: d.userId,
                dateKey: d.dateKey,
                title: d.title,
                completed: Boolean(d.completed),
                xpAwarded: d.xpAwarded,
                completedAt: toIso(d.completedAt),
              };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'dailyChallenges')
      )
    );

    return () => unsubs.forEach((fn) => fn());
  }, [firebaseUser, isPreviewMode]);

  const enterPreviewMode = useCallback(() => {
    setIsPreviewMode(true);
    setAuthError(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google Sign-In failed.');
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        setAuthError(
          'Please verify your email address via the link sent to your inbox before syncing to Firestore.'
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('operation-not-allowed')) {
        setAuthError(
          'Email/Password sign-in is not yet enabled in Firebase Console (Authentication > Sign-in method). Use Google Sign-In or enable Email/Password in Firebase Console.'
        );
      } else {
        setAuthError(msg);
      }
    }
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateFirebaseAuthProfile(cred.user, { displayName: displayName.trim() });
      await sendEmailVerification(cred.user);
      setAuthError('Account created! Please check your email inbox to verify your email address, or sign in with Google.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('operation-not-allowed')) {
        setAuthError(
          'Email/Password registration requires enabling the Email/Password provider in Firebase Console (Authentication > Sign-in method). You can sign in immediately with Google Sign-In.'
        );
      } else {
        setAuthError(msg);
      }
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to send password reset email.');
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    if (firebaseUser && !isPreviewMode && firebaseUser.emailVerified) {
      try {
        await updateDoc(doc(db, 'userProfiles', firebaseUser.uid), {
          isOnline: false,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Ignore offline update on signout
      }
    }
    setIsPreviewMode(false);
    setAccount(null);
    setProfile(null);
    setVocabulary([]);
    setSentences([]);
    await signOut(auth);
  }, [firebaseUser, isPreviewMode]);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const clearLastError = useCallback(() => setLastError(null), []);

  const canWriteFirestore = Boolean(firebaseUser && firebaseUser.emailVerified && !isPreviewMode);

  const pushNotification = useCallback(
    async (
      type: NotificationItem['type'],
      title: string,
      body: string,
      actionRoute: string
    ) => {
      const uid = firebaseUser?.uid || 'preview';
      const id = makeId('notif');
      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'notifications', id), {
            id,
            userId: uid,
            type,
            title: clampString(title, 120),
            body: clampString(body, 400),
            read: false,
            actionRoute: clampString(actionRoute, 80),
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `notifications/${id}`);
        }
      } else {
        setNotifications((prev) => [
          { id, userId: uid, type, title, body, read: false, actionRoute, createdAt: new Date().toISOString() },
          ...prev,
        ]);
      }
    },
    [canWriteFirestore, firebaseUser]
  );

  const checkAndUnlockAchievements = useCallback(
    async (override?: Partial<{ vocabTotal: number; vocabMastered: number; grammarCompleted: number; speakingMinutes: number; streakDays: number; sentenceBuilderCount: number }>) => {
      const stats = {
        vocabTotal: override?.vocabTotal ?? vocabulary.length,
        vocabMastered:
          override?.vocabMastered ?? vocabulary.filter((v) => v.masteryStatus === 'Mastered').length,
        grammarCompleted:
          override?.grammarCompleted ?? grammarProgress.filter((g) => g.completed).length,
        speakingMinutes: override?.speakingMinutes ?? (progress?.speakingMinutes || 0),
        streakDays: override?.streakDays ?? (profile?.streakDays || 1),
        sentenceBuilderCount:
          override?.sentenceBuilderCount ??
          quizResults.filter((q) => q.quizType === 'sentence-builder').length,
      };
      const unlockedKeys = computeUnlockedAchievementKeys(stats);
      const existingKeys = new Set(achievements.map((a) => a.badgeKey));

      for (const key of unlockedKeys) {
        if (!existingKeys.has(key)) {
          const badge = ACHIEVEMENT_BADGES.find((b) => b.key === key);
          if (!badge) continue;
          const uid = firebaseUser?.uid || 'preview';
          const id = `${uid}_${key}`;
          if (canWriteFirestore) {
            try {
              await setDoc(doc(db, 'achievements', id), {
                id,
                userId: uid,
                badgeKey: key,
                title: clampString(badge.title, 100),
                description: clampString(badge.description, 240),
                unlockedAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `achievements/${id}`);
            }
          } else {
            setAchievements((prev) => [
              ...prev,
              {
                id,
                userId: uid,
                badgeKey: key,
                title: badge.title,
                description: badge.description,
                unlockedAt: new Date().toISOString(),
              },
            ]);
          }
          await pushNotification(
            'achievement',
            `Achievement Unlocked: ${badge.title}`,
            badge.description,
            'achievements'
          );
        }
      }
    },
    [
      achievements,
      canWriteFirestore,
      firebaseUser,
      grammarProgress,
      profile,
      progress,
      pushNotification,
      quizResults,
      vocabulary,
    ]
  );

  const completeOnboarding = useCallback(
    async (payload: {
      level: EnglishLevel;
      learningGoals: string;
      preferredAccent: EnglishAccent;
      dailyTargetMinutes: number;
      placementScore?: number;
      placementTotal?: number;
    }) => {
      const uid = firebaseUser?.uid || 'preview';
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'userProfiles', uid), {
            level: payload.level,
            learningGoals: clampString(payload.learningGoals, 300),
            preferredAccent: payload.preferredAccent,
            dailyTargetMinutes: Math.min(240, Math.max(5, payload.dailyTargetMinutes)),
            onboardingCompleted: true,
            updatedAt: serverTimestamp(),
          });
          if (payload.placementTotal && payload.placementTotal > 0) {
            const qId = makeId('quiz');
            await setDoc(doc(db, 'quizResults', qId), {
              id: qId,
              userId: uid,
              quizType: 'placement',
              topic: 'Onboarding Assessment',
              score: Math.round(((payload.placementScore || 0) / payload.placementTotal) * 100),
              totalQuestions: payload.placementTotal,
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `userProfiles/${uid}`);
        }
      } else {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                level: payload.level,
                learningGoals: payload.learningGoals,
                preferredAccent: payload.preferredAccent,
                dailyTargetMinutes: payload.dailyTargetMinutes,
                onboardingCompleted: true,
                updatedAt: new Date().toISOString(),
              }
            : prev
        );
      }
    },
    [canWriteFirestore, firebaseUser]
  );

  const updateUserProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      const uid = firebaseUser?.uid || 'preview';
      if (canWriteFirestore) {
        try {
          const sanitized: Record<string, unknown> = { updatedAt: serverTimestamp() };
          if (patch.displayName !== undefined) sanitized.displayName = clampString(patch.displayName, 80);
          if (patch.photoURL !== undefined) sanitized.photoURL = clampString(patch.photoURL, 512);
          if (patch.level !== undefined) sanitized.level = patch.level;
          if (patch.learningGoals !== undefined) sanitized.learningGoals = clampString(patch.learningGoals, 300);
          if (patch.preferredAccent !== undefined) sanitized.preferredAccent = patch.preferredAccent;
          if (patch.dailyTargetMinutes !== undefined)
            sanitized.dailyTargetMinutes = Math.min(240, Math.max(5, Number(patch.dailyTargetMinutes)));
          if (patch.xpPoints !== undefined) sanitized.xpPoints = patch.xpPoints;
          if (patch.streakDays !== undefined) sanitized.streakDays = patch.streakDays;
          if (patch.isOnline !== undefined) sanitized.isOnline = patch.isOnline;
          await updateDoc(doc(db, 'userProfiles', uid), sanitized);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `userProfiles/${uid}`);
        }
      } else {
        setProfile((prev) => (prev ? { ...prev, ...patch, updatedAt: new Date().toISOString() } : prev));
      }
    },
    [canWriteFirestore, firebaseUser]
  );

  const grantAudioConsent = useCallback(
    async (granted: boolean) => {
      const uid = firebaseUser?.uid || 'preview';
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'users', uid), {
            audioConsentGranted: granted,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
        }
      } else {
        setAccount((prev) => (prev ? { ...prev, audioConsentGranted: granted } : prev));
      }
    },
    [canWriteFirestore, firebaseUser]
  );

  const addVocabularyWithAI = useCallback(
    async (rawWord: string): Promise<VocabularyItem> => {
      const existing = findDuplicateVocabulary(vocabulary, rawWord);
      if (existing) {
        throw new Error(`DUPLICATE_WORD:${existing.id}:${existing.word}`);
      }

      const res = await fetch('/api/ai/vocabulary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: rawWord.trim(), level: profile?.level || 'B1-B2' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate vocabulary details.');
      }

      const uid = firebaseUser?.uid || 'preview';
      const vocabId = makeId('vocab');
      const validCategories: VocabCategory[] = [
        'noun',
        'verb',
        'adjective',
        'adverb',
        'preposition',
        'phrase',
        'other',
      ];
      const category = validCategories.includes(data.category) ? data.category : 'other';
      const nowIso = new Date().toISOString();

      const dailyConversations: VocabularyDailyConversation[] = Array.isArray(data.dailyConversations)
        ? data.dailyConversations.slice(0, 6).map((c: Record<string, string>) => ({
            speaker: clampString(c?.speaker || 'A', 40),
            line: clampString(c?.line || '', 240),
            translationId: clampString(c?.translationId || '', 240),
          }))
        : [];

      const item: VocabularyItem = {
        id: vocabId,
        userId: uid,
        word: clampString(data.word || rawWord, 80),
        meaningId: clampString(data.meaningId, 200),
        category,
        ipa: clampString(data.ipa, 100),
        commonUsage: clampString(data.commonUsage || '', 600),
        grammarExplanation: clampString(data.grammarExplanation, 1500),
        synonyms: clampStringArray(data.synonyms, 12),
        antonyms: clampStringArray(data.antonyms, 12),
        collocations: clampStringArray(data.collocations, 12),
        phrasalVerbs: clampStringArray(data.phrasalVerbs, 12),
        relatedWords: clampStringArray(data.relatedWords, 12),
        commonMistakes: clampStringArray(data.commonMistakes, 8),
        dailyConversations,
        masteryStatus: 'New',
        reviewCount: 0,
        errorCount: 0,
        isFavorite: false,
        nextReviewAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const rawSentences = Array.isArray(data.sentences) ? data.sentences : [];
      const generatedSentences: VocabularySentence[] = rawSentences.map((s: Record<string, string>) => ({
        id: makeId('sent'),
        userId: uid,
        vocabId,
        tense: clampString(s.tense, 80),
        sentence: clampString(s.sentence, 300),
        translationId: clampString(s.translationId, 300),
        formula: clampString(s.formula, 160),
        subject: clampString(s.subject, 80),
        verb: clampString(s.verb, 80),
        objectComplement: clampString(s.objectComplement, 160),
        structureReason: clampString(s.structureReason, 400),
        dailyUsage: clampString(s.dailyUsage, 400),
        affirmative: clampString(s.affirmative, 300),
        negative: clampString(s.negative, 300),
        interrogative: clampString(s.interrogative, 300),
        createdAt: nowIso,
      }));

      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'vocabulary', vocabId), {
            ...item,
            nextReviewAt: Timestamp.fromDate(new Date()),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          for (const sent of generatedSentences) {
            await setDoc(doc(db, 'vocabularySentences', sent.id), {
              ...sent,
              createdAt: serverTimestamp(),
            });
          }
          await updateDoc(doc(db, 'learningProgress', uid), {
            vocabTotal: vocabulary.length + 1,
            lastModule: 'vocabulary',
            lastLessonTitle: `Vocabulary: ${item.word}`,
            updatedAt: serverTimestamp(),
          });
          await updateUserProfile({ xpPoints: (profile?.xpPoints || 0) + 15 });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `vocabulary/${vocabId}`);
        }
      } else {
        setVocabulary((prev) => [item, ...prev]);
        setSentences((prev) => [...generatedSentences, ...prev]);
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                vocabTotal: prev.vocabTotal + 1,
                lastModule: 'vocabulary',
                lastLessonTitle: `Vocabulary: ${item.word}`,
              }
            : prev
        );
        setProfile((prev) => (prev ? { ...prev, xpPoints: prev.xpPoints + 15 } : prev));
      }

      await checkAndUnlockAchievements({ vocabTotal: vocabulary.length + 1 });
      return item;
    },
    [
      canWriteFirestore,
      checkAndUnlockAchievements,
      firebaseUser,
      profile,
      updateUserProfile,
      vocabulary,
    ]
  );

  const saveWordFromAnywhere = useCallback(
    async (rawWord: string): Promise<{ item: VocabularyItem; existed: boolean }> => {
      const existing = findDuplicateVocabulary(vocabulary, rawWord);
      if (existing) {
        return { item: existing, existed: true };
      }
      const created = await addVocabularyWithAI(rawWord);
      return { item: created, existed: false };
    },
    [addVocabularyWithAI, vocabulary]
  );

  const toggleFavoriteVocab = useCallback(
    async (vocabId: string) => {
      const target = vocabulary.find((v) => v.id === vocabId);
      if (!target) return;
      const nextFav = !target.isFavorite;
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'vocabulary', vocabId), {
            isFavorite: nextFav,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `vocabulary/${vocabId}`);
        }
      } else {
        setVocabulary((prev) =>
          prev.map((v) => (v.id === vocabId ? { ...v, isFavorite: nextFav } : v))
        );
      }
    },
    [canWriteFirestore, vocabulary]
  );

  const deleteVocabulary = useCallback(
    async (vocabId: string) => {
      if (canWriteFirestore) {
        try {
          await deleteDoc(doc(db, 'vocabulary', vocabId));
          const linked = sentences.filter((s) => s.vocabId === vocabId);
          for (const s of linked) {
            await deleteDoc(doc(db, 'vocabularySentences', s.id));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `vocabulary/${vocabId}`);
        }
      } else {
        setVocabulary((prev) => prev.filter((v) => v.id !== vocabId));
        setSentences((prev) => prev.filter((s) => s.vocabId !== vocabId));
      }
    },
    [canWriteFirestore, sentences]
  );

  const recordVocabReview = useCallback(
    async (vocabId: string, wasCorrect: boolean) => {
      const item = vocabulary.find((v) => v.id === vocabId);
      if (!item) return;
      const next = computeNextReview(item, wasCorrect);
      const uid = firebaseUser?.uid || 'preview';

      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'vocabulary', vocabId), {
            masteryStatus: next.masteryStatus,
            reviewCount: next.reviewCount,
            errorCount: next.errorCount,
            nextReviewAt: Timestamp.fromDate(new Date(next.nextReviewAt)),
            updatedAt: serverTimestamp(),
          });
          const masteredCount = vocabulary.filter((v) =>
            v.id === vocabId ? next.masteryStatus === 'Mastered' : v.masteryStatus === 'Mastered'
          ).length;
          await updateDoc(doc(db, 'learningProgress', uid), {
            vocabMastered: masteredCount,
            updatedAt: serverTimestamp(),
          });
          await updateUserProfile({ xpPoints: (profile?.xpPoints || 0) + (wasCorrect ? 10 : 3) });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `vocabulary/${vocabId}`);
        }
      } else {
        setVocabulary((prev) =>
          prev.map((v) =>
            v.id === vocabId
              ? {
                  ...v,
                  masteryStatus: next.masteryStatus,
                  reviewCount: next.reviewCount,
                  errorCount: next.errorCount,
                  nextReviewAt: next.nextReviewAt,
                }
              : v
          )
        );
        setProfile((prev) =>
          prev ? { ...prev, xpPoints: prev.xpPoints + (wasCorrect ? 10 : 3) } : prev
        );
      }
    },
    [canWriteFirestore, firebaseUser, profile, updateUserProfile, vocabulary]
  );

  const completeGrammarLesson = useCallback(
    async (
      topicId: string,
      category: 'Basic Grammar' | 'Tenses' | 'Advanced Grammar',
      score: number
    ) => {
      const uid = firebaseUser?.uid || 'preview';
      const lessonId = `${uid}_${topicId}`;
      const existing = grammarProgress.find((g) => g.topicId === topicId);

      if (canWriteFirestore) {
        try {
          if (existing) {
            await updateDoc(doc(db, 'grammarLessons', lessonId), {
              completed: true,
              quizScore: score,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(doc(db, 'grammarLessons', lessonId), {
              id: lessonId,
              userId: uid,
              topicId: clampString(topicId, 80),
              category,
              completed: true,
              quizScore: score,
              updatedAt: serverTimestamp(),
            });
          }
          const completedCount = new Set([
            ...grammarProgress.filter((g) => g.completed).map((g) => g.topicId),
            topicId,
          ]).size;
          await updateDoc(doc(db, 'learningProgress', uid), {
            grammarCompleted: completedCount,
            lastModule: 'grammar',
            lastLessonTitle: `Grammar: ${topicId}`,
            updatedAt: serverTimestamp(),
          });
          await updateUserProfile({ xpPoints: (profile?.xpPoints || 0) + 25 });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `grammarLessons/${lessonId}`);
        }
      } else {
        setGrammarProgress((prev) => {
          const without = prev.filter((g) => g.topicId !== topicId);
          return [
            ...without,
            {
              id: lessonId,
              userId: uid,
              topicId,
              category,
              completed: true,
              quizScore: score,
              updatedAt: new Date().toISOString(),
            },
          ];
        });
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                grammarCompleted: prev.grammarCompleted + (existing ? 0 : 1),
                lastModule: 'grammar',
                lastLessonTitle: `Grammar: ${topicId}`,
              }
            : prev
        );
      }

      await checkAndUnlockAchievements({
        grammarCompleted: grammarProgress.filter((g) => g.completed).length + (existing ? 0 : 1),
      });
    },
    [canWriteFirestore, checkAndUnlockAchievements, firebaseUser, grammarProgress, profile, updateUserProfile]
  );

  const recordQuizResult = useCallback(
    async (
      quizType: QuizResult['quizType'],
      topic: string,
      score: number,
      totalQuestions: number
    ) => {
      const uid = firebaseUser?.uid || 'preview';
      const id = makeId('quiz');
      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'quizResults', id), {
            id,
            userId: uid,
            quizType,
            topic: clampString(topic, 120),
            score: Math.min(100, Math.max(0, Math.round(score))),
            totalQuestions: Math.max(1, totalQuestions),
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `quizResults/${id}`);
        }
      } else {
        setQuizResults((prev) => [
          {
            id,
            userId: uid,
            quizType,
            topic,
            score,
            totalQuestions,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      await checkAndUnlockAchievements();
    },
    [canWriteFirestore, checkAndUnlockAchievements, firebaseUser]
  );

  const saveSpeakingSession = useCallback(
    async (params: {
      sessionType: SpeakingSession['sessionType'];
      topic: string;
      tutorId?: string;
      peerId?: string;
      durationSeconds: number;
      rating?: number;
      summaryText?: string;
      transcript?: TranscriptEntry[];
    }) => {
      const uid = firebaseUser?.uid || 'preview';
      const sessionId = makeId('sess');
      const participantIds = params.peerId && params.peerId !== uid ? [uid, params.peerId] : [uid];
      const addedMinutes = Math.max(1, Math.round(params.durationSeconds / 60));

      if (canWriteFirestore) {
        try {
          const payload: Record<string, unknown> = {
            id: sessionId,
            hostId: uid,
            participantIds,
            sessionType: params.sessionType,
            topic: clampString(params.topic, 120),
            durationSeconds: Math.max(0, Math.round(params.durationSeconds)),
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (params.tutorId) payload.tutorId = clampString(params.tutorId, 64);
          if (params.peerId) payload.peerId = clampString(params.peerId, 128);
          await setDoc(doc(db, 'speakingSessions', sessionId), payload);

          // Save consented transcript before closing session
          if (account?.audioConsentGranted && params.transcript && params.transcript.length > 0) {
            const tId = makeId('tr');
            await setDoc(doc(db, 'conversationTranscripts', tId), {
              id: tId,
              sessionId,
              ownerId: uid,
              participantIds,
              entries: params.transcript.slice(0, 200),
              consentGranted: true,
              createdAt: serverTimestamp(),
            });
          }

          await updateDoc(doc(db, 'speakingSessions', sessionId), {
            status: 'completed',
            ...(params.rating ? { rating: params.rating } : {}),
            ...(params.summaryText ? { summaryText: clampString(params.summaryText, 2000) } : {}),
            updatedAt: serverTimestamp(),
          });

          const newWeekly = [...(progress?.weeklyMinutes || [0, 0, 0, 0, 0, 0, 0])];
          newWeekly[6] = (newWeekly[6] || 0) + addedMinutes;
          await updateDoc(doc(db, 'learningProgress', uid), {
            speakingMinutes: (progress?.speakingMinutes || 0) + addedMinutes,
            weeklyMinutes: newWeekly,
            lastModule: params.sessionType,
            lastLessonTitle: `Speaking: ${params.topic}`,
            updatedAt: serverTimestamp(),
          });
          await updateUserProfile({ xpPoints: (profile?.xpPoints || 0) + 30 });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `speakingSessions/${sessionId}`);
        }
      } else {
        const nowIso = new Date().toISOString();
        setSpeakingSessions((prev) => [
          {
            id: sessionId,
            hostId: uid,
            peerId: params.peerId,
            participantIds,
            sessionType: params.sessionType,
            topic: params.topic,
            tutorId: params.tutorId,
            durationSeconds: params.durationSeconds,
            rating: params.rating,
            status: 'completed',
            summaryText: params.summaryText,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          ...prev,
        ]);
        setProgress((prev) => {
          if (!prev) return prev;
          const weekly = [...prev.weeklyMinutes];
          weekly[6] = (weekly[6] || 0) + addedMinutes;
          return {
            ...prev,
            speakingMinutes: prev.speakingMinutes + addedMinutes,
            weeklyMinutes: weekly,
            lastModule: params.sessionType,
            lastLessonTitle: `Speaking: ${params.topic}`,
          };
        });
      }

      await checkAndUnlockAchievements({
        speakingMinutes: (progress?.speakingMinutes || 0) + addedMinutes,
      });
    },
    [
      account,
      canWriteFirestore,
      checkAndUnlockAchievements,
      firebaseUser,
      profile,
      progress,
      updateUserProfile,
    ]
  );

  const updateTutorPreferences = useCallback(
    async (patch: Partial<TutorPreference>) => {
      const uid = firebaseUser?.uid || 'preview';
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'tutorPreferences', uid), {
            ...patch,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `tutorPreferences/${uid}`);
        }
      } else {
        setTutorPrefs((prev) =>
          prev ? { ...prev, ...patch, updatedAt: new Date().toISOString() } : prev
        );
      }
    },
    [canWriteFirestore, firebaseUser]
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'notifications', id), { read: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
        }
      } else {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      }
    },
    [canWriteFirestore]
  );

  const completeTodayChallenge = useCallback(
    async (customTitle?: string, customXp?: number) => {
      const today = getTodayChallenge();
      const title = customTitle || today.title;
      const xp = customXp || today.xp;
      const uid = firebaseUser?.uid || 'preview';
      const id = `${uid}_${today.dateKey}`;
      if (dailyChallenges.some((d) => d.dateKey === today.dateKey && d.completed)) return;

      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'dailyChallenges', id), {
            id,
            userId: uid,
            dateKey: today.dateKey,
            title: clampString(title, 120),
            completed: true,
            xpAwarded: xp,
            completedAt: serverTimestamp(),
          });
          await updateUserProfile({ xpPoints: (profile?.xpPoints || 0) + xp });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `dailyChallenges/${id}`);
        }
      } else {
        setDailyChallenges((prev) => [
          ...prev,
          {
            id,
            userId: uid,
            dateKey: today.dateKey,
            title,
            completed: true,
            xpAwarded: xp,
            completedAt: new Date().toISOString(),
          },
        ]);
        setProfile((prev) => (prev ? { ...prev, xpPoints: prev.xpPoints + xp } : prev));
      }
    },
    [canWriteFirestore, dailyChallenges, firebaseUser, profile, updateUserProfile]
  );

  const upsertLearnerMemory = useCallback(
    async (patch: {
      grammarWeaknesses?: string[];
      weakVocabWords?: string[];
      recentSessionSummaries?: string[];
      pronunciationSamplesCount?: number;
      pronunciationAvgMatch?: number;
      personalizedPathJson?: string;
      lastEvaluationJson?: string;
      dailyChallengeJson?: string;
      personalizedPath?: PersonalizedLearningPath;
      lastEvaluation?: LearningEvaluationReport;
      dailyChallenge?: AiDailyChallenge;
    }) => {
      const uid = firebaseUser?.uid || 'preview';
      if (canWriteFirestore) {
        try {
          const payload: Record<string, unknown> = {
            userId: uid,
            updatedAt: serverTimestamp(),
          };
          if (patch.grammarWeaknesses)
            payload.grammarWeaknesses = clampStringArray(patch.grammarWeaknesses, 20);
          if (patch.weakVocabWords)
            payload.weakVocabWords = clampStringArray(patch.weakVocabWords, 25);
          if (patch.recentSessionSummaries)
            payload.recentSessionSummaries = clampStringArray(patch.recentSessionSummaries, 10);
          if (patch.pronunciationSamplesCount !== undefined)
            payload.pronunciationSamplesCount = Math.max(0, Math.round(patch.pronunciationSamplesCount));
          if (patch.pronunciationAvgMatch !== undefined)
            payload.pronunciationAvgMatch = Math.min(100, Math.max(0, Math.round(patch.pronunciationAvgMatch)));
          if (patch.personalizedPathJson)
            payload.personalizedPathJson = clampString(patch.personalizedPathJson, 8000);
          if (patch.lastEvaluationJson)
            payload.lastEvaluationJson = clampString(patch.lastEvaluationJson, 8000);
          if (patch.dailyChallengeJson)
            payload.dailyChallengeJson = clampString(patch.dailyChallengeJson, 4000);

          await setDoc(doc(db, 'learnerMemories', uid), payload, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `learnerMemories/${uid}`);
        }
      } else {
        setLearnerMemory((prev) => ({
          userId: uid,
          grammarWeaknesses: patch.grammarWeaknesses ?? prev?.grammarWeaknesses ?? [],
          weakVocabWords: patch.weakVocabWords ?? prev?.weakVocabWords ?? [],
          recentSessionSummaries: patch.recentSessionSummaries ?? prev?.recentSessionSummaries ?? [],
          pronunciationSamplesCount:
            patch.pronunciationSamplesCount ?? prev?.pronunciationSamplesCount ?? 0,
          pronunciationAvgMatch: patch.pronunciationAvgMatch ?? prev?.pronunciationAvgMatch ?? 0,
          personalizedPath: patch.personalizedPath ?? prev?.personalizedPath,
          lastEvaluation: patch.lastEvaluation ?? prev?.lastEvaluation,
          dailyChallenge: patch.dailyChallenge ?? prev?.dailyChallenge,
          updatedAt: new Date().toISOString(),
        }));
      }
    },
    [canWriteFirestore, firebaseUser]
  );

  const recordLearningInsight = useCallback(
    async (params: {
      sourceModule: LearningInsight['sourceModule'];
      mistakeOriginal: string;
      correction: string;
      explanation: string;
      grammarTopicId?: string;
      vocabWord?: string;
    }) => {
      const uid = firebaseUser?.uid || 'preview';
      const id = makeId('ins');
      const nowIso = new Date().toISOString();
      const topicId = params.grammarTopicId || 'simple-present';

      const newInsight: LearningInsight = {
        id,
        userId: uid,
        sourceModule: params.sourceModule,
        mistakeOriginal: clampString(params.mistakeOriginal, 300),
        correction: clampString(params.correction, 300),
        explanation: clampString(params.explanation, 500),
        grammarTopicId: clampString(topicId, 80),
        vocabWord: clampString(params.vocabWord || '', 80),
        createdAt: nowIso,
      };

      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'learningInsights', id), {
            ...newInsight,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `learningInsights/${id}`);
        }
      } else {
        setLearningInsights((prev) => [newInsight, ...prev].slice(0, 40));
      }

      const topicTitle = getGrammarTopicTitle(topicId);
      const nextWeakGrammar = Array.from(
        new Set([topicTitle, ...(learnerMemory?.grammarWeaknesses || [])])
      ).slice(0, 15);
      const nextWeakVocab = params.vocabWord
        ? Array.from(new Set([params.vocabWord, ...(learnerMemory?.weakVocabWords || [])])).slice(0, 20)
        : learnerMemory?.weakVocabWords || [];

      await upsertLearnerMemory({
        grammarWeaknesses: nextWeakGrammar,
        weakVocabWords: nextWeakVocab,
      });
    },
    [canWriteFirestore, firebaseUser, learnerMemory, upsertLearnerMemory]
  );

  const recordPronunciationEvidence = useCallback(
    async (matchPercentage: number) => {
      const prevCount = learnerMemory?.pronunciationSamplesCount || 0;
      const prevAvg = learnerMemory?.pronunciationAvgMatch || 0;
      const nextCount = prevCount + 1;
      const clampedMatch = Math.min(100, Math.max(0, Math.round(matchPercentage)));
      const nextAvg = Math.round((prevAvg * prevCount + clampedMatch) / nextCount);
      await upsertLearnerMemory({
        pronunciationSamplesCount: nextCount,
        pronunciationAvgMatch: nextAvg,
      });
    },
    [learnerMemory, upsertLearnerMemory]
  );

  const savePersonalizedPath = useCallback(
    async (path: PersonalizedLearningPath) => {
      const jsonStr = JSON.stringify(path).slice(0, 8000);
      await upsertLearnerMemory({ personalizedPathJson: jsonStr, personalizedPath: path });
    },
    [upsertLearnerMemory]
  );

  const saveEvaluationReport = useCallback(
    async (report: LearningEvaluationReport) => {
      const jsonStr = JSON.stringify(report).slice(0, 8000);
      await upsertLearnerMemory({ lastEvaluationJson: jsonStr, lastEvaluation: report });
    },
    [upsertLearnerMemory]
  );

  const saveAiDailyChallenge = useCallback(
    async (challenge: AiDailyChallenge) => {
      const jsonStr = JSON.stringify(challenge).slice(0, 4000);
      await upsertLearnerMemory({ dailyChallengeJson: jsonStr, dailyChallenge: challenge });
    },
    [upsertLearnerMemory]
  );

  const blockUser = useCallback(
    async (targetUid: string) => {
      const uid = firebaseUser?.uid || 'preview';
      const nextBlocked = Array.from(new Set([...(account?.blockedUserIds || []), targetUid])).slice(0, 50);
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'users', uid), {
            blockedUserIds: nextBlocked,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
        }
      } else {
        setAccount((prev) => (prev ? { ...prev, blockedUserIds: nextBlocked } : prev));
      }
    },
    [account, canWriteFirestore, firebaseUser]
  );

  const unblockUser = useCallback(
    async (targetUid: string) => {
      const uid = firebaseUser?.uid || 'preview';
      const nextBlocked = (account?.blockedUserIds || []).filter((id) => id !== targetUid);
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'users', uid), {
            blockedUserIds: nextBlocked,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
        }
      } else {
        setAccount((prev) => (prev ? { ...prev, blockedUserIds: nextBlocked } : prev));
      }
    },
    [account, canWriteFirestore, firebaseUser]
  );

  const reportUser = useCallback(
    async (targetUid: string, reason: string) => {
      const uid = firebaseUser?.uid || 'preview';
      const reportId = makeId('rep');
      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'reports', reportId), {
            id: reportId,
            reporterId: uid,
            reportedUserId: clampString(targetUid, 128),
            reason: clampString(reason, 500),
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `reports/${reportId}`);
        }
      }
      await blockUser(targetUid);
    },
    [blockUser, canWriteFirestore, firebaseUser]
  );

  const speakText = useCallback(
    async (text: string, accent?: EnglishAccent, voiceName?: string, speed?: SpeakingSpeed) => {
      const clean = text.trim();
      if (!clean) return;
      const chosenAccent = accent || profile?.preferredAccent || 'American';
      const chosenVoice = voiceName || (chosenAccent === 'British' ? 'Charon' : 'Kore');
      const playbackRate = speed === 'slow' ? 0.82 : speed === 'natural' ? 1.08 : 1.0;
      const cacheKey = `${chosenAccent}:${chosenVoice}:${clean}`;

      try {
        setIsSpeakingAudio(true);
        let base64 = ttsCacheRef.current.get(cacheKey);
        if (!base64) {
          const res = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: clean, accent: chosenAccent, voiceName: chosenVoice }),
          });
          const data = await res.json();
          if (!res.ok || !data.audioBase64) {
            throw new Error(data.error || 'TTS failed');
          }
          base64 = data.audioBase64;
          if (base64) ttsCacheRef.current.set(cacheKey, base64);
        }

        if (audioElRef.current) {
          audioElRef.current.pause();
        }
        const audio = new Audio(`data:audio/wav;base64,${base64}`);
        audio.playbackRate = playbackRate;
        audioElRef.current = audio;
        audio.onended = () => setIsSpeakingAudio(false);
        audio.onerror = () => setIsSpeakingAudio(false);
        await audio.play();
      } catch (err) {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(clean);
          utter.lang = chosenAccent === 'British' ? 'en-GB' : 'en-US';
          utter.rate = playbackRate;
          utter.onend = () => setIsSpeakingAudio(false);
          utter.onerror = () => setIsSpeakingAudio(false);
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        } else {
          setIsSpeakingAudio(false);
          setLastError(err instanceof Error ? err.message : 'Unable to play audio.');
        }
      }
    },
    [profile]
  );

  const learnerContext = useMemo<LearnerContextSummary>(
    () =>
      buildCompactLearnerContext({
        profile,
        progress,
        vocabulary,
        grammarProgress,
        quizResults,
        speakingSessions,
        insights: learningInsights,
        memory: learnerMemory,
      }),
    [
      grammarProgress,
      learnerMemory,
      learningInsights,
      profile,
      progress,
      quizResults,
      speakingSessions,
      vocabulary,
    ]
  );

  const value = useMemo<LinguaContextValue>(
    () => ({
      authReady,
      firebaseUser,
      isPreviewMode,
      enterPreviewMode,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      resetPassword,
      logout,
      authError,
      clearAuthError,
      activeRoute,
      setActiveRoute,
      globalSearch,
      setGlobalSearch,
      darkMode,
      toggleDarkMode,
      account,
      profile,
      progress,
      vocabulary,
      sentences,
      grammarProgress,
      quizResults,
      speakingSessions,
      tutorPrefs,
      notifications,
      achievements,
      dailyChallenges,
      learningInsights,
      learnerMemory,
      learnerContext,
      serverHealth,
      focusedGrammarTopicId,
      setFocusedGrammarTopicId,
      focusedVocabId,
      setFocusedVocabId,
      navigateToGrammarTopic,
      navigateToVocabPractice,
      assistantOpen,
      setAssistantOpen,
      assistantInitialPrompt,
      openAssistantWithPrompt,
      completeOnboarding,
      updateUserProfile,
      grantAudioConsent,
      addVocabularyWithAI,
      saveWordFromAnywhere,
      toggleFavoriteVocab,
      deleteVocabulary,
      recordVocabReview,
      completeGrammarLesson,
      recordQuizResult,
      saveSpeakingSession,
      updateTutorPreferences,
      markNotificationRead,
      completeTodayChallenge,
      recordLearningInsight,
      recordPronunciationEvidence,
      savePersonalizedPath,
      saveEvaluationReport,
      saveAiDailyChallenge,
      blockUser,
      unblockUser,
      reportUser,
      speakText,
      isSpeakingAudio,
      lastError,
      clearLastError,
    }),
    [
      account,
      achievements,
      activeRoute,
      addVocabularyWithAI,
      assistantInitialPrompt,
      assistantOpen,
      authError,
      authReady,
      blockUser,
      clearAuthError,
      clearLastError,
      completeGrammarLesson,
      completeOnboarding,
      completeTodayChallenge,
      dailyChallenges,
      darkMode,
      deleteVocabulary,
      enterPreviewMode,
      firebaseUser,
      focusedGrammarTopicId,
      focusedVocabId,
      globalSearch,
      grammarProgress,
      grantAudioConsent,
      isPreviewMode,
      isSpeakingAudio,
      lastError,
      learnerContext,
      learnerMemory,
      learningInsights,
      logout,
      markNotificationRead,
      navigateToGrammarTopic,
      navigateToVocabPractice,
      notifications,
      openAssistantWithPrompt,
      profile,
      progress,
      quizResults,
      recordLearningInsight,
      recordPronunciationEvidence,
      recordQuizResult,
      recordVocabReview,
      registerWithEmail,
      reportUser,
      resetPassword,
      saveAiDailyChallenge,
      saveEvaluationReport,
      savePersonalizedPath,
      saveSpeakingSession,
      saveWordFromAnywhere,
      sentences,
      serverHealth,
      signInWithEmail,
      signInWithGoogle,
      speakText,
      speakingSessions,
      toggleDarkMode,
      toggleFavoriteVocab,
      tutorPrefs,
      unblockUser,
      updateTutorPreferences,
      updateUserProfile,
      vocabulary,
    ]
  );

  return <LinguaContext.Provider value={value}>{children}</LinguaContext.Provider>;
}

export function useLingua() {
  const ctx = useContext(LinguaContext);
  if (!ctx) throw new Error('useLingua must be used within LinguaProvider');
  return ctx;
}
