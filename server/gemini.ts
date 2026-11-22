import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  GRAMMAR_TOPICS,
} from '../src/lib/curriculum';
import {
  mapMistakeToGrammarTopicId,
  normalizeSentenceEvaluation,
} from '../src/lib/aiMemory';
import type {
  AiDailyChallenge,
  AssistantActionLink,
  GrammarAnalysisResult,
  GrammarTransformResult,
  LearnerContextSummary,
  LearningEvaluationReport,
  NavRoute,
  PeerLiveGuidance,
  PersonalizedLearningPath,
  SentenceEvaluation,
  SpeakingSummaryReport,
} from '../src/types/lingua';

// ---------------------------------------------------------------------------
// Telemetry, Caching, and Client Setup
// ---------------------------------------------------------------------------
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 250;
const responseCache = new Map<string, CacheEntry<unknown>>();

const usageStats = {
  requests: 0,
  promptTokens: 0,
  outputTokens: 0,
  cacheHits: 0,
};

export function getUsageStats() {
  return { ...usageStats };
}

function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  // Refresh insertion order for simple LRU
  responseCache.delete(key);
  responseCache.set(key, entry);
  usageStats.cacheHits += 1;
  return entry.value as T;
}

function setCached<T>(key: string, value: T) {
  if (responseCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      timeout: 18000,
      retryOptions: { attempts: 1 },
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
}

function formatGeminiError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err || 'Gemini AI request failed.');
  try {
    const parsed = JSON.parse(raw);
    const msg = parsed?.error?.message || parsed?.message;
    if (msg) return new Error(msg);
  } catch {
    // ignore JSON parse failure
  }
  if (raw.includes('"message"')) {
    const match = raw.match(/"message"\s*:\s*"([^"]+)"/);
    if (match?.[1]) return new Error(match[1]);
  }
  return err instanceof Error ? err : new Error(raw);
}

function isTransientOrParseError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('unavailable') ||
    msg.includes('resource_exhausted') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('deadline') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('unexpected token') ||
    msg.includes('json')
  );
}

function recordUsage(response: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }) {
  usageStats.requests += 1;
  usageStats.promptTokens += response.usageMetadata?.promptTokenCount || 0;
  usageStats.outputTokens += response.usageMetadata?.candidatesTokenCount || 0;
}

function formatLearnerContextBlock(ctx?: Partial<LearnerContextSummary> | null): string {
  if (!ctx) return 'Level: B1-B2 · Accent: American · No prior learner memory recorded yet.';
  const lines: string[] = [
    `CEFR Level: ${ctx.level || 'B1-B2'} | Accent: ${ctx.preferredAccent || 'American'} | Goals: ${ctx.learningGoals || 'General fluency'}`,
    `Stats: ${ctx.vocabTotal ?? 0} words (${ctx.vocabMastered ?? 0} mastered), ${ctx.speakingMinutes ?? 0} speaking mins, ${ctx.streakDays ?? 1}-day streak`,
  ];
  if (ctx.knownVocabSample?.length) {
    lines.push(`Known/familiar vocab: ${ctx.knownVocabSample.slice(0, 10).join(', ')}`);
  }
  if (ctx.weakVocabWords?.length) {
    lines.push(`Weak/new vocab needing practice: ${ctx.weakVocabWords.slice(0, 10).join(', ')}`);
  }
  if (ctx.weakGrammarTopics?.length) {
    lines.push(`Weak/error-prone grammar areas: ${ctx.weakGrammarTopics.slice(0, 6).join(', ')}`);
  }
  if (ctx.completedGrammarTopics?.length) {
    lines.push(`Completed grammar lessons: ${ctx.completedGrammarTopics.slice(0, 8).join(', ')}`);
  }
  if (ctx.recentQuizzes?.length) {
    lines.push(
      `Recent quizzes: ${ctx.recentQuizzes.map((q) => `${q.quizType}:${q.topic}(${q.score}%)`).join('; ')}`
    );
  }
  if (ctx.recentMistakes?.length) {
    lines.push(
      `Recent mistakes: ${ctx.recentMistakes
        .slice(0, 4)
        .map((m) => `"${m.original}" -> "${m.correction}" [${m.grammarTopicId}]`)
        .join(' | ')}`
    );
  }
  return lines.join('\n');
}

async function generateJsonWithFallback<T>(params: {
  contents: string;
  systemInstruction?: string;
  responseSchema: unknown;
  preferLite?: boolean;
  cacheKey?: string;
}): Promise<T> {
  if (params.cacheKey) {
    const cached = getCached<T>(params.cacheKey);
    if (cached) return cached;
  }

  const ai = getAiClient();
  const baseConfig = {
    ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
    responseMimeType: 'application/json',
    responseSchema: params.responseSchema as any,
  };

  const primaryModel = params.preferLite ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
  const fallbackModel = params.preferLite ? 'gemini-4-hydrogen' : 'gemini-3.1-flash-lite';

  try {
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: params.contents,
      config:
        primaryModel === 'gemini-4-hydrogen'
          ? { ...baseConfig, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
          : baseConfig,
    });
    recordUsage(response);
    const parsed = JSON.parse((response.text ?? '{}').trim()) as T;
    if (params.cacheKey) setCached(params.cacheKey, parsed);
    return parsed;
  } catch (err) {
    if (!isTransientOrParseError(err)) {
      throw formatGeminiError(err);
    }
    try {
      const fallback = await ai.models.generateContent({
        model: fallbackModel,
        contents: params.contents,
        config:
          fallbackModel === 'gemini-4-hydrogen'
            ? { ...baseConfig, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : baseConfig,
      });
      recordUsage(fallback);
      const parsed = JSON.parse((fallback.text ?? '{}').trim()) as T;
      if (params.cacheKey) setCached(params.cacheKey, parsed);
      return parsed;
    } catch (fallbackErr) {
      throw formatGeminiError(fallbackErr);
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Personal AI Learning Assistant (SSE Streaming + Action Deep-Links)
// ---------------------------------------------------------------------------
function extractAssistantActions(
  question: string,
  replyText: string,
  ctx?: Partial<LearnerContextSummary> | null
): AssistantActionLink[] {
  const combined = `${question} ${replyText}`.toLowerCase();
  const links: AssistantActionLink[] = [];
  const weakTopic = ctx?.weakGrammarTopics?.[0];

  if (combined.includes('grammar') || combined.includes('tense') || combined.includes('past') || combined.includes('perfect') || weakTopic) {
    const topicId = mapMistakeToGrammarTopicId(weakTopic || combined);
    const title = GRAMMAR_TOPICS.find((t) => t.id === topicId)?.title || 'Grammar Lesson';
    links.push({ label: `Study ${title}`, route: 'grammar', topicId });
  }
  if (combined.includes('vocab') || combined.includes('word') || combined.includes('flashcard') || (ctx?.weakVocabWords?.length || 0) > 0) {
    links.push({ label: 'Review Weak Vocabulary', route: 'review-vocabulary' });
  }
  if (combined.includes('speak') || combined.includes('natural') || combined.includes('conversation') || combined.includes('challenge')) {
    links.push({ label: 'Practice with AI Tutor', route: 'ai-tutor' });
  }
  if (combined.includes('sentence') || combined.includes('write')) {
    links.push({ label: 'Open Sentence Coach', route: 'sentence-builder' });
  }
  if (links.length === 0) {
    links.push({ label: 'Open Learning Path', route: 'learning-path' });
  }
  return links.slice(0, 3);
}

export async function streamPersonalAssistant(
  params: {
    question: string;
    history: { role: 'user' | 'assistant'; text: string }[];
    learnerContext?: Partial<LearnerContextSummary> | null;
  },
  onChunk: (delta: string) => void
): Promise<{ fullText: string; actions: AssistantActionLink[] }> {
  const ai = getAiClient();
  const recentHistory = params.history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Learner' : 'LINGUA Coach'}: ${m.text}`)
    .join('\n');

  const prompt = `Learner Profile & Live Data:
${formatLearnerContextBlock(params.learnerContext)}

Recent dialogue:
${recentHistory || 'None'}

Learner question:
${params.question}`;

  const systemInstruction = `You are the LINGUA Personal AI Learning Coach for an Indonesian learner improving their English.
Always personalize your advice using the Learner Profile & Live Data provided above—reference their actual weak grammar topics, weak/known vocabulary words, goals, or speaking minutes directly rather than giving generic boilerplate.
Keep answers concise, practical, encouraging, and structured with clear English examples + brief Indonesian explanations when helpful.
If they ask "What should I learn today?" or "Give me a speaking challenge", use their weak vocab/grammar and goals directly.`;

  let fullText = '';
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    usageStats.requests += 1;
    for await (const chunk of stream) {
      const piece = chunk.text || '';
      if (piece) {
        fullText += piece;
        onChunk(piece);
      }
    }
  } catch (err) {
    if (!isTransientOrParseError(err)) throw formatGeminiError(err);
    const fallback = await ai.models.generateContentStream({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: { systemInstruction },
    });
    usageStats.requests += 1;
    for await (const chunk of fallback) {
      const piece = chunk.text || '';
      if (piece) {
        fullText += piece;
        onChunk(piece);
      }
    }
  }

  return {
    fullText,
    actions: extractAssistantActions(params.question, fullText, params.learnerContext),
  };
}

// ---------------------------------------------------------------------------
// 2. AI Vocabulary Intelligence (Full 14-point Pack + Interactive Actions)
// ---------------------------------------------------------------------------
export async function generateVocabularyMaterial(word: string, level: string) {
  const cleanWord = word.trim();
  const cacheKey = `vocab:${level}:${cleanWord.toLowerCase()}`;

  return generateJsonWithFallback({
    cacheKey,
    contents: `Generate complete English learning material for the vocabulary word or phrase "${cleanWord}" tailored for an Indonesian learner at CEFR level ${level}.

Requirements:
1. Word & Indonesian meaning (meaningId)
2. Part of Speech (category: noun, verb, adjective, adverb, preposition, phrase, other)
3. Accurate IPA Pronunciation
4. Common usage summary (how native speakers commonly use it)
5. Synonyms (3-5), Antonyms (2-4 if applicable), Word Family / Related words (2-4)
6. Natural Collocations (3-5 common word pairings)
7. Relevant Phrasal Verbs (if any naturally exist for this word; otherwise return empty array [])
8. Grammar Analysis (patterns, transitivity, prepositions, register)
9. Common Mistakes made by Indonesian learners with this word (2-3 crisp examples)
10. Daily Conversation Examples (2 short 2-line mini-dialogues showing realistic spoken English + Indonesian meaning)
11. Linguistically natural Example Sentences across 5 to 6 genuinely natural grammar structures suited to THIS specific word/part of speech (e.g. for verbs use tenses like Simple Present, Simple Past, Present Perfect, Simple Future, Present Continuous when non-stative; for stative verbs, adjectives, prepositions, or idioms pick only structures where the word actually sounds natural—NEVER force unnatural continuous or passive forms onto a word just to fill a tense quota!).`,
    systemInstruction:
      'You are an expert English-Indonesian lexicographer and applied linguist. Ensure every example sentence sounds like natural native English, never literal translationese. Return strictly valid JSON.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        word: { type: Type.STRING },
        meaningId: { type: Type.STRING, description: 'Clear Indonesian translation of the word' },
        category: {
          type: Type.STRING,
          description: 'One of: noun, verb, adjective, adverb, preposition, phrase, other',
        },
        ipa: { type: Type.STRING },
        commonUsage: { type: Type.STRING },
        grammarExplanation: { type: Type.STRING },
        synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
        antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
        collocations: { type: Type.ARRAY, items: { type: Type.STRING } },
        phrasalVerbs: { type: Type.ARRAY, items: { type: Type.STRING } },
        relatedWords: { type: Type.ARRAY, items: { type: Type.STRING } },
        commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
        dailyConversations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING },
              line: { type: Type.STRING },
              translationId: { type: Type.STRING },
            },
            required: ['speaker', 'line', 'translationId'],
          },
        },
        sentences: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              tense: { type: Type.STRING },
              sentence: { type: Type.STRING },
              translationId: { type: Type.STRING },
              formula: { type: Type.STRING },
              subject: { type: Type.STRING },
              verb: { type: Type.STRING },
              objectComplement: { type: Type.STRING },
              structureReason: { type: Type.STRING },
              dailyUsage: { type: Type.STRING },
              affirmative: { type: Type.STRING },
              negative: { type: Type.STRING },
              interrogative: { type: Type.STRING },
            },
            required: [
              'tense',
              'sentence',
              'translationId',
              'formula',
              'subject',
              'verb',
              'objectComplement',
              'structureReason',
              'dailyUsage',
              'affirmative',
              'negative',
              'interrogative',
            ],
          },
        },
      },
      required: [
        'word',
        'meaningId',
        'category',
        'ipa',
        'commonUsage',
        'grammarExplanation',
        'synonyms',
        'antonyms',
        'collocations',
        'phrasalVerbs',
        'relatedWords',
        'commonMistakes',
        'dailyConversations',
        'sentences',
      ],
    },
  });
}

export async function assistVocabularyWord(params: {
  word: string;
  meaningId: string;
  category: string;
  level: string;
  action: 'explain' | 'more_examples' | 'simpler' | 'advanced';
}) {
  const actionDirective =
    params.action === 'explain'
      ? 'Explain the nuances, Indonesian learner pitfalls, and exact register clearly in Indonesian + English.'
      : params.action === 'more_examples'
      ? 'Generate 4 fresh real-world sentences (workplace, casual chat, email, travel) using this word naturally.'
      : params.action === 'simpler'
      ? 'Rewrite a super simple A1-A2 level explanation and 3 easy everyday sentences using short, crystal-clear English.'
      : 'Show C1-C2 advanced/executive usage, sophisticated collocations, and 3 polished workplace or academic sentences.';

  const cacheKey = `vocab-assist:${params.action}:${params.level}:${params.word.toLowerCase()}`;

  return generateJsonWithFallback<{
    title: string;
    explanation: string;
    examples: { english: string; indonesian: string; note: string }[];
  }>({
    cacheKey,
    preferLite: true,
    contents: `Word: "${params.word}" (${params.category}, meaning: "${params.meaningId}"), learner level: ${params.level}.
Task: ${actionDirective}`,
    systemInstruction: 'You are an expert English-Indonesian vocabulary tutor. Return strictly JSON.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        explanation: { type: Type.STRING },
        examples: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING },
              indonesian: { type: Type.STRING },
              note: { type: Type.STRING },
            },
            required: ['english', 'indonesian', 'note'],
          },
        },
      },
      required: ['title', 'explanation', 'examples'],
    },
  });
}

export async function evaluateVocabularyPractice(params: {
  word: string;
  meaningId: string;
  mode: string;
  prompt: string;
  userAnswer: string;
}) {
  return generateJsonWithFallback({
    contents: `Evaluate a learner's vocabulary practice response.
Target word: "${params.word}" (Indonesian meaning: "${params.meaningId}")
Practice mode: ${params.mode}
Prompt given: ${params.prompt}
Learner answer: "${params.userAnswer}"`,
    systemInstruction:
      'Be encouraging, clear, and explain grammar/word-choice corrections in Indonesian + English examples.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        isCorrect: { type: Type.BOOLEAN },
        score: { type: Type.INTEGER },
        correctedSentence: { type: Type.STRING },
        explanationId: { type: Type.STRING },
        naturalAlternative: { type: Type.STRING },
      },
      required: ['isCorrect', 'score', 'correctedSentence', 'explanationId', 'naturalAlternative'],
    },
  });
}

// ---------------------------------------------------------------------------
// 3. AI Grammar Analyzer & Sentence Transformers
// ---------------------------------------------------------------------------
export async function analyzeGrammarSentence(params: {
  sentence: string;
  level: string;
  learnerContext?: Partial<LearnerContextSummary> | null;
}): Promise<GrammarAnalysisResult> {
  const raw = await generateJsonWithFallback<GrammarAnalysisResult>({
    contents: `Analyze this English sentence linguistically for an Indonesian learner (Level ${params.level}):
"${params.sentence}"

Learner background:
${formatLearnerContextBlock(params.learnerContext)}

Break down Subject, Verb, Object, Complement, Adverbial (say "None" if not present), Tense, Sentence Structure (e.g. Simple / Compound / Complex + Voice), Correctness (boolean isCorrect), Naturalness (concise rating + comment), Incorrect Sentence vs Correct Sentence (if already correct, confirm it and offer a smoother option), clear Indonesian+English Explanation, explicit Grammar Pattern formula, and 3 Additional Examples following that same pattern.`,
    systemInstruction:
      'You are an applied English linguist. Be accurate about grammatical validity vs stylistic stiffness. Return strictly JSON.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        sentence: { type: Type.STRING },
        subject: { type: Type.STRING },
        verb: { type: Type.STRING },
        object: { type: Type.STRING },
        complement: { type: Type.STRING },
        adverbial: { type: Type.STRING },
        tense: { type: Type.STRING },
        sentenceStructure: { type: Type.STRING },
        isCorrect: { type: Type.BOOLEAN },
        naturalness: { type: Type.STRING },
        incorrectSentence: { type: Type.STRING },
        correctedSentence: { type: Type.STRING },
        explanation: { type: Type.STRING },
        grammarPattern: { type: Type.STRING },
        additionalExamples: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        'sentence',
        'subject',
        'verb',
        'object',
        'complement',
        'adverbial',
        'tense',
        'sentenceStructure',
        'isCorrect',
        'naturalness',
        'incorrectSentence',
        'correctedSentence',
        'explanation',
        'grammarPattern',
        'additionalExamples',
      ],
    },
  });

  const linkedGrammarTopicId = mapMistakeToGrammarTopicId(
    `${raw.tense} ${raw.grammarPattern} ${raw.explanation}`
  );
  return { ...raw, linkedGrammarTopicId };
}

export async function transformGrammarSentence(params: {
  sentence: string;
  action: 'explain_words' | 'change_tense' | 'negative' | 'interrogative' | 'natural' | 'translate_id';
  targetTense?: string;
  level?: string;
}): Promise<GrammarTransformResult> {
  const directives: Record<typeof params.action, string> = {
    explain_words:
      'Explain every important word/phrase in this sentence (role/part of speech + concise Indonesian meaning + grammar note).',
    change_tense: `Rewrite this sentence accurately into ${params.targetTense || 'Present Perfect'} and explain how the verb structure changed.`,
    negative: 'Convert this sentence into its grammatically accurate negative form and explain auxiliary/verb changes.',
    interrogative: 'Convert this sentence into a natural interrogative (question) form and explain word order.',
    natural: 'Rewrite this sentence so it sounds completely natural to a native English speaker while keeping the original intent.',
    translate_id: 'Translate this sentence into natural, idiomatic Bahasa Indonesia and note any structural differences.',
  };

  return generateJsonWithFallback<GrammarTransformResult>({
    preferLite: true,
    contents: `Original sentence: "${params.sentence}"
Learner level: ${params.level || 'B1-B2'}
Action: ${directives[params.action]}`,
    systemInstruction: 'Return strictly valid JSON.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING },
        resultText: { type: Type.STRING },
        explanation: { type: Type.STRING },
        wordBreakdown: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              role: { type: Type.STRING },
              note: { type: Type.STRING },
            },
            required: ['word', 'role', 'note'],
          },
        },
      },
      required: ['action', 'resultText', 'explanation'],
    },
  });
}

// ---------------------------------------------------------------------------
// 4. AI Sentence Coach (5-Axis Evaluation + Naturalness Distinction)
// ---------------------------------------------------------------------------
export async function generateSentenceChallenge(
  words: string[],
  difficulty: string,
  learnerContext?: Partial<LearnerContextSummary> | null
) {
  return generateJsonWithFallback({
    contents: `Create a realistic sentence-building challenge at ${difficulty} level requiring the learner to use these vocabulary words naturally: ${words.join(', ')}.
Learner context:
${formatLearnerContextBlock(learnerContext)}`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        scenarioTitle: { type: Type.STRING },
        challengePrompt: { type: Type.STRING },
        grammarHint: { type: Type.STRING },
        exampleTarget: { type: Type.STRING },
      },
      required: ['scenarioTitle', 'challengePrompt', 'grammarHint', 'exampleTarget'],
    },
  });
}

export async function evaluateSentenceBuilder(params: {
  words: string[];
  difficulty: string;
  challengePrompt: string;
  userSentence: string;
  learnerContext?: Partial<LearnerContextSummary> | null;
}): Promise<SentenceEvaluation> {
  const raw = await generateJsonWithFallback<SentenceEvaluation>({
    contents: `Evaluate the learner's sentence for the AI Sentence Coach.
Required words: ${params.words.join(', ')}
Difficulty: ${params.difficulty}
Challenge: ${params.challengePrompt}
User sentence: "${params.userSentence}"

Learner context:
${formatLearnerContextBlock(params.learnerContext)}

IMPORTANT PEDAGOGICAL RULE:
- Distinguish grammatically valid yet slightly stiff/literal sentences ("verdict": "correct_unnatural", "isCorrect": true) from sentences that genuinely contain grammar or word-usage mistakes ("verdict": "needs_correction", "isCorrect": false), and fluent natural sentences ("verdict": "natural", "isCorrect": true).
- Evaluate 5 distinct dimensions: grammarAssessment, vocabularyUsageAssessment, sentenceStructureAssessment, contextRelevanceAssessment, naturalnessAssessment.`,
    systemInstruction:
      'Provide encouraging, linguistically accurate feedback in Indonesian + English examples. Never fail a grammatically correct sentence just because a phrasing is slightly formal or stiff.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        isCorrect: { type: Type.BOOLEAN },
        verdict: {
          type: Type.STRING,
          description: 'One of: natural, correct_unnatural, needs_correction',
        },
        correctnessScore: { type: Type.INTEGER },
        grammarAssessment: { type: Type.STRING },
        vocabularyUsageAssessment: { type: Type.STRING },
        sentenceStructureAssessment: { type: Type.STRING },
        contextRelevanceAssessment: { type: Type.STRING },
        naturalnessAssessment: { type: Type.STRING },
        correctedSentence: { type: Type.STRING },
        explanation: { type: Type.STRING },
        nativeAlternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        'isCorrect',
        'verdict',
        'correctnessScore',
        'grammarAssessment',
        'vocabularyUsageAssessment',
        'sentenceStructureAssessment',
        'contextRelevanceAssessment',
        'naturalnessAssessment',
        'correctedSentence',
        'explanation',
        'nativeAlternatives',
      ],
    },
  });

  return normalizeSentenceEvaluation(raw);
}

// ---------------------------------------------------------------------------
// 5. AI Native Speaker Tutor (5 Teaching Modes, Accent, Speed, Learner Memory)
// ---------------------------------------------------------------------------
function getTutorModeInstructions(mode: string): string {
  switch (mode) {
    case 'Professional Tutor':
      return 'Teaching Mode: Professional Tutor. Speak clearly in polished workplace/academic register, give structured explanations of nuances, and coach precision.';
    case 'Strict Practice':
      return 'Teaching Mode: Strict Practice. Actively check tense agreement, prepositions, articles, and collocations on every turn, and challenge the learner to self-correct or refine.';
    case 'Interview Practice':
      return 'Teaching Mode: Interview Practice. Conduct a realistic English job interview using STAR behavioral and role-fit follow-ups, plus concise executive phrasing upgrades.';
    case 'Free Speaking':
      return 'Teaching Mode: Free Speaking. Keep the conversation flowing smoothly WITHOUT interrupting or lecturing in your spoken reply. Store any grammar correction silently in grammarCorrection for post-turn review while replying conversationally.';
    case 'Friendly Conversation':
    default:
      return 'Teaching Mode: Friendly Conversation. Warm, relaxed everyday chat encouraging confidence, natural idioms, and smooth turn-taking.';
  }
}

export async function runTutorChatTurn(params: {
  tutorName: string;
  accent: string;
  personality: string;
  teachingStyle: string;
  mode: string;
  speed?: string;
  level: string;
  showTranslation: boolean;
  history: { speaker: string; text: string }[];
  userMessage: string;
  learnerContext?: Partial<LearnerContextSummary> | null;
}) {
  const transcript = params.history.slice(-8).map((h) => `${h.speaker}: ${h.text}`).join('\n');
  const speedGuide =
    params.speed === 'slow'
      ? 'Use short, crystal-clear sentences and simpler everyday vocabulary so an Indonesian learner practicing at slow pace can follow easily.'
      : params.speed === 'natural'
      ? 'Use brisk, idiomatic, native-speed phrasing with connected expressions and authentic nuance.'
      : 'Use balanced, natural conversational pacing.';

  return generateJsonWithFallback({
    contents: `Learner memory & context:
${formatLearnerContextBlock(params.learnerContext)}

Conversation so far:
${transcript}

Learner: ${params.userMessage}`,
    systemInstruction: `You are ${params.tutorName}, a native ${params.accent} English tutor.
Personality: ${params.personality}
Base style: ${params.teachingStyle}
${getTutorModeInstructions(params.mode)}
Pacing: ${speedGuide}
Target CEFR Level: ${params.level}
If the learner has weak vocabulary or weak grammar noted in their memory, gently weave opportunities to practice those into your follow-up question when relevant.
Keep your spoken reply engaging and concise (1-3 sentences + a follow-up question). Provide Indonesian translation, grammarCorrection (empty string if accurate), and naturalAlternative.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING },
        translationId: { type: Type.STRING },
        grammarCorrection: { type: Type.STRING },
        naturalAlternative: { type: Type.STRING },
      },
      required: ['reply', 'translationId', 'grammarCorrection', 'naturalAlternative'],
    },
  });
}

// ---------------------------------------------------------------------------
// 6. Speaking Partner Live Guidance + Roleplay + Session History Analyzer
// ---------------------------------------------------------------------------
export async function runSimulatorTurn(params: {
  scenarioTitle: string;
  aiRole: string;
  userRole: string;
  context: string;
  level: string;
  history: { speaker: string; text: string }[];
  userMessage: string;
}) {
  const transcript = params.history.slice(-10).map((h) => `${h.speaker}: ${h.text}`).join('\n');
  return generateJsonWithFallback({
    contents: `Conversation history:
${transcript}

${params.userRole}: ${params.userMessage}`,
    systemInstruction: `Roleplay strictly as "${params.aiRole}" in scenario "${params.scenarioTitle}".
Context: ${params.context}. Learner level: ${params.level}.
Respond naturally in character (1-3 sentences), plus provide a brief coaching tip and Indonesian translation.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING },
        translationId: { type: Type.STRING },
        coachingTip: { type: Type.STRING },
      },
      required: ['reply', 'translationId', 'coachingTip'],
    },
  });
}

export async function evaluateSimulatorSession(params: {
  scenarioTitle: string;
  level: string;
  history: { speaker: string; text: string }[];
}) {
  const transcript = params.history.map((h) => `${h.speaker}: ${h.text}`).join('\n');
  return generateJsonWithFallback({
    contents: `Evaluate the learner's English performance in this roleplay simulation ("${params.scenarioTitle}", target level ${params.level}):
${transcript}`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        overallSummary: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
        suggestedExpressions: { type: Type.ARRAY, items: { type: Type.STRING } },
        readinessScore: { type: Type.INTEGER },
      },
      required: ['overallSummary', 'strengths', 'improvements', 'suggestedExpressions', 'readinessScore'],
    },
  });
}

export async function generateSpeakingGuideScript(topic: string, level: string) {
  return generateJsonWithFallback({
    cacheKey: `speak-script:${level}:${topic.toLowerCase()}`,
    contents: `Create a flexible, natural peer conversation starter script for two English learners (level ${level}) discussing the topic "${topic}".
Include 4 starter exchanges (Speaker A / B), Indonesian translations, 5 useful vocabulary hints, and 3 quick suggested responses.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        starterPrompts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speakerRole: { type: Type.STRING },
              line: { type: Type.STRING },
              translationId: { type: Type.STRING },
            },
            required: ['speakerRole', 'line', 'translationId'],
          },
        },
        vocabularyHints: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              meaningId: { type: Type.STRING },
            },
            required: ['word', 'meaningId'],
          },
        },
        suggestedResponses: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['topic', 'starterPrompts', 'vocabularyHints', 'suggestedResponses'],
    },
  });
}

export async function adaptSpeakingGuideNext(params: {
  topic: string;
  mode: string;
  level: string;
  recentLines: string[];
}) {
  return generateJsonWithFallback({
    preferLite: true,
    contents: `Two learners are in a live English call (Topic: "${params.topic}", Guide Mode: "${params.mode}", Level: ${params.level}).
Recent conversation transcript:
${params.recentLines.slice(-6).join('\n')}

Generate a natural next question/prompt that fits what they were talking about, 2 suggested responses, 3 context vocabulary hints, and Indonesian translation.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        nextPrompt: { type: Type.STRING },
        nextPromptTranslationId: { type: Type.STRING },
        suggestedResponses: { type: Type.ARRAY, items: { type: Type.STRING } },
        vocabularyHints: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              meaningId: { type: Type.STRING },
            },
            required: ['word', 'meaningId'],
          },
        },
      },
      required: ['nextPrompt', 'nextPromptTranslationId', 'suggestedResponses', 'vocabularyHints'],
    },
  });
}

export async function livePeerGuidance(params: {
  topic: string;
  level: string;
  recentLines: string[];
}): Promise<PeerLiveGuidance> {
  return generateJsonWithFallback<PeerLiveGuidance>({
    preferLite: true,
    contents: `Two English learners are speaking live on topic "${params.topic}" (level ${params.level}).
Recent lines:
${params.recentLines.slice(-6).join('\n') || 'Session just started.'}

Provide subtle visual-only speaking assistance (never interrupting):
1. If the latest line contains a clear grammar mistake, return grammarNote with original, correction, and concise explanation; otherwise null.
2. 2-3 quick suggestedResponses the learner can say next.
3. 3 helpful vocabularyHints (word + concise meaningId).
4. 2 followUpQuestions to keep the dialogue alive.`,
    systemInstruction: 'Keep tips ultra-concise for fast glance reading during a live voice call. Return strictly JSON.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        grammarNote: {
          type: Type.OBJECT,
          nullable: true,
          properties: {
            original: { type: Type.STRING },
            correction: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ['original', 'correction', 'explanation'],
        },
        suggestedResponses: { type: Type.ARRAY, items: { type: Type.STRING } },
        vocabularyHints: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              meaningId: { type: Type.STRING },
            },
            required: ['word', 'meaningId'],
          },
        },
        followUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['grammarNote', 'suggestedResponses', 'vocabularyHints', 'followUpQuestions'],
    },
  });
}

export async function summarizeSpeakingSession(params: {
  topic: string;
  durationSeconds: number;
  transcript: { speaker: string; text: string }[];
}): Promise<SpeakingSummaryReport> {
  const textTranscript =
    params.transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n') ||
    'No transcript lines recorded.';

  const mins = Math.floor(params.durationSeconds / 60);
  const secs = params.durationSeconds % 60;
  const durationFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const raw = await generateJsonWithFallback<SpeakingSummaryReport>({
    contents: `Analyze this speaking session transcript (Topic: "${params.topic}", Duration: ${durationFormatted}):
${textTranscript}

Produce a structured Conversation History Analyzer report:
- summary: concise paragraph summarizing what was discussed and achieved
- vocabularyUsed: notable English words used in the transcript
- newVocabulary: 3-5 useful words/phrases from or directly helpful for this conversation (word, meaningId in Bahasa Indonesia, example sentence)
- grammarMistakes: actual grammar mistakes found in the transcript (original, correction, reason) — if none, return []
- correctedSentences: clean corrected sentences corresponding to mistakes (if any)
- betterExpressions: 3 more natural/idiomatic expressions the learner can try next time
- commonMistakes: recurring patterns or pitfalls noticed in this dialogue
- speakingPerformance: encouraging overall evaluation
- learningRecommendations & recommendedPractice: 3 actionable next steps
Important: Only analyze text actually present in the transcript. Never invent acoustic pronunciation scores.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        vocabularyUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
        newVocabulary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              meaningId: { type: Type.STRING },
              example: { type: Type.STRING },
            },
            required: ['word', 'meaningId', 'example'],
          },
        },
        grammarMistakes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              original: { type: Type.STRING },
              correction: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ['original', 'correction', 'reason'],
          },
        },
        correctedSentences: { type: Type.ARRAY, items: { type: Type.STRING } },
        betterExpressions: { type: Type.ARRAY, items: { type: Type.STRING } },
        commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
        speakingPerformance: { type: Type.STRING },
        learningRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendedPractice: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        'summary',
        'vocabularyUsed',
        'newVocabulary',
        'grammarMistakes',
        'correctedSentences',
        'betterExpressions',
        'commonMistakes',
        'speakingPerformance',
        'learningRecommendations',
        'recommendedPractice',
      ],
    },
  });

  const enrichedMistakes = (raw.grammarMistakes || []).map((gm) => ({
    ...gm,
    grammarTopicId: mapMistakeToGrammarTopicId(`${gm.original} ${gm.correction} ${gm.reason}`),
  }));
  const linkedGrammarTopicIds = Array.from(
    new Set(enrichedMistakes.map((m) => m.grammarTopicId!).filter(Boolean))
  );

  return {
    ...raw,
    durationFormatted,
    grammarMistakes: enrichedMistakes,
    linkedGrammarTopicIds,
  };
}

// ---------------------------------------------------------------------------
// 7. Personalized Learning Path, Learning Evaluation & Daily Challenge AI
// ---------------------------------------------------------------------------
const ALLOWED_ROUTES: NavRoute[] = [
  'vocabulary',
  'grammar',
  'sentence-builder',
  'listening',
  'pronunciation',
  'ai-tutor',
  'speaking-community',
  'simulator',
  'daily-challenge',
  'review-vocabulary',
];

export async function generatePersonalizedLearningPath(
  learnerContext: Partial<LearnerContextSummary>
): Promise<PersonalizedLearningPath> {
  const raw = await generateJsonWithFallback<PersonalizedLearningPath>({
    contents: `Design a 5-stage personalized English Learning Path based directly on this learner's real data:
${formatLearnerContextBlock(learnerContext)}

Allowed routes for each stage: ${ALLOWED_ROUTES.join(', ')}.
Reference their actual weak grammar topics, weak vocabulary words, goals, and speaking progress so each stage feels genuinely personalized.`,
    systemInstruction: 'You are an adaptive English curriculum architect. Return strictly JSON.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        stages: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stage: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              focusReason: { type: Type.STRING },
              route: { type: Type.STRING },
              cta: { type: Type.STRING },
              priority: { type: Type.STRING, description: 'high, medium, or normal' },
              grammarHintTopic: { type: Type.STRING },
            },
            required: ['stage', 'title', 'description', 'focusReason', 'route', 'cta', 'priority'],
          },
        },
      },
      required: ['summary', 'stages'],
    },
  });

  const stages = (raw.stages || []).slice(0, 6).map((st, idx) => {
    const safeRoute = ALLOWED_ROUTES.includes(st.route) ? st.route : ALLOWED_ROUTES[idx % ALLOWED_ROUTES.length];
    return {
      ...st,
      route: safeRoute,
      priority: (['high', 'medium', 'normal'].includes(st.priority) ? st.priority : 'medium') as
        | 'high'
        | 'medium'
        | 'normal',
      grammarTopicId:
        safeRoute === 'grammar'
          ? mapMistakeToGrammarTopicId(`${st.title} ${st.focusReason}`)
          : undefined,
    };
  });

  return {
    summary: raw.summary,
    stages,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateLearningEvaluation(
  learnerContext: Partial<LearnerContextSummary>
): Promise<LearningEvaluationReport> {
  const hasAudio = Boolean(
    learnerContext.hasPronunciationAudioEvidence && (learnerContext.pronunciationSamplesCount || 0) > 0
  );

  const raw = await generateJsonWithFallback<LearningEvaluationReport>({
    contents: `Generate an honest, data-grounded AI Learning Evaluation report for this learner:
${formatLearnerContextBlock(learnerContext)}
Has genuine recorded pronunciation audio evidence: ${hasAudio ? `Yes (${learnerContext.pronunciationSamplesCount} samples, avg ${learnerContext.pronunciationAvgMatch}% word match)` : 'NO — 0 recorded audio samples'}.

Strict accuracy rules:
- Score vocabularyScore, grammarScore, sentenceScore, listeningScore from 0-100 based on their metrics & quiz history.
- ${hasAudio ? 'Evaluate speakingFluencyScore and pronunciationScore grounded in their recorded audio match rate and speaking minutes.' : 'Set speakingFluencyScore to 0 and pronunciationScore to 0 (these will be nullified server-side because recorded audio evidence is absent). Note in audioEvidenceNote that recording audio in Pronunciation & Shadowing is required to measure pronunciation & fluency.'}
- Give concrete strengths, weaknesses, areasToImprove, recommendedLessons (with valid routes from ${ALLOWED_ROUTES.join(', ')}), and nextGoals.`,
    systemInstruction: 'You are an objective English assessment specialist. Never invent acoustic pronunciation scores when audio evidence is absent. Return strictly JSON.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        vocabularyScore: { type: Type.INTEGER },
        grammarScore: { type: Type.INTEGER },
        sentenceScore: { type: Type.INTEGER },
        listeningScore: { type: Type.INTEGER },
        speakingFluencyScore: { type: Type.INTEGER },
        pronunciationScore: { type: Type.INTEGER },
        audioEvidenceNote: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        areasToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendedLessons: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              route: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ['title', 'route', 'reason'],
          },
        },
        nextGoals: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        'vocabularyScore',
        'grammarScore',
        'sentenceScore',
        'listeningScore',
        'speakingFluencyScore',
        'pronunciationScore',
        'audioEvidenceNote',
        'strengths',
        'weaknesses',
        'areasToImprove',
        'recommendedLessons',
        'nextGoals',
      ],
    },
  });

  const clampScore = (val: unknown) => Math.min(100, Math.max(0, Math.round(Number(val) || 0)));

  return {
    vocabularyScore: clampScore(raw.vocabularyScore),
    grammarScore: clampScore(raw.grammarScore),
    sentenceScore: clampScore(raw.sentenceScore),
    listeningScore: clampScore(raw.listeningScore),
    // Server-enforced guard: NEVER fabricate fluency/pronunciation scores without real audio recordings
    speakingFluencyScore: hasAudio ? clampScore(raw.speakingFluencyScore) : null,
    pronunciationScore: hasAudio ? clampScore(raw.pronunciationScore) : null,
    audioEvidenceNote: hasAudio
      ? raw.audioEvidenceNote
      : 'Requires recorded audio — complete a voice check in Pronunciation & Shadowing to unlock acoustic fluency and pronunciation scoring.',
    strengths: raw.strengths || [],
    weaknesses: raw.weaknesses || [],
    areasToImprove: raw.areasToImprove || [],
    recommendedLessons: (raw.recommendedLessons || []).map((l) => ({
      ...l,
      route: ALLOWED_ROUTES.includes(l.route) ? l.route : 'grammar',
    })),
    nextGoals: raw.nextGoals || [],
    generatedAt: new Date().toISOString(),
  };
}

export async function generateDailyChallengeAI(params: {
  learnerContext: Partial<LearnerContextSummary>;
  recentTitles: string[];
  preferredType?: AiDailyChallenge['challengeType'];
}): Promise<AiDailyChallenge> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const raw = await generateJsonWithFallback<AiDailyChallenge>({
    contents: `Generate a fresh, motivating Daily English Challenge for ${dateKey}.
Learner data:
${formatLearnerContextBlock(params.learnerContext)}
Preferred challenge type (if specified): ${params.preferredType || 'any varied type among vocabulary, grammar, speaking, sentence, listening'}
Avoid repeating these recent challenge titles: ${params.recentTitles.join(' | ') || 'none'}`,
    systemInstruction: 'Create practical, engaging challenges aligned with the learner’s level and weak spots. Return strictly JSON.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        challengeType: {
          type: Type.STRING,
          description: 'One of: vocabulary, grammar, speaking, sentence, listening',
        },
        title: { type: Type.STRING },
        prompt: { type: Type.STRING },
        targetWords: { type: Type.ARRAY, items: { type: Type.STRING } },
        hint: { type: Type.STRING },
        xp: { type: Type.INTEGER },
      },
      required: ['challengeType', 'title', 'prompt', 'targetWords', 'hint', 'xp'],
    },
  });

  const validTypes: AiDailyChallenge['challengeType'][] = [
    'vocabulary',
    'grammar',
    'speaking',
    'sentence',
    'listening',
  ];
  const challengeType = validTypes.includes(raw.challengeType) ? raw.challengeType : 'sentence';

  return {
    dateKey,
    challengeType,
    title: raw.title,
    prompt: raw.prompt,
    targetWords: (raw.targetWords || []).slice(0, 5),
    hint: raw.hint,
    xp: Math.min(80, Math.max(30, Math.round(Number(raw.xp) || 45))),
  };
}

// ---------------------------------------------------------------------------
// 8. Speech Synthesis (TTS) & Audio Transcription
// ---------------------------------------------------------------------------
export async function synthesizeSpeech(text: string, voiceName: string, _accent: string) {
  const clean = text.trim();
  const safeVoice = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceName)
    ? voiceName
    : 'Kore';
  const cacheKey = `tts:${safeVoice}:${clean}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [{ role: 'user', parts: [{ text: clean }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: safeVoice },
          },
        },
      },
    });
    recordUsage(response);

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('TTS model did not return audio data.');
    }
    setCached(cacheKey, base64Audio);
    return base64Audio;
  } catch (err) {
    throw formatGeminiError(err);
  }
}

export async function transcribeAndCompareAudio(params: {
  base64Audio: string;
  mimeType: string;
  targetPhrase: string;
  accent: string;
}) {
  const ai = getAiClient();
  const transcribeResponse = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType || 'audio/webm',
            data: params.base64Audio,
          },
        },
        { text: 'Transcribe this spoken English audio accurately.' },
      ],
    },
  });
  recordUsage(transcribeResponse);

  const transcript = (transcribeResponse.text ?? '').trim();

  const comparison = await generateJsonWithFallback<{
    matchPercentage: number;
    matchedWords: string[];
    missedOrDifferentWords: string[];
    feedback: string;
    practiceTip: string;
  }>({
    contents: `Compare the target English phrase against the speech-to-text transcript.
Target phrase (${params.accent} English): "${params.targetPhrase}"
Recognized transcript: "${transcript}"

Note: Do NOT fabricate phonetic waveform scores; base feedback strictly on word-level match, omitted/substituted words, and clear tips for practicing the target words.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        matchPercentage: { type: Type.INTEGER },
        matchedWords: { type: Type.ARRAY, items: { type: Type.STRING } },
        missedOrDifferentWords: { type: Type.ARRAY, items: { type: Type.STRING } },
        feedback: { type: Type.STRING },
        practiceTip: { type: Type.STRING },
      },
      required: ['matchPercentage', 'matchedWords', 'missedOrDifferentWords', 'feedback', 'practiceTip'],
    },
  });

  return {
    transcript,
    ...comparison,
  };
}
