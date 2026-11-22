import 'dotenv/config';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  adaptSpeakingGuideNext,
  analyzeGrammarSentence,
  assistVocabularyWord,
  evaluateSentenceBuilder,
  evaluateSimulatorSession,
  evaluateVocabularyPractice,
  generateDailyChallengeAI,
  generateLearningEvaluation,
  generatePersonalizedLearningPath,
  generateSentenceChallenge,
  generateSpeakingGuideScript,
  generateVocabularyMaterial,
  getUsageStats,
  isGeminiConfigured,
  livePeerGuidance,
  runSimulatorTurn,
  runTutorChatTurn,
  streamPersonalAssistant,
  summarizeSpeakingSession,
  synthesizeSpeech,
  transcribeAndCompareAudio,
  transformGrammarSentence,
} from './server/gemini';
import { attachWebSocketHub } from './server/wsHub';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '6mb' }));

  const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests. Please wait a moment before trying again.' },
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: isGeminiConfigured(),
      webrtcSignaling: true,
      usage: getUsageStats(),
    });
  });

  app.use('/api/ai', aiRateLimiter);

  // ------------------------------------------------------------------
  // 1. Personal AI Learning Assistant (SSE Streaming)
  // ------------------------------------------------------------------
  app.post('/api/ai/assistant/stream', async (req, res) => {
    const question = String(req.body?.question || '').trim();
    if (!question || question.length > 800) {
      return res.status(400).json({ error: 'Please ask a clear question (1-800 characters).' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const history = Array.isArray(req.body?.history)
        ? req.body.history
            .slice(-6)
            .map((h: Record<string, unknown>) => ({
              role: h?.role === 'assistant' ? ('assistant' as const) : ('user' as const),
              text: String(h?.text || '').slice(0, 600),
            }))
        : [];

      const result = await streamPersonalAssistant(
        {
          question,
          history,
          learnerContext: req.body?.learnerContext || null,
        },
        (delta) => {
          writeEvent('chunk', { text: delta });
        }
      );

      writeEvent('done', { fullText: result.fullText, actions: result.actions });
      res.end();
    } catch (error) {
      writeEvent('error', {
        error: error instanceof Error ? error.message : 'Assistant request failed.',
      });
      res.end();
    }
  });

  // ------------------------------------------------------------------
  // 2. AI Vocabulary Intelligence
  // ------------------------------------------------------------------
  app.post('/api/ai/vocabulary/generate', async (req, res) => {
    try {
      const word = String(req.body?.word || '').trim();
      const level = String(req.body?.level || 'B1-B2').trim();
      if (!word || word.length > 80) {
        return res.status(400).json({ error: 'Please provide a valid English word (1-80 chars).' });
      }
      const data = await generateVocabularyMaterial(word, level);
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate vocabulary material.',
      });
    }
  });

  app.post('/api/ai/vocabulary/assist', async (req, res) => {
    try {
      const word = String(req.body?.word || '').trim();
      const meaningId = String(req.body?.meaningId || '').trim();
      const category = String(req.body?.category || 'word').trim();
      const level = String(req.body?.level || 'B1-B2').trim();
      const action = req.body?.action;
      if (!word || !['explain', 'more_examples', 'simpler', 'advanced'].includes(action)) {
        return res.status(400).json({ error: 'Valid word and action are required.' });
      }
      const data = await assistVocabularyWord({
        word: word.slice(0, 80),
        meaningId: meaningId.slice(0, 200),
        category: category.slice(0, 30),
        level,
        action,
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Vocabulary assistant failed.',
      });
    }
  });

  app.post('/api/ai/vocabulary/evaluate', async (req, res) => {
    try {
      const { word, meaningId, mode, prompt, userAnswer } = req.body || {};
      if (!word || !userAnswer) {
        return res.status(400).json({ error: 'Word and user answer are required.' });
      }
      const data = await evaluateVocabularyPractice({
        word: String(word).slice(0, 80),
        meaningId: String(meaningId || '').slice(0, 200),
        mode: String(mode || 'Create Sentence').slice(0, 60),
        prompt: String(prompt || '').slice(0, 300),
        userAnswer: String(userAnswer).slice(0, 500),
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to evaluate vocabulary practice.',
      });
    }
  });

  // ------------------------------------------------------------------
  // 3. AI Grammar Analyzer & Transformers
  // ------------------------------------------------------------------
  app.post('/api/ai/grammar/analyze', async (req, res) => {
    try {
      const sentence = String(req.body?.sentence || '').trim();
      const level = String(req.body?.level || 'B1-B2').trim();
      if (!sentence || sentence.length > 500) {
        return res.status(400).json({ error: 'Please enter an English sentence (1-500 characters).' });
      }
      const data = await analyzeGrammarSentence({
        sentence,
        level,
        learnerContext: req.body?.learnerContext || null,
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to analyze grammar sentence.',
      });
    }
  });

  app.post('/api/ai/grammar/transform', async (req, res) => {
    try {
      const sentence = String(req.body?.sentence || '').trim();
      const action = req.body?.action;
      const targetTense = req.body?.targetTense ? String(req.body.targetTense).slice(0, 60) : undefined;
      const level = String(req.body?.level || 'B1-B2').trim();
      if (
        !sentence ||
        sentence.length > 500 ||
        !['explain_words', 'change_tense', 'negative', 'interrogative', 'natural', 'translate_id'].includes(action)
      ) {
        return res.status(400).json({ error: 'Valid sentence and transformation action are required.' });
      }
      const data = await transformGrammarSentence({ sentence, action, targetTense, level });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to transform sentence.',
      });
    }
  });

  // ------------------------------------------------------------------
  // 4. AI Sentence Coach
  // ------------------------------------------------------------------
  app.post('/api/ai/sentence-builder/challenge', async (req, res) => {
    try {
      const words = Array.isArray(req.body?.words) ? req.body.words.map(String).slice(0, 5) : [];
      const difficulty = String(req.body?.difficulty || 'Intermediate').slice(0, 40);
      if (words.length === 0) {
        return res.status(400).json({ error: 'Select at least one vocabulary word.' });
      }
      const data = await generateSentenceChallenge(words, difficulty, req.body?.learnerContext || null);
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate sentence challenge.',
      });
    }
  });

  app.post('/api/ai/sentence-builder/evaluate', async (req, res) => {
    try {
      const words = Array.isArray(req.body?.words) ? req.body.words.map(String).slice(0, 5) : [];
      const difficulty = String(req.body?.difficulty || 'Intermediate').slice(0, 40);
      const challengePrompt = String(req.body?.challengePrompt || '').slice(0, 400);
      const userSentence = String(req.body?.userSentence || '').trim().slice(0, 600);
      if (!userSentence) {
        return res.status(400).json({ error: 'Please write your sentence before submitting.' });
      }
      const data = await evaluateSentenceBuilder({
        words,
        difficulty,
        challengePrompt,
        userSentence,
        learnerContext: req.body?.learnerContext || null,
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to evaluate sentence.',
      });
    }
  });

  // ------------------------------------------------------------------
  // 5. AI Native Tutor & Simulator & Speaking Community
  // ------------------------------------------------------------------
  app.post('/api/ai/tutor/chat', async (req, res) => {
    try {
      const {
        tutorName,
        accent,
        personality,
        teachingStyle,
        mode,
        speed,
        level,
        showTranslation,
        history,
        userMessage,
        learnerContext,
      } = req.body || {};
      if (!userMessage) {
        return res.status(400).json({ error: 'Message is required.' });
      }
      const data = await runTutorChatTurn({
        tutorName: String(tutorName || 'Emma').slice(0, 60),
        accent: String(accent || 'American').slice(0, 20),
        personality: String(personality || 'Warm and encouraging').slice(0, 200),
        teachingStyle: String(teachingStyle || 'Conversational').slice(0, 200),
        mode: String(mode || 'Friendly Conversation').slice(0, 60),
        speed: String(speed || 'normal').slice(0, 20),
        level: String(level || 'B1-B2').slice(0, 20),
        showTranslation: Boolean(showTranslation),
        history: Array.isArray(history) ? history.slice(-10) : [],
        userMessage: String(userMessage).slice(0, 800),
        learnerContext: learnerContext || null,
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to reach AI Native Tutor.',
      });
    }
  });

  app.post('/api/ai/simulator/turn', async (req, res) => {
    try {
      const { scenarioTitle, aiRole, userRole, context, level, history, userMessage } = req.body || {};
      if (!userMessage) {
        return res.status(400).json({ error: 'User response is required.' });
      }
      const data = await runSimulatorTurn({
        scenarioTitle: String(scenarioTitle || 'Conversation'),
        aiRole: String(aiRole || 'Partner'),
        userRole: String(userRole || 'Learner'),
        context: String(context || ''),
        level: String(level || 'B1-B2'),
        history: Array.isArray(history) ? history.slice(-10) : [],
        userMessage: String(userMessage).slice(0, 800),
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to continue simulation.',
      });
    }
  });

  app.post('/api/ai/simulator/evaluate', async (req, res) => {
    try {
      const { scenarioTitle, level, history } = req.body || {};
      const data = await evaluateSimulatorSession({
        scenarioTitle: String(scenarioTitle || 'Simulation'),
        level: String(level || 'B1-B2'),
        history: Array.isArray(history) ? history.slice(-30) : [],
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to evaluate simulation.',
      });
    }
  });

  app.post('/api/ai/speaking-guide/script', async (req, res) => {
    try {
      const topic = String(req.body?.topic || 'Introduction');
      const level = String(req.body?.level || 'B1-B2');
      const data = await generateSpeakingGuideScript(topic, level);
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate conversation guide.',
      });
    }
  });

  app.post('/api/ai/speaking-guide/next', async (req, res) => {
    try {
      const topic = String(req.body?.topic || 'Introduction');
      const mode = String(req.body?.mode || 'Smart Guidance');
      const level = String(req.body?.level || 'B1-B2');
      const recentLines = Array.isArray(req.body?.recentLines) ? req.body.recentLines.map(String) : [];
      const data = await adaptSpeakingGuideNext({ topic, mode, level, recentLines });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to adapt conversation guide.',
      });
    }
  });

  app.post('/api/ai/speaking-guide/live-guidance', async (req, res) => {
    try {
      const topic = String(req.body?.topic || 'Free Discussion').slice(0, 80);
      const level = String(req.body?.level || 'B1-B2').slice(0, 20);
      const recentLines = Array.isArray(req.body?.recentLines)
        ? req.body.recentLines.map((l: unknown) => String(l).slice(0, 240)).slice(-8)
        : [];
      const data = await livePeerGuidance({ topic, level, recentLines });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Live speaking guidance failed.',
      });
    }
  });

  app.post('/api/ai/speaking-guide/summary', async (req, res) => {
    try {
      const topic = String(req.body?.topic || 'Speaking Session').slice(0, 120);
      const durationSeconds = Number(req.body?.durationSeconds || 0);
      const transcript = Array.isArray(req.body?.transcript) ? req.body.transcript.slice(-60) : [];
      const data = await summarizeSpeakingSession({ topic, durationSeconds, transcript });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate speaking summary.',
      });
    }
  });

  // ------------------------------------------------------------------
  // 6. Learning Path, Learning Evaluation & Daily Challenge Generators
  // ------------------------------------------------------------------
  app.post('/api/ai/learning-path/generate', async (req, res) => {
    try {
      const data = await generatePersonalizedLearningPath(req.body?.learnerContext || {});
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate personalized learning path.',
      });
    }
  });

  app.post('/api/ai/analytics/evaluation', async (req, res) => {
    try {
      const data = await generateLearningEvaluation(req.body?.learnerContext || {});
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate learning evaluation.',
      });
    }
  });

  app.post('/api/ai/daily-challenge/generate', async (req, res) => {
    try {
      const recentTitles = Array.isArray(req.body?.recentTitles)
        ? req.body.recentTitles.map(String).slice(0, 10)
        : [];
      const preferredType = req.body?.preferredType;
      const data = await generateDailyChallengeAI({
        learnerContext: req.body?.learnerContext || {},
        recentTitles,
        preferredType,
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate AI daily challenge.',
      });
    }
  });

  // ------------------------------------------------------------------
  // 7. TTS & Transcribe
  // ------------------------------------------------------------------
  app.post('/api/ai/tts', async (req, res) => {
    try {
      const text = String(req.body?.text || '').trim();
      const voiceName = String(req.body?.voiceName || 'Kore');
      const accent = String(req.body?.accent || 'American');
      if (!text || text.length > 600) {
        return res.status(400).json({ error: 'Text for speech synthesis must be 1-600 characters.' });
      }
      const audioBase64 = await synthesizeSpeech(text, voiceName, accent);
      return res.json({ audioBase64, mimeType: 'audio/wav' });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Speech synthesis failed.',
      });
    }
  });

  app.post('/api/ai/transcribe', async (req, res) => {
    try {
      const { base64Audio, mimeType, targetPhrase, accent } = req.body || {};
      if (!base64Audio || !targetPhrase) {
        return res.status(400).json({ error: 'Audio data and target phrase are required.' });
      }
      const data = await transcribeAndCompareAudio({
        base64Audio: String(base64Audio),
        mimeType: String(mimeType || 'audio/webm'),
        targetPhrase: String(targetPhrase),
        accent: String(accent || 'American'),
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Audio transcription failed.',
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = createServer(app);
  attachWebSocketHub(server);

  const port = Number(process.env.PORT || 3000);
  server.listen(port, '0.0.0.0', () => {
    console.log(`LINGUA server listening on http://localhost:${port}`);
  });
}

bootstrap();
