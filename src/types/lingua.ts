export type EnglishLevel = 'A1-A2' | 'B1-B2' | 'C1-C2';
export type EnglishAccent = 'American' | 'British';
export type VocabCategory = 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'phrase' | 'other';
export type MasteryStatus = 'New' | 'Learning' | 'Familiar' | 'Mastered';
export type SpeakingSpeed = 'slow' | 'normal' | 'natural';

export type TutorTeachingMode =
  | 'Friendly Conversation'
  | 'Professional Tutor'
  | 'Strict Practice'
  | 'Interview Practice'
  | 'Free Speaking';

export type NavRoute =
  | 'dashboard'
  | 'learning-path'
  | 'daily-challenge'
  | 'vocabulary'
  | 'grammar'
  | 'sentence-builder'
  | 'listening'
  | 'pronunciation'
  | 'ai-tutor'
  | 'speaking-community'
  | 'simulator'
  | 'speaking-history'
  | 'achievements'
  | 'analytics'
  | 'review-vocabulary'
  | 'profile'
  | 'settings';

export interface UserAccount {
  uid: string;
  email: string;
  role: 'learner';
  audioConsentGranted: boolean;
  blockedUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  level: EnglishLevel;
  learningGoals: string;
  preferredAccent: EnglishAccent;
  dailyTargetMinutes: number;
  streakDays: number;
  xpPoints: number;
  onboardingCompleted: boolean;
  isOnline: boolean;
  updatedAt: string;
}

export interface VocabularySentence {
  id: string;
  userId: string;
  vocabId: string;
  tense: string;
  sentence: string;
  translationId: string;
  formula: string;
  subject: string;
  verb: string;
  objectComplement: string;
  structureReason: string;
  dailyUsage: string;
  affirmative: string;
  negative: string;
  interrogative: string;
  createdAt: string;
}

export interface VocabularyDailyConversation {
  speaker: string;
  line: string;
  translationId: string;
}

export interface VocabularyItem {
  id: string;
  userId: string;
  word: string;
  meaningId: string;
  category: VocabCategory;
  ipa: string;
  grammarExplanation: string;
  synonyms: string[];
  antonyms: string[];
  relatedWords: string[];
  commonUsage?: string;
  collocations?: string[];
  phrasalVerbs?: string[];
  commonMistakes?: string[];
  dailyConversations?: VocabularyDailyConversation[];
  masteryStatus: MasteryStatus;
  reviewCount: number;
  errorCount: number;
  isFavorite: boolean;
  nextReviewAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrammarQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GrammarTopic {
  id: string;
  title: string;
  category: 'Basic Grammar' | 'Tenses' | 'Advanced Grammar';
  summary: string;
  simpleExplanation: string;
  formula: string;
  examples: {
    english: string;
    indonesian: string;
    highlight: string;
  }[];
  commonMistakes: {
    incorrect: string;
    correct: string;
    why: string;
  }[];
  quiz: GrammarQuestion[];
}

export interface GrammarLessonProgress {
  id: string;
  userId: string;
  topicId: string;
  category: 'Basic Grammar' | 'Tenses' | 'Advanced Grammar';
  completed: boolean;
  quizScore: number;
  updatedAt: string;
}

export interface GrammarAnalysisResult {
  sentence: string;
  subject: string;
  verb: string;
  object: string;
  complement: string;
  adverbial: string;
  tense: string;
  sentenceStructure: string;
  isCorrect: boolean;
  naturalness: string;
  incorrectSentence: string;
  correctedSentence: string;
  explanation: string;
  grammarPattern: string;
  additionalExamples: string[];
  linkedGrammarTopicId?: string;
}

export interface GrammarTransformResult {
  action: string;
  resultText: string;
  explanation: string;
  wordBreakdown?: { word: string; role: string; note: string }[];
}

export interface LearningProgress {
  userId: string;
  vocabTotal: number;
  vocabMastered: number;
  grammarCompleted: number;
  speakingMinutes: number;
  lastModule: string;
  lastLessonTitle: string;
  weeklyMinutes: number[];
  updatedAt: string;
}

export interface QuizResult {
  id: string;
  userId: string;
  quizType: 'vocabulary' | 'grammar' | 'listening' | 'placement' | 'sentence-builder';
  topic: string;
  score: number;
  totalQuestions: number;
  createdAt: string;
}

export interface TutorPersona {
  id: string;
  name: string;
  roleTitle: string;
  avatarUrl: string;
  accent: EnglishAccent;
  personality: string;
  speakingSpeed: SpeakingSpeed;
  teachingStyle: string;
  expertise: string[];
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  greeting: string;
}

export interface TutorPreference {
  userId: string;
  selectedTutorId: string;
  preferredMode: string;
  showTranslations: boolean;
  speakingSpeed: SpeakingSpeed;
  updatedAt: string;
}

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  translationId?: string;
  grammarCorrection?: string;
  naturalAlternative?: string;
  timestamp: string;
}

export interface SpeakingSession {
  id: string;
  hostId: string;
  peerId?: string;
  participantIds: string[];
  sessionType: 'ai-tutor' | 'community' | 'simulator';
  topic: string;
  tutorId?: string;
  durationSeconds: number;
  rating?: number;
  status: 'active' | 'completed';
  summaryText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPeer {
  uid: string;
  displayName: string;
  photoURL?: string;
  level: EnglishLevel;
  preferredAccent: EnglishAccent;
  status: 'available' | 'in-call';
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'reminder' | 'review' | 'invite' | 'invite_accepted' | 'achievement' | 'challenge' | 'milestone';
  title: string;
  body: string;
  read: boolean;
  actionRoute: string;
  createdAt: string;
}

export interface AchievementBadge {
  key: string;
  title: string;
  description: string;
  requirementLabel: string;
}

export interface AchievementUnlock {
  id: string;
  userId: string;
  badgeKey: string;
  title: string;
  description: string;
  unlockedAt: string;
}

export interface DailyChallengeProgress {
  id: string;
  userId: string;
  dateKey: string;
  title: string;
  completed: boolean;
  xpAwarded: number;
  completedAt: string;
}

export type SentenceVerdict = 'natural' | 'correct_unnatural' | 'needs_correction';

export interface SentenceEvaluation {
  isCorrect: boolean;
  verdict?: SentenceVerdict;
  correctnessScore: number;
  grammarAssessment: string;
  vocabularyUsageAssessment: string;
  sentenceStructureAssessment?: string;
  contextRelevanceAssessment?: string;
  naturalnessAssessment: string;
  correctedSentence: string;
  explanation: string;
  nativeAlternatives: string[];
}

export interface SpeakingGuideScript {
  topic: string;
  starterPrompts: {
    speakerRole: 'A' | 'B';
    line: string;
    translationId: string;
  }[];
  vocabularyHints: {
    word: string;
    meaningId: string;
  }[];
  suggestedResponses: string[];
}

export interface PeerLiveGuidance {
  grammarNote: {
    original: string;
    correction: string;
    explanation: string;
  } | null;
  suggestedResponses: string[];
  vocabularyHints: { word: string; meaningId: string }[];
  followUpQuestions: string[];
}

export interface SpeakingSummaryVocabularyItem {
  word: string;
  meaningId: string;
  example: string;
}

export interface SpeakingSummaryReport {
  durationFormatted?: string;
  summary?: string;
  vocabularyUsed: string[];
  newVocabulary?: SpeakingSummaryVocabularyItem[];
  grammarMistakes: {
    original: string;
    correction: string;
    reason: string;
    grammarTopicId?: string;
  }[];
  correctedSentences?: string[];
  betterExpressions?: string[];
  commonMistakes?: string[];
  speakingPerformance: string;
  learningRecommendations: string[];
  recommendedPractice?: string[];
  linkedGrammarTopicIds?: string[];
}

export interface LearningInsight {
  id: string;
  userId: string;
  sourceModule: 'ai-tutor' | 'speaking-community' | 'sentence-builder' | 'grammar-analyzer' | 'simulator';
  mistakeOriginal: string;
  correction: string;
  explanation: string;
  grammarTopicId: string;
  vocabWord: string;
  createdAt: string;
}

export interface PersonalizedLearningStage {
  stage: string;
  title: string;
  description: string;
  focusReason: string;
  route: NavRoute;
  cta: string;
  priority: 'high' | 'medium' | 'normal';
  grammarTopicId?: string;
}

export interface PersonalizedLearningPath {
  summary: string;
  stages: PersonalizedLearningStage[];
  generatedAt: string;
}

export interface LearningEvaluationReport {
  vocabularyScore: number;
  grammarScore: number;
  sentenceScore: number;
  listeningScore: number;
  speakingFluencyScore: number | null;
  pronunciationScore: number | null;
  audioEvidenceNote: string;
  strengths: string[];
  weaknesses: string[];
  areasToImprove: string[];
  recommendedLessons: { title: string; route: NavRoute; reason: string }[];
  nextGoals: string[];
  generatedAt: string;
}

export interface AiDailyChallenge {
  dateKey: string;
  challengeType: 'vocabulary' | 'grammar' | 'speaking' | 'sentence' | 'listening';
  title: string;
  prompt: string;
  targetWords: string[];
  hint: string;
  xp: number;
}

export interface LearnerMemoryDoc {
  userId: string;
  grammarWeaknesses: string[];
  weakVocabWords: string[];
  recentSessionSummaries: string[];
  pronunciationSamplesCount: number;
  pronunciationAvgMatch: number;
  personalizedPath?: PersonalizedLearningPath;
  lastEvaluation?: LearningEvaluationReport;
  dailyChallenge?: AiDailyChallenge;
  updatedAt: string;
}

export interface LearnerContextSummary {
  level: EnglishLevel;
  preferredAccent: EnglishAccent;
  learningGoals: string;
  streakDays: number;
  xpPoints: number;
  speakingMinutes: number;
  knownVocabSample: string[];
  weakVocabWords: string[];
  vocabTotal: number;
  vocabMastered: number;
  completedGrammarTopics: string[];
  weakGrammarTopics: string[];
  recentQuizzes: { quizType: string; topic: string; score: number }[];
  recentSpeakingTopics: { sessionType: string; topic: string; durationSeconds: number }[];
  recentMistakes: { original: string; correction: string; grammarTopicId: string }[];
  hasPronunciationAudioEvidence: boolean;
  pronunciationAvgMatch: number;
  pronunciationSamplesCount: number;
}

export interface AssistantActionLink {
  label: string;
  route: NavRoute;
  topicId?: string;
}
