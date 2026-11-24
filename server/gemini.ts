import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  GRAMMAR_TOPICS,
} from '../src/lib/curriculum.ts';
import {
  mapMistakeToGrammarTopicId,
  normalizeSentenceEvaluation,
} from '../src/lib/aiMemory.ts';
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const dailyExhaustedUntil = new Map<string, number>();

function isModelDailyExhausted(model: string): boolean {
  const until = dailyExhaustedUntil.get(model);
  if (!until) return false;
  if (Date.now() > until) {
    dailyExhaustedUntil.delete(model);
    return false;
  }
  return true;
}

function getAiClient(timeoutMs = 22000): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: timeoutMs,
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

function getGroqApiKey(): string | null {
  const key = (process.env.GROQ_API_KEY || '').trim();
  if (!key || key === 'MY_GROQ_API_KEY') return null;
  return key;
}

export function isGroqConfigured(): boolean {
  return Boolean(getGroqApiKey());
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
}

export function getActiveTextProvider(): 'groq' | 'gemini' | 'none' {
  if (isGroqConfigured()) return 'groq';
  if (isGeminiConfigured()) return 'gemini';
  return 'none';
}

function extractRawGeminiMessage(err: unknown): string {
  let raw = err instanceof Error ? err.message : String(err || 'Gemini AI request failed.');
  for (let depth = 0; depth < 3; depth += 1) {
    try {
      const parsed = JSON.parse(raw);
      const nested = parsed?.error?.message || parsed?.message;
      if (typeof nested === 'string' && nested !== raw) {
        raw = nested;
        continue;
      }
    } catch {
      // ignore
    }
    break;
  }
  if (raw.includes('"message"')) {
    const match = raw.match(/"message"\s*:\s*"([^"]+)"/);
    if (match?.[1]) return match[1];
  }
  return raw;
}

function isDailyQuotaError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
  return (
    msg.includes('quota exceeded') ||
    msg.includes('per day') ||
    msg.includes('free_tier_requests')
  );
}

function formatGeminiError(err: unknown): Error & { statusCode?: number } {
  const msg = extractRawGeminiMessage(err);
  const lower = msg.toLowerCase();

  let statusCode = 500;
  let friendly = msg;

  if (isDailyQuotaError(err) || lower.includes('429') || lower.includes('resource_exhausted')) {
    statusCode = 429;
    friendly =
      'Kuota harian API Gemini sedang penuh (Free Tier). Tunggu beberapa saat atau tambahkan API key dengan billing aktif di Settings > Secrets.';
  } else if (
    lower.includes('503') ||
    lower.includes('high demand') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded')
  ) {
    statusCode = 503;
    friendly =
      'Server AI Gemini sedang mengalami lonjakan permintaan sementara (High Demand). Silakan klik coba lagi dalam beberapa detik.';
  } else if (lower.includes('403') || lower.includes('permission_denied') || lower.includes('api_key_invalid')) {
    statusCode = 403;
    friendly = 'API key Gemini tidak valid atau belum memiliki izin. Periksa Settings > Secrets.';
  }

  const out = new Error(friendly) as Error & { statusCode?: number };
  out.statusCode = statusCode;
  return out;
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

function describeSchemaNode(schema: any, depth = 0): string {
  if (!schema || typeof schema !== 'object' || depth > 5) return 'any';
  const typeVal = String(schema.type || '').toUpperCase();
  const nullableNote = schema.nullable ? ' (or null)' : '';

  if (typeVal === 'OBJECT' && schema.properties) {
    const entries = Object.entries(schema.properties).map(([key, prop]: [string, any]) => {
      const desc = prop?.description ? ` /* ${prop.description} */` : '';
      return `"${key}": ${describeSchemaNode(prop, depth + 1)}${desc}`;
    });
    return `{ ${entries.join(', ')} }${nullableNote}`;
  }
  if (typeVal === 'ARRAY' && schema.items) {
    return `[${describeSchemaNode(schema.items, depth + 1)}]${nullableNote}`;
  }
  if (typeVal === 'INTEGER' || typeVal === 'NUMBER') {
    return `number${nullableNote}`;
  }
  if (typeVal === 'BOOLEAN') {
    return `boolean${nullableNote}`;
  }
  return `string${nullableNote}`;
}

function stripJsonCodeFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

function formatGroqError(status: number, rawMessage: string): Error & { statusCode?: number } {
  const lower = rawMessage.toLowerCase();
  let statusCode = status || 500;
  let friendly = rawMessage || 'Permintaan ke Groq AI gagal diproses.';

  if (status === 401 || status === 403 || lower.includes('invalid api key') || lower.includes('authentication')) {
    statusCode = 401;
    friendly = 'GROQ_API_KEY tidak valid atau kedaluwarsa. Periksa pengaturan di Settings > Secrets.';
  } else if (status === 429 || lower.includes('rate limit')) {
    statusCode = 429;
    friendly = 'Batas permintaan Groq tercapai sementara. Silakan coba lagi dalam beberapa detik.';
  } else if (status >= 500 || lower.includes('timeout') || lower.includes('aborted')) {
    statusCode = 503;
    friendly = 'Server Groq AI sedang sibuk sementara. Silakan klik coba lagi.';
  }

  const out = new Error(friendly) as Error & { statusCode?: number };
  out.statusCode = statusCode;
  return out;
}

async function callGroqJson<T>(params: {
  contents: string;
  systemInstruction?: string;
  responseSchema: unknown;
  preferLite?: boolean;
}): Promise<T> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  const models = params.preferLite
    ? ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']
    : ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

  const schemaShape = describeSchemaNode(params.responseSchema);
  const systemMessage = [
    params.systemInstruction || 'You are a helpful AI English tutor.',
    `Return ONLY a valid JSON object matching this exact schema and field names:\n${schemaShape}`,
  ].join('\n\n');

  let lastStatus = 500;
  let lastMessage = 'Groq AI request failed.';

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    if (i > 0) await sleep(250);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.35,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: params.contents },
          ],
        }),
        signal: AbortSignal.timeout(14000),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      };

      if (!response.ok) {
        lastStatus = response.status;
        lastMessage = payload?.error?.message || `Groq HTTP ${response.status}`;
        if (response.status === 401 || response.status === 403) {
          throw formatGroqError(response.status, lastMessage);
        }
        continue;
      }

      usageStats.requests += 1;
      usageStats.promptTokens += payload.usage?.prompt_tokens || 0;
      usageStats.outputTokens += payload.usage?.completion_tokens || 0;

      const content = stripJsonCodeFences(payload.choices?.[0]?.message?.content || '{}');
      return JSON.parse(content) as T;
    } catch (err) {
      if ((err as { statusCode?: number })?.statusCode === 401) {
        throw err;
      }
      lastMessage = err instanceof Error ? err.message : String(err);
      console.warn(`[groq] attempt ${i + 1} (${model}) failed:`, lastMessage.slice(0, 200));
    }
  }

  throw formatGroqError(lastStatus, lastMessage);
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

  if (isGroqConfigured()) {
    try {
      const parsed = await callGroqJson<T>(params);
      if (params.cacheKey) setCached(params.cacheKey, parsed);
      return parsed;
    } catch (groqErr) {
      if (!isGeminiConfigured() || (groqErr as { statusCode?: number })?.statusCode === 401) {
        throw groqErr;
      }
      console.warn('[groq] falling back to Gemini:', groqErr instanceof Error ? groqErr.message : groqErr);
    }
  }

  const ai = getAiClient();
  const baseConfig = {
    ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
    responseMimeType: 'application/json',
    responseSchema: params.responseSchema as any,
  };

  const primaryModel = params.preferLite ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
  const fallbackModel = params.preferLite ? 'gemini-4-hydrogen' : 'gemini-3.1-flash-lite';
  const rawSequence = [primaryModel, fallbackModel, primaryModel, fallbackModel, primaryModel];
  const modelSequence = rawSequence.filter((m) => !isModelDailyExhausted(m));
  const candidates = modelSequence.length > 0 ? modelSequence : [primaryModel, fallbackModel];

  let lastError: unknown = null;
  let lastNonQuotaError: unknown = null;
  const skippedDaily = new Set<string>();

  for (let attempt = 0; attempt < candidates.length; attempt += 1) {
    const model = candidates[attempt];
    if (skippedDaily.has(model)) continue;

    if (attempt > 0) {
      const backoffMs = 600 * Math.pow(1.65, attempt - 1) + Math.floor(Math.random() * 250);
      await sleep(backoffMs);
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config:
          model === 'gemini-4-hydrogen'
            ? { ...baseConfig, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : baseConfig,
      });
      recordUsage(response);
      const parsed = JSON.parse((response.text ?? '{}').trim()) as T;
      if (params.cacheKey) setCached(params.cacheKey, parsed);
      return parsed;
    } catch (err) {
      lastError = err;
      console.warn(
        `[gemini] attempt ${attempt + 1} (${model}) failed:`,
        extractRawGeminiMessage(err).slice(0, 220)
      );
      if (isDailyQuotaError(err)) {
        dailyExhaustedUntil.set(model, Date.now() + 10 * 60 * 1000);
        skippedDaily.add(model);
        continue;
      }
      lastNonQuotaError = err;
      if (!isTransientOrParseError(err)) {
        throw formatGeminiError(err);
      }
    }
  }

  throw formatGeminiError(lastNonQuotaError || lastError);
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
    const title = GRAMMAR_TOPICS.find((t) => t.id === topicId)?.title || 'Simple Present';
    links.push({ label: `Study ${title}`, route: 'grammar', topicId });
  }
  if (combined.includes('vocab') || combined.includes('word') || combined.includes('flashcard') || (ctx?.weakVocabWords?.length || 0) > 0) {
    links.push({ label: 'Open Vocabulary Bank', route: 'vocabulary' });
  }
  if (combined.includes('speak') || combined.includes('natural') || combined.includes('conversation') || combined.includes('script')) {
    links.push({ label: 'Practice Script Speaking', route: 'speaking-community' });
  }
  if (combined.includes('sentence') || combined.includes('write')) {
    links.push({ label: 'Open Sentence Builder', route: 'sentence-builder' });
  }
  if (links.length === 0) {
    links.push({ label: 'Build Sentences', route: 'sentence-builder' });
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

  const systemInstruction = `You are the LINGUA Personal AI Learning Coach for an Indonesian hotel & restaurant waiter/server improving their English communication.
Always personalize your advice using the Learner Profile & Live Data provided above—reference their actual weak grammar topics, vocabulary words, or goals directly rather than giving generic boilerplate.
Keep answers concise, practical, encouraging, and structured with hospitality service English examples + brief Indonesian explanations.`;

  let fullText = '';

  const groqKey = getGroqApiKey();
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          stream: true,
          temperature: 0.5,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(18000),
      });

      if (!response.ok || !response.body) {
        const errPayload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        throw formatGroqError(response.status, errPayload?.error?.message || 'Groq stream error');
      }

      usageStats.requests += 1;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const dataStr = line.slice(5).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr) as {
              choices?: { delta?: { content?: string } }[];
            };
            const piece = parsed.choices?.[0]?.delta?.content || '';
            if (piece) {
              fullText += piece;
              onChunk(piece);
            }
          } catch {
            // ignore partial SSE line
          }
        }
      }

      if (fullText) {
        return {
          fullText,
          actions: extractAssistantActions(params.question, fullText, params.learnerContext),
        };
      }
    } catch (err) {
      if (!isGeminiConfigured() || (err as { statusCode?: number })?.statusCode === 401) {
        throw err;
      }
      console.warn('[groq] assistant stream fallback to Gemini:', err instanceof Error ? err.message : err);
    }
  }

  const ai = getAiClient();
  const streamModels = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'].filter(
    (m) => !isModelDailyExhausted(m)
  );
  const candidates = streamModels.length ? streamModels : ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
  let streamErr: unknown = null;

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const model = candidates[idx];
    if (idx > 0) await sleep(500);
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config:
          model === 'gemini-4-hydrogen'
            ? { systemInstruction, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : { systemInstruction },
      });
      usageStats.requests += 1;
      for await (const chunk of stream) {
        const piece = chunk.text || '';
        if (piece) {
          fullText += piece;
          onChunk(piece);
        }
      }
      streamErr = null;
      break;
    } catch (err) {
      streamErr = err;
      if (isDailyQuotaError(err)) {
        dailyExhaustedUntil.set(model, Date.now() + 10 * 60 * 1000);
      } else if (!isTransientOrParseError(err)) {
        throw formatGeminiError(err);
      }
    }
  }

  if (streamErr && !fullText) {
    throw formatGeminiError(streamErr);
  }

  return {
    fullText,
    actions: extractAssistantActions(params.question, fullText, params.learnerContext),
  };
}

// ---------------------------------------------------------------------------
// 2. AI Vocabulary Intelligence (Full 14-point Pack + Interactive Actions)
// ---------------------------------------------------------------------------
const BASIC_GRAMMAR_REQUIRED = [
  {
    tense: 'Simple Present',
    formula: 'Subject + Verb 1 (s/es) / be (am/is/are)',
    fallbackSentence: (w: string) => `We use "${w}" every day to serve restaurant guests politely.`,
    fallbackId: (w: string) => `Kami menggunakan "${w}" setiap hari untuk melayani tamu restoran dengan sopan.`,
  },
  {
    tense: 'Present Continuous',
    formula: 'Subject + am/is/are + Verb-ing',
    fallbackSentence: (w: string) => `I am checking "${w}" for Table 4 right now.`,
    fallbackId: (w: string) => `Saya sedang memeriksa "${w}" untuk Meja 4 sekarang.`,
  },
  {
    tense: 'Simple Past',
    formula: 'Subject + Verb 2 / was-were',
    fallbackSentence: (w: string) => `Earlier today, I handled "${w}" for a hotel guest.`,
    fallbackId: (w: string) => `Tadi, saya menangani "${w}" untuk seorang tamu hotel.`,
  },
  {
    tense: 'Simple Future',
    formula: 'Subject + will + Verb 1',
    fallbackSentence: (w: string) => `I will prepare "${w}" for your table right away.`,
    fallbackId: (w: string) => `Saya akan menyiapkan "${w}" untuk meja Anda segera.`,
  },
  {
    tense: 'Present Perfect',
    formula: 'Subject + have/has + Verb 3',
    fallbackSentence: (w: string) => `I have already confirmed "${w}" with the kitchen team.`,
    fallbackId: (w: string) => `Saya sudah mengonfirmasi "${w}" dengan tim dapur.`,
  },
  {
    tense: 'Modal Verbs',
    formula: 'Would / Could / May / Can + Subject + Verb 1',
    fallbackSentence: (w: string) => `Would you like me to check "${w}" for your order?`,
    fallbackId: (w: string) => `Apakah Anda ingin saya memeriksa "${w}" untuk pesanan Anda?`,
  },
  {
    tense: 'Imperatives',
    formula: '(Please / Kindly) + Verb 1 + Object',
    fallbackSentence: (w: string) => `Please let me know if you need "${w}" during your meal.`,
    fallbackId: (w: string) => `Silakan beri tahu saya jika Anda membutuhkan "${w}" selama bersantap.`,
  },
];

function normalizeVocabularyPayload(cleanWord: string, raw: any) {
  const validCategories = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'phrase', 'other'];
  const rawCategory = String(raw?.category || 'other').toLowerCase().trim();
  const category = validCategories.includes(rawCategory) ? rawCategory : 'other';

  const toStringList = (arr: unknown, max = 10) =>
    Array.isArray(arr)
      ? arr
          .map((item) => String(item || '').trim().slice(0, 150))
          .filter(Boolean)
          .slice(0, max)
      : [];

  const rawSentences = Array.isArray(raw?.sentences) ? raw.sentences : [];
  const normalizedSentences = BASIC_GRAMMAR_REQUIRED.map((req, idx) => {
    const matched =
      rawSentences.find((s: any) =>
        String(s?.tense || '')
          .toLowerCase()
          .includes(req.tense.toLowerCase())
      ) || rawSentences[idx];
    const sentence = String(matched?.sentence || req.fallbackSentence(cleanWord)).trim().slice(0, 300);
    return {
      tense: req.tense,
      sentence,
      translationId: String(matched?.translationId || req.fallbackId(cleanWord)).trim().slice(0, 300),
      formula: String(matched?.formula || req.formula).trim().slice(0, 160),
      subject: String(matched?.subject || (req.tense === 'Imperatives' ? '(You)' : 'I')).trim().slice(0, 80),
      verb: String(matched?.verb || 'serve').trim().slice(0, 80),
      objectComplement: String(matched?.objectComplement || cleanWord).trim().slice(0, 160),
      structureReason: String(matched?.structureReason || `Menunjukkan pola ${req.tense}.`)
        .trim()
        .slice(0, 400),
      dailyUsage: String(matched?.dailyUsage || 'Dipakai waiter saat melayani tamu di hotel atau restoran.')
        .trim()
        .slice(0, 400),
      affirmative: String(matched?.affirmative || sentence).trim().slice(0, 300),
      negative: String(matched?.negative || `Not: ${sentence}`).trim().slice(0, 300),
      interrogative: String(matched?.interrogative || `Question form of: ${sentence}`)
        .trim()
        .slice(0, 300),
    };
  });

  const dailyConversations = Array.isArray(raw?.dailyConversations)
    ? raw.dailyConversations
        .slice(0, 4)
        .map((c: any, idx: number) => ({
          speaker: String(c?.speaker || (idx % 2 === 0 ? 'Waiter' : 'Guest')).trim().slice(0, 40),
          line: String(c?.line || '').trim().slice(0, 220),
          translationId: String(c?.translationId || '').trim().slice(0, 220),
        }))
        .filter((c: { line: string }) => c.line.length > 0)
    : [];

  return {
    word: String(raw?.word || cleanWord).trim().slice(0, 80) || cleanWord,
    meaningId: String(raw?.meaningId || cleanWord).trim().slice(0, 200) || cleanWord,
    category,
    ipa: String(raw?.ipa || '/.../').trim().slice(0, 100),
    commonUsage: String(raw?.commonUsage || '').trim().slice(0, 600),
    grammarExplanation: String(raw?.grammarExplanation || '').trim().slice(0, 1500),
    synonyms: toStringList(raw?.synonyms, 8),
    antonyms: toStringList(raw?.antonyms, 8),
    collocations: toStringList(raw?.collocations, 8),
    phrasalVerbs: toStringList(raw?.phrasalVerbs, 8),
    relatedWords: toStringList(raw?.relatedWords, 8),
    commonMistakes: toStringList(raw?.commonMistakes, 6),
    dailyConversations,
    sentences: normalizedSentences,
  };
}

export async function generateVocabularyMaterial(word: string, level: string) {
  const cleanWord = word.trim();
  const cacheKey = `vocab-basic7:${level}:${cleanWord.toLowerCase()}`;

  const raw = await generateJsonWithFallback({
    cacheKey,
    contents: `Generate complete, simple, practical English learning material for the vocabulary word or phrase "${cleanWord}" tailored for an Indonesian hotel & restaurant waiter/server (reference level ${level}).

Requirements:
1. Word & Indonesian meaning (meaningId)
2. Part of Speech (category: noun, verb, adjective, adverb, preposition, phrase, other)
3. Accurate IPA Pronunciation
4. Common usage summary (how waiters & hospitality staff naturally use it with guests)
5. Synonyms (3-4), Antonyms (2-3 if applicable), Related words (2-3)
6. Natural Collocations (3-4 common hospitality/everyday pairings)
7. Relevant Phrasal Verbs (if any naturally exist; otherwise [])
8. Simple Grammar Guide (short, easy Indonesian explanation)
9. Common Mistakes made by Indonesian learners with this word (2 crisp examples)
10. Daily Conversation Examples (2 short 2-line Waiter/Guest mini-dialogues + Indonesian meaning)
11. MANDATORY 7 BASIC GRAMMAR SENTENCES — You MUST generate exactly 7 example sentences (preferably in hotel/restaurant service context), ONE for EACH of these 7 Basic Grammars in this exact order and using these exact "tense" labels:
    1) "Simple Present"
    2) "Present Continuous"
    3) "Simple Past"
    4) "Simple Future"
    5) "Present Perfect"
    6) "Modal Verbs" (polite offers/requests using Would/Could/May/Can + Verb 1)
    7) "Imperatives" (polite guest instructions using Please/Kindly + Verb 1)
Rules for the 7 sentences:
- Every sentence MUST actively include "${cleanWord}" (or its grammatically inflected form when it is a verb).
- Never skip any of the 7 basic grammars!`,
    systemInstruction:
      'You are an expert English-Indonesian hospitality & waiter communication coach. Always output exactly the 7 required Basic Grammar sentences (Simple Present, Present Continuous, Simple Past, Simple Future, Present Perfect, Modal Verbs, Imperatives) with natural restaurant/hotel waiter English and clear Indonesian translations. Return strictly valid JSON.',
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

  const normalized = normalizeVocabularyPayload(cleanWord, raw);
  setCached(cacheKey, normalized);
  return normalized;
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
    preferLite: true,
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
// 4. AI Sentence Coach (Level-Free Practice + Basic Grammar Support)
// ---------------------------------------------------------------------------
export async function generateSentenceChallenge(
  words: string[],
  grammarFocus?: string,
  learnerContext?: Partial<LearnerContextSummary> | null
) {
  const wordPart = words.length
    ? `incorporating these vocabulary words naturally: ${words.join(', ')}`
    : 'for a hotel or restaurant waiter serving guests politely';
  const grammarPart = grammarFocus && grammarFocus !== 'Free'
    ? `Target basic grammar pattern: ${grammarFocus}.`
    : 'Any of the 7 basic waiter grammar patterns is welcome.';

  return generateJsonWithFallback({
    preferLite: true,
    contents: `Create a practical hotel & restaurant waiter sentence-building prompt without level restrictions, ${wordPart}.
${grammarPart}
Learner background:
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
  grammarFocus?: string;
  challengePrompt: string;
  userSentence: string;
  learnerContext?: Partial<LearnerContextSummary> | null;
}): Promise<SentenceEvaluation> {
  const normalizedWords = params.words.map((w) => w.trim().toLowerCase()).sort().join(',');
  const cacheKey = `sent-eval-v1:${(params.grammarFocus || 'free').toLowerCase()}:${normalizedWords}:${params.userSentence
    .trim()
    .toLowerCase()}`;

  const raw = await generateJsonWithFallback<SentenceEvaluation>({
    preferLite: true,
    cacheKey,
    contents: `Evaluate the learner's English sentence freely (no CEFR level penalty—focus purely on clarity, basic grammar accuracy, and naturalness).
Target vocabulary words (if any): ${params.words.length ? params.words.join(', ') : 'Free choice'}
Target basic grammar focus (if any): ${params.grammarFocus || 'Free choice'}
Prompt/context: ${params.challengePrompt || 'Free sentence writing'}
User sentence: "${params.userSentence}"

Learner context:
${formatLearnerContextBlock(params.learnerContext)}

IMPORTANT PEDAGOGICAL RULE:
- Distinguish grammatically valid yet slightly stiff/literal sentences ("verdict": "correct_unnatural", "isCorrect": true) from sentences that genuinely contain grammar or word-usage mistakes ("verdict": "needs_correction", "isCorrect": false), and fluent natural sentences ("verdict": "natural", "isCorrect": true).
- Evaluate 5 distinct dimensions: grammarAssessment, vocabularyUsageAssessment, sentenceStructureAssessment, contextRelevanceAssessment, naturalnessAssessment.`,
    systemInstruction:
      'Provide encouraging, simple, clear feedback in Indonesian + English examples. Focus on helping the learner write accurate basic-grammar sentences freely.',
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
// 5. Speaking Partner Live Guidance + Roleplay + Session History Analyzer
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
    preferLite: true,
    contents: `Conversation history:
${transcript}

${params.userRole}: ${params.userMessage}`,
    systemInstruction: `Roleplay strictly as "${params.aiRole}" in a hotel/restaurant service scenario "${params.scenarioTitle}".
Context: ${params.context}. Learner role: ${params.userRole}.
Respond naturally in character (1-2 short sentences), plus provide a brief waiter English coaching tip and Indonesian translation.`,
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
    contents: `Evaluate the waiter's hospitality English performance in this hotel/restaurant roleplay ("${params.scenarioTitle}"):
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

function buildFallbackWaiterScript(
  topic: string,
  cleanWords: { word: string; meaningId?: string }[]
) {
  const w1 = cleanWords[0]?.word || 'reservation';
  const w2 = cleanWords[1]?.word || 'recommend';
  const w3 = cleanWords[2]?.word || 'beverage';
  const effectiveTopic =
    cleanWords.length > 0 && (!topic || topic === 'Vocabulary Focus' || topic === 'Auto')
      ? `Waiter Service: ${cleanWords.map((w) => w.word).slice(0, 3).join(', ')}`
      : topic || 'Restaurant Table Service';

  return {
    topic: effectiveTopic,
    roleA: 'Waiter',
    roleB: 'Guest',
    starterPrompts: [
      {
        speakerRole: 'A',
        line: `Good evening and welcome! May I help you with ${w1} tonight?`,
        translationId: `Selamat malam dan selamat datang! Ada yang bisa saya bantu terkait ${w1} malam ini?`,
      },
      {
        speakerRole: 'B',
        line: `Thank you. This is our first visit—what would you ${w2} on the menu?`,
        translationId: `Terima kasih. Ini kunjungan pertama kami—apa yang Anda ${w2} dari menu?`,
      },
      {
        speakerRole: 'A',
        line: `I would gladly ${w2} our chef's grilled special. Would you also like a ${w3}?`,
        translationId: `Saya dengan senang hati ${w2} menu panggang spesial chef kami. Apakah Anda juga ingin ${w3}?`,
      },
      {
        speakerRole: 'B',
        line: `Yes, that sounds wonderful. Let us order that along with fresh juice.`,
        translationId: `Ya, kedengarannya mantap. Kami pesan itu beserta jus segar.`,
      },
      {
        speakerRole: 'A',
        line: `Certainly! I will bring your order right away. Please let me know if you need anything else.`,
        translationId: `Baik! Saya akan segera membawakan pesanan Anda. Silakan beri tahu jika butuh sesuatu.`,
      },
      {
        speakerRole: 'B',
        line: `Thank you for the attentive service.`,
        translationId: `Terima kasih atas pelayanan yang sigap.`,
      },
    ],
    vocabularyHints:
      cleanWords.length > 0
        ? cleanWords.map((w) => ({
            word: w.word,
            meaningId: w.meaningId || 'kosakata layanan restoran',
          }))
        : [
            { word: 'reservation', meaningId: 'reservasi meja' },
            { word: 'recommend', meaningId: 'merekomendasikan' },
            { word: 'beverage', meaningId: 'minuman' },
          ],
    suggestedResponses: [
      'Right away, please give me one moment.',
      'Would you like me to check with the chef?',
      'Enjoy your meal!',
    ],
  };
}

export async function generateSpeakingGuideScript(
  topic: string,
  level: string,
  targetWords: { word: string; meaningId?: string }[] = []
) {
  const cleanWords = targetWords
    .map((w) => ({
      word: String(w.word || '').trim(),
      meaningId: String(w.meaningId || '').trim(),
    }))
    .filter((w) => w.word.length > 0)
    .slice(0, 6);

  const wordsKey = cleanWords.map((w) => w.word.toLowerCase()).sort().join(',');
  const vocabBlock = cleanWords.length
    ? `\nTarget vocabulary inputted by the learner (MUST weave EVERY ONE of these words naturally into the waiter/guest dialogue):\n${cleanWords
        .map((w) => `- ${w.word}${w.meaningId ? ` (${w.meaningId})` : ''}`)
        .join('\n')}`
    : '';

  const topicDirective =
    cleanWords.length && (!topic || topic === 'Vocabulary Focus' || topic === 'Auto')
      ? 'Create a realistic hotel or restaurant waiter-guest conversation theme title that connects all the target vocabulary words naturally.'
      : `Hotel/Restaurant conversation theme: "${topic}".`;

  try {
    const generated = await generateJsonWithFallback<{
      topic: string;
      roleA?: string;
      roleB?: string;
      starterPrompts: { speakerRole: string; line: string; translationId: string }[];
      vocabularyHints: { word: string; meaningId: string }[];
      suggestedResponses: string[];
    }>({
      preferLite: true,
      cacheKey: `speak-script-v4:${level}:${wordsKey}:${topic.toLowerCase()}`,
      contents: `Create a crisp, step-by-step guided speaking script for two learners practicing HOTEL & RESTAURANT WAITER communication.
Speaker A is always the "Waiter", and Speaker B is always the "Guest".
${topicDirective}${vocabBlock}
Include:
- "topic": concise hospitality theme title
- "roleA": "Waiter"
- "roleB": "Guest"
- "starterPrompts": exactly 6 alternating exchanges ("A", "B", "A", "B", "A", "B") with clear spoken English and natural Indonesian translation
- "vocabularyHints": 4-5 helpful hospitality words (word + concise meaningId)
- "suggestedResponses": 3 quick waiter phrases`,
      systemInstruction:
        'Create an orderly, easy-to-read Hotel & Restaurant Waiter vs Guest script in English + Bahasa Indonesia. Use speakerRole "A" (Waiter) and "B" (Guest) strictly alternating. Return strictly JSON.',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          roleA: { type: Type.STRING },
          roleB: { type: Type.STRING },
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
        required: ['topic', 'roleA', 'roleB', 'starterPrompts', 'vocabularyHints', 'suggestedResponses'],
      },
    });

    if (
      Array.isArray(generated?.starterPrompts) &&
      generated.starterPrompts.length >= 4
    ) {
      return {
        ...generated,
        roleA: generated.roleA || 'Waiter',
        roleB: generated.roleB || 'Guest',
        starterPrompts: generated.starterPrompts.slice(0, 6).map((sp, idx) => ({
          speakerRole: idx % 2 === 0 ? 'A' : 'B',
          line: String(sp.line || '').trim(),
          translationId: String(sp.translationId || '').trim(),
        })),
      };
    }
  } catch (err) {
    console.warn('[speaking-guide] using deterministic waiter fallback:', err instanceof Error ? err.message : err);
  }

  return buildFallbackWaiterScript(topic, cleanWords);
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
  targetWords?: string[];
}): Promise<PeerLiveGuidance> {
  const vocabNote = params.targetWords?.length
    ? `\nTarget vocabulary words to weave in: ${params.targetWords.join(', ')}`
    : '';
  return generateJsonWithFallback<PeerLiveGuidance>({
    preferLite: true,
    contents: `Two English learners are speaking live on topic "${params.topic}" (level ${params.level}).${vocabNote}
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
  'speaking-community',
  'simulator',
  'schedule',
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
// 8. Speech Synthesis (TTS), Audio Transcription & Custom Practice Drills
// ---------------------------------------------------------------------------
export async function generateListeningPronunciationDrills(params: {
  words: string[];
  level: string;
}) {
  const cleanWords = params.words
    .map((w) => String(w || '').trim())
    .filter(Boolean)
    .slice(0, 6);
  const wordsBlock = cleanWords.length
    ? `Weave these waiter/hospitality vocabulary words naturally into the drills: ${cleanWords.join(', ')}.`
    : 'Use practical hotel & restaurant waiter-guest communication phrases.';

  return generateJsonWithFallback<{
    listeningDrills: {
      id: string;
      phrase: string;
      question: string;
      options: string[];
      correctIndex: number;
    }[];
    pronunciationDrills: {
      id: string;
      level: string;
      phrase: string;
      ipa: string;
      focus: string;
    }[];
  }>({
    preferLite: true,
    contents: `Create 5 Listening Comprehension drills and 5 Pronunciation & Shadowing drills for an Indonesian hotel & restaurant waiter (Level: ${params.level}).
${wordsBlock}
Each listening drill must have 4 options and correctIndex (0..3). Each pronunciation drill must include accurate IPA and a concise pronunciation tip.`,
    systemInstruction: 'Return strictly valid JSON.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        listeningDrills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              phrase: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
            },
            required: ['id', 'phrase', 'question', 'options', 'correctIndex'],
          },
        },
        pronunciationDrills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              level: { type: Type.STRING },
              phrase: { type: Type.STRING },
              ipa: { type: Type.STRING },
              focus: { type: Type.STRING },
            },
            required: ['id', 'level', 'phrase', 'ipa', 'focus'],
          },
        },
      },
      required: ['listeningDrills', 'pronunciationDrills'],
    },
  });
}

export async function synthesizeSpeech(text: string, voiceName: string, _accent: string) {
  const clean = text.trim();
  const safeVoice = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceName)
    ? voiceName
    : 'Kore';
  const cacheKey = `tts:${safeVoice}:${clean}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const ai = getAiClient(6000);
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

async function transcribeAudioWithGroqWhisper(base64Audio: string, mimeType: string): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured.');

  const cleanMime = (mimeType || 'audio/webm').split(';')[0].trim();
  const ext = cleanMime.includes('wav')
    ? 'wav'
    : cleanMime.includes('mp4') || cleanMime.includes('m4a')
    ? 'm4a'
    : cleanMime.includes('mpeg') || cleanMime.includes('mp3')
    ? 'mp3'
    : cleanMime.includes('ogg')
    ? 'ogg'
    : 'webm';

  const buffer = Buffer.from(base64Audio, 'base64');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: cleanMime }), `speech.${ext}`);
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'en');
  form.append('response_format', 'json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
    signal: AbortSignal.timeout(15000),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    text?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw formatGroqError(response.status, payload?.error?.message || 'Groq Whisper failed.');
  }
  usageStats.requests += 1;
  return (payload.text || '').trim();
}

export async function transcribeAndCompareAudio(params: {
  base64Audio: string;
  mimeType: string;
  targetPhrase: string;
  accent: string;
}) {
  let transcript = '';

  if (isGroqConfigured()) {
    try {
      transcript = await transcribeAudioWithGroqWhisper(params.base64Audio, params.mimeType);
    } catch (groqErr) {
      if (!isGeminiConfigured() || (groqErr as { statusCode?: number })?.statusCode === 401) {
        throw groqErr;
      }
      console.warn('[groq] whisper fallback to Gemini:', groqErr instanceof Error ? groqErr.message : groqErr);
    }
  }

  if (!transcript && isGeminiConfigured()) {
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
    transcript = (transcribeResponse.text ?? '').trim();
  }

  const comparison = await generateJsonWithFallback<{
    matchPercentage: number;
    matchedWords: string[];
    missedOrDifferentWords: string[];
    feedback: string;
    practiceTip: string;
  }>({
    preferLite: true,
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
