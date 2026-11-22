import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookmarkPlus,
  Bot,
  Languages,
  Loader2,
  Mic,
  PhoneOff,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { mapMistakeToGrammarTopicId } from '../../lib/aiMemory';
import { TUTOR_MODES, TUTOR_PERSONAS } from '../../lib/curriculum';
import type {
  EnglishAccent,
  SpeakingSpeed,
  SpeakingSummaryReport,
  TranscriptEntry,
  TutorPersona,
} from '../../types/lingua';
import { PageHeader, useToast } from '../ui/ToastAndPrimitives';

const SUGGESTED_RESPONSES_BY_MODE: Record<string, string[]> = {
  'Friendly Conversation': [
    'How has your week been so far?',
    'I am working on sounding more natural in everyday chats.',
    'Can we talk about daily routines and hobbies?',
  ],
  'Professional Tutor': [
    'Could you help me polish my phrasing for team meetings?',
    'Please explain the subtle nuance between formal and casual replies.',
    'Let us practice giving a clear project status update.',
  ],
  'Strict Practice': [
    'Please check every tense and preposition mistake in my answers.',
    'Let me try describing what I accomplished yesterday.',
    'Challenge me to correct any grammar slips myself.',
  ],
  'Interview Practice': [
    'Please ask me "Tell me about yourself" and evaluate my answer.',
    'How can I describe a challenging project using the STAR method?',
    'Ask me a behavioral question about teamwork.',
  ],
  'Free Speaking': [
    'Let us speak freely for a few minutes about career goals.',
    'Ask me open-ended questions without pausing for grammar notes.',
    'I want to build speaking flow on travel and culture.',
  ],
};

const SPEED_OPTIONS: { value: SpeakingSpeed; label: string }[] = [
  { value: 'slow', label: 'Slow Speech' },
  { value: 'normal', label: 'Normal Speech' },
  { value: 'natural', label: 'Advanced Speech' },
];

function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function pcm16Base64ToFloat32(base64: string): Float32Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

export function AiNativeTutorView() {
  const {
    profile,
    account,
    tutorPrefs,
    learnerContext,
    updateTutorPreferences,
    grantAudioConsent,
    speakText,
    saveSpeakingSession,
    saveWordFromAnywhere,
    recordLearningInsight,
    navigateToGrammarTopic,
    openAssistantWithPrompt,
    setActiveRoute,
  } = useLingua();
  const { showToast } = useToast();

  const initialMode =
    tutorPrefs?.preferredMode && (TUTOR_MODES as readonly string[]).includes(tutorPrefs.preferredMode)
      ? tutorPrefs.preferredMode
      : TUTOR_MODES[0];

  const [selectedTutorId, setSelectedTutorId] = useState<string>(
    tutorPrefs?.selectedTutorId || 'emma'
  );
  const selectedTutor: TutorPersona =
    TUTOR_PERSONAS.find((t) => t.id === selectedTutorId) || TUTOR_PERSONAS[0];

  const [mode, setMode] = useState<string>(initialMode);
  const [accentOverride, setAccentOverride] = useState<EnglishAccent>(selectedTutor.accent);
  const [speed, setSpeed] = useState<SpeakingSpeed>(
    tutorPrefs?.speakingSpeed || selectedTutor.speakingSpeed || 'normal'
  );
  const [showTranslations, setShowTranslations] = useState<boolean>(
    tutorPrefs?.showTranslations ?? true
  );
  const [liveActive, setLiveActive] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string>('Ready for voice or text');
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sendingText, setSendingText] = useState(false);
  const [analyzingSession, setAnalyzingSession] = useState(false);
  const [sessionReport, setSessionReport] = useState<SpeakingSummaryReport | null>(null);
  const [savingWord, setSavingWord] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    {
      id: 'greeting-1',
      speaker: selectedTutor.name,
      text: selectedTutor.greeting,
      translationId: 'Halo! Mari mulai percakapan bahasa Inggris yang santai hari ini.',
      timestamp: new Date().toISOString(),
    },
  ]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(Date.now());
  const summaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (sessionReport) {
      summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [sessionReport]);

  const stopLiveVoice = async () => {
    try {
      wsRef.current?.close();
    } catch {
      // ignore
    }
    wsRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    await inputCtxRef.current?.close().catch(() => {});
    await outputCtxRef.current?.close().catch(() => {});
    inputCtxRef.current = null;
    outputCtxRef.current = null;
    setLiveActive(false);
    setLiveStatus('Voice session ended');

    const elapsedSec = Math.max(10, Math.round((Date.now() - sessionStartRef.current) / 1000));
    if (transcript.length > 1) {
      await saveSpeakingSession({
        sessionType: 'ai-tutor',
        topic: `${mode} with ${selectedTutor.name}`,
        tutorId: selectedTutor.id,
        durationSeconds: elapsedSec,
        transcript,
      });
      showToast('Speaking session saved', 'success');
    }
  };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      inputCtxRef.current?.close().catch(() => {});
      outputCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const handleSelectTutor = async (tutor: TutorPersona) => {
    setSelectedTutorId(tutor.id);
    setAccentOverride(tutor.accent);
    setSessionReport(null);
    setTranscript([
      {
        id: `greet-${tutor.id}`,
        speaker: tutor.name,
        text: tutor.greeting,
        translationId: 'Halo! Mari mulai percakapan bahasa Inggris bersama saya.',
        timestamp: new Date().toISOString(),
      },
    ]);
    await updateTutorPreferences({ selectedTutorId: tutor.id });
  };

  const startLiveVoice = async () => {
    setError(null);
    if (!account?.audioConsentGranted) {
      await grantAudioConsent(true);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;
      sessionStartRef.current = Date.now();

      const contextNote = [
        learnerContext.weakGrammarTopics.length
          ? `Weak grammar: ${learnerContext.weakGrammarTopics.slice(0, 2).join(', ')}`
          : '',
        learnerContext.weakVocabWords.length
          ? `Practice words: ${learnerContext.weakVocabWords.slice(0, 4).join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('. ');

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const qs = new URLSearchParams({
        tutorName: selectedTutor.name,
        voiceName: selectedTutor.voiceName,
        accent: accentOverride,
        mode,
        speed,
        level: profile?.level || 'B1-B2',
        contextNote,
      });
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/live?${qs.toString()}`);
      wsRef.current = ws;
      setLiveStatus('Connecting to Gemini Live...');
      setLiveActive(true);

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'ready') {
          setLiveStatus(`Connected · ${selectedTutor.name} (${accentOverride})`);
        } else if (msg.type === 'error') {
          setError(msg.message);
          stopLiveVoice();
        } else if (msg.type === 'audio' && outputCtxRef.current) {
          const float32 = pcm16Base64ToFloat32(msg.audio);
          const buffer = outputCtxRef.current.createBuffer(1, float32.length, 24000);
          buffer.getChannelData(0).set(float32);
          const source = outputCtxRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(outputCtxRef.current.destination);
          const startAt = Math.max(outputCtxRef.current.currentTime, nextStartTimeRef.current);
          source.start(startAt);
          nextStartTimeRef.current = startAt + buffer.duration;
        } else if (msg.type === 'inputTranscript' && msg.text) {
          setTranscript((prev) => [
            ...prev,
            {
              id: `u-${Date.now()}`,
              speaker: profile?.displayName || 'You',
              text: msg.text,
              timestamp: new Date().toISOString(),
            },
          ]);
        } else if (msg.type === 'outputTranscript' && msg.text) {
          setTranscript((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              speaker: selectedTutor.name,
              text: msg.text,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      };

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(inputCtx.destination);
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const base64 = float32ToPcm16Base64(e.inputBuffer.getChannelData(0));
          wsRef.current.send(JSON.stringify({ audio: base64 }));
        }
      };
    } catch {
      setError('Could not access microphone or establish Live Audio stream.');
      setLiveActive(false);
    }
  };

  const sendMessage = async (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean || sendingText) return;
    setError(null);
    setInputText('');

    const userEntry: TranscriptEntry = {
      id: `u-${Date.now()}`,
      speaker: profile?.displayName || 'You',
      text: clean,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...transcript, userEntry];
    setTranscript(nextHistory);

    setSendingText(true);
    try {
      const res = await fetch('/api/ai/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorName: selectedTutor.name,
          accent: accentOverride,
          personality: selectedTutor.personality,
          teachingStyle: selectedTutor.teachingStyle,
          mode,
          speed,
          level: profile?.level || 'B1-B2',
          showTranslation: showTranslations,
          history: nextHistory.map((h) => ({ speaker: h.speaker, text: h.text })),
          userMessage: clean,
          learnerContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tutor reply failed.');

      const aiEntry: TranscriptEntry = {
        id: `ai-${Date.now()}`,
        speaker: selectedTutor.name,
        text: data.reply,
        translationId: data.translationId,
        grammarCorrection: data.grammarCorrection,
        naturalAlternative: data.naturalAlternative,
        timestamp: new Date().toISOString(),
      };
      setTranscript((prev) => [...prev, aiEntry]);

      if (data.grammarCorrection) {
        await recordLearningInsight({
          sourceModule: 'ai-tutor',
          mistakeOriginal: clean,
          correction: data.grammarCorrection,
          explanation: data.naturalAlternative || 'AI Tutor grammar feedback',
          grammarTopicId: mapMistakeToGrammarTopicId(data.grammarCorrection),
        });
      }

      const voiceForAccent =
        accentOverride === 'British' && selectedTutor.accent === 'American'
          ? 'Charon'
          : accentOverride === 'American' && selectedTutor.accent === 'British'
          ? 'Kore'
          : selectedTutor.voiceName;

      speakText(data.reply, accentOverride, voiceForAccent, speed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach AI Tutor.');
    } finally {
      setSendingText(false);
    }
  };

  const handleEndAndAnalyze = async () => {
    if (analyzingSession || transcript.length < 2) return;
    setAnalyzingSession(true);
    setError(null);
    const elapsedSec = Math.max(30, Math.round((Date.now() - sessionStartRef.current) / 1000));
    try {
      const res = await fetch('/api/ai/speaking-guide/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `${mode} with ${selectedTutor.name}`,
          durationSeconds: elapsedSec,
          transcript: transcript.map((t) => ({ speaker: t.speaker, text: t.text })),
        }),
      });
      const report: SpeakingSummaryReport = await res.json();
      if (!res.ok) {
        throw new Error((report as unknown as { error?: string }).error || 'Analysis failed.');
      }
      setSessionReport(report);
      await saveSpeakingSession({
        sessionType: 'ai-tutor',
        topic: `${mode} with ${selectedTutor.name}`,
        tutorId: selectedTutor.id,
        durationSeconds: elapsedSec,
        summaryText: report.summary || report.speakingPerformance,
        transcript,
      });
      showToast('Session analyzed & saved', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyze speaking session.');
    } finally {
      setAnalyzingSession(false);
    }
  };

  const handleSaveSuggestedWord = async (word: string) => {
    setSavingWord(word);
    try {
      const { existed } = await saveWordFromAnywhere(word);
      showToast(
        existed ? `"${word}" already in vocabulary` : `Saved "${word}" to vocabulary`,
        'success'
      );
    } catch (err) {
      showToast('Could not save word', 'error', err instanceof Error ? err.message : undefined);
    } finally {
      setSavingWord(null);
    }
  };

  const handleRepeatConversation = () => {
    setSessionReport(null);
    sessionStartRef.current = Date.now();
    setTranscript([
      {
        id: `repeat-${Date.now()}`,
        speaker: selectedTutor.name,
        text: selectedTutor.greeting,
        translationId: 'Mari ulangi dan tingkatkan percakapan kita!',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const suggestedResponses =
    SUGGESTED_RESPONSES_BY_MODE[mode] || SUGGESTED_RESPONSES_BY_MODE['Friendly Conversation'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Tutor"
        subtitle="Practice real-time voice or guided text dialogue with adaptive pacing, American/British accent control, and Learner Memory personalization."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Accent Switch */}
            <div className="inline-flex rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] p-0.5">
              {(['American', 'British'] as EnglishAccent[]).map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => setAccentOverride(acc)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    accentOverride === acc
                      ? 'bg-[#243B53] text-white'
                      : 'text-[#718096] dark:text-slate-300'
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !showTranslations;
                setShowTranslations(next);
                updateTutorPreferences({ showTranslations: next });
              }}
              className="px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] text-xs font-semibold text-[#243447] dark:text-slate-200 flex items-center gap-1.5 transition-colors hover:bg-[#F7F8FA]"
            >
              <Languages className="w-3.5 h-3.5 text-[#3C8D8A]" />
              <span>ID: {showTranslations ? 'On' : 'Off'}</span>
            </button>
          </div>
        }
      />

      {/* 5 Native Tutor Personas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {TUTOR_PERSONAS.map((tutor) => {
          const active = tutor.id === selectedTutor.id;
          return (
            <button
              key={tutor.id}
              type="button"
              onClick={() => handleSelectTutor(tutor)}
              className={`p-3.5 rounded-xl border text-left transition-colors flex flex-col gap-2 ${
                active
                  ? 'border-[#3C8D8A] bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/15'
                  : 'border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={tutor.avatarUrl}
                  alt={tutor.name}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-lg object-cover shrink-0 bg-[#E4E8EE]"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-[#243447] dark:text-white truncate">
                    {tutor.name}
                  </div>
                  <div className="text-[11px] text-[#718096] truncate">
                    {tutor.accent} · {tutor.speakingSpeed}
                  </div>
                </div>
              </div>
              <div className="text-xs font-medium text-[#486581] dark:text-slate-300 truncate">
                {tutor.roleTitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mode & Speaking Speed Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TUTOR_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                updateTutorPreferences({ preferredMode: m });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                mode === m
                  ? 'bg-[#243B53] text-white font-semibold'
                  : 'bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] p-1 self-start">
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setSpeed(opt.value);
                updateTutorPreferences({ speakingSpeed: opt.value });
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                speed === opt.value
                  ? 'bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED]'
                  : 'text-[#718096] dark:text-slate-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Focused Speaking Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Transcript & Voice Controls */}
        <div className="lg:col-span-8 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 flex flex-col h-[500px]">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E4E8EE] dark:border-[#263344]">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={selectedTutor.avatarUrl}
                alt={selectedTutor.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#243447] dark:text-white truncate">
                  {selectedTutor.name} · {accentOverride} English
                </div>
                <div className="text-xs text-[#718096] truncate">{liveStatus}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {transcript.length > 1 && (
                <button
                  type="button"
                  disabled={analyzingSession}
                  onClick={handleEndAndAnalyze}
                  className="px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] flex items-center gap-1.5"
                >
                  {analyzingSession ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3C8D8A]" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-[#3C8D8A]" />
                  )}
                  <span>{analyzingSession ? 'Analyzing...' : 'End & Analyze'}</span>
                </button>
              )}

              {!liveActive ? (
                <button
                  type="button"
                  onClick={startLiveVoice}
                  className="px-3.5 py-2 rounded-lg bg-[#3C8D8A] hover:bg-[#317572] text-white text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Start Voice</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopLiveVoice}
                  className="px-3.5 py-2 rounded-lg bg-[#D65A5A] hover:bg-[#BF4B4B] text-white text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>End Call</span>
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 p-2.5 rounded-lg bg-[#FDF2F2] dark:bg-[#D65A5A]/15 border border-[#F5C6C6] text-xs text-[#9E3535] dark:text-rose-200">
              {error}
            </div>
          )}

          {/* Transcript Feed */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {transcript.map((entry) => {
              const isTutor = entry.speaker === selectedTutor.name;
              const isFreeSpeaking = mode === 'Free Speaking';
              return (
                <div
                  key={entry.id}
                  className={`flex flex-col ${isTutor ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm space-y-1.5 ${
                      isTutor
                        ? 'bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-[#243447] dark:text-slate-100'
                        : 'bg-[#243B53] text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px] opacity-75">
                      <span className="font-semibold">{entry.speaker}</span>
                      {isTutor && (
                        <button
                          type="button"
                          onClick={() =>
                            speakText(entry.text, accentOverride, selectedTutor.voiceName, speed)
                          }
                          aria-label="Replay tutor audio"
                          className="hover:opacity-100"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="leading-relaxed">{entry.text}</p>
                    {showTranslations && entry.translationId && (
                      <p className="text-xs opacity-75 border-t border-black/10 dark:border-white/10 pt-1.5">
                        ID: {entry.translationId}
                      </p>
                    )}
                  </div>
                  {(entry.grammarCorrection || entry.naturalAlternative) && (
                    <div className="mt-1.5 max-w-[85%] p-2.5 rounded-lg bg-[#FDF6E7] dark:bg-[#D69E36]/15 border border-[#EFE0BC] dark:border-[#D69E36]/30 text-xs space-y-1 text-[#243447] dark:text-amber-100">
                      {isFreeSpeaking && (
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#718096]">
                          Saved Note (Non-Interruptive)
                        </div>
                      )}
                      {entry.grammarCorrection && (
                        <div>
                          <span className="font-semibold">Grammar tip:</span>{' '}
                          {entry.grammarCorrection}
                        </div>
                      )}
                      {entry.naturalAlternative && (
                        <div>
                          <span className="font-semibold">More natural:</span>{' '}
                          {entry.naturalAlternative}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Suggested Quick Responses */}
          <div className="pt-2 pb-2.5 border-t border-[#E4E8EE] dark:border-[#263344] flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[#A0AEC0] mr-1">Suggested:</span>
            {suggestedResponses.map((reply) => (
              <button
                key={reply}
                type="button"
                disabled={sendingText}
                onClick={() => sendMessage(reply)}
                className="px-2.5 py-1 rounded-md border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] hover:bg-[#E6F0ED] text-[11px] font-medium text-[#486581] dark:text-slate-300 transition-colors text-left"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Text Turn Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputText);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${selectedTutor.name} or use Start Voice above...`}
              className="flex-1 px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40 focus:border-[#3C8D8A]"
            />
            <button
              type="submit"
              disabled={sendingText}
              aria-label="Send message to tutor"
              className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingText ? '...' : 'Send'}</span>
            </button>
          </form>
        </div>

        {/* Clean Tutor Context Sidebar */}
        <div className="lg:col-span-4 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3C8D8A]">
            <Bot className="w-4 h-4" />
            <span>Session &amp; Learner Memory</span>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <div className="text-[#718096]">Active Mode &amp; Pacing</div>
              <div className="font-semibold text-[#243447] dark:text-white mt-0.5">
                {mode} · {SPEED_OPTIONS.find((s) => s.value === speed)?.label}
              </div>
            </div>
            <div>
              <div className="text-[#718096]">Teaching Style</div>
              <p className="font-medium text-[#243447] dark:text-slate-200 mt-0.5 leading-relaxed">
                {selectedTutor.teachingStyle}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-1">
              <div className="font-semibold text-[#243447] dark:text-white">
                Active Learner Memory
              </div>
              <div className="text-[#718096]">
                Grammar focus:{' '}
                <span className="text-[#243447] dark:text-slate-200 font-medium">
                  {learnerContext.weakGrammarTopics.slice(0, 2).join(', ') || 'General fluency'}
                </span>
              </div>
              <div className="text-[#718096]">
                Target vocab:{' '}
                <span className="text-[#243447] dark:text-slate-200 font-medium">
                  {learnerContext.weakVocabWords.slice(0, 3).join(', ') || 'Open topic'}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-[#E4E8EE] dark:border-[#263344] flex items-center justify-between text-[#718096]">
              <span>Audio Consent</span>
              <span className="font-semibold text-[#243447] dark:text-white">
                {account?.audioConsentGranted ? 'Granted' : 'Requested on call'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Post-Session Conversation Analyzer Report */}
      {sessionReport && (
        <div
          ref={summaryRef}
          className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E8EE] dark:border-[#263344]">
            <div>
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                AI Conversation Analysis
              </h2>
              <p className="text-xs text-[#718096]">
                {mode} with {selectedTutor.name} · {sessionReport.durationFormatted}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRepeatConversation}
                className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#3C8D8A]" />
                <span>Repeat Conversation</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  navigateToGrammarTopic(sessionReport.linkedGrammarTopicIds?.[0] || 'simple-past')
                }
                className="px-3 py-1.5 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] text-xs font-semibold flex items-center gap-1.5"
              >
                <span>Review Grammar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveRoute('sentence-builder')}
                className="px-3 py-1.5 rounded-lg bg-[#243B53] text-white text-xs font-semibold"
              >
                Practice Mistakes
              </button>
            </div>
          </div>

          <p className="text-sm text-[#486581] dark:text-slate-300 leading-relaxed">
            {sessionReport.summary || sessionReport.speakingPerformance}
          </p>

          {sessionReport.newVocabulary && sessionReport.newVocabulary.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#718096]">
                Useful Vocabulary from Session
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sessionReport.newVocabulary.map((nv) => (
                  <div
                    key={nv.word}
                    className="p-3 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[#243447] dark:text-white capitalize">
                        {nv.word} · <span className="font-normal text-[#718096]">{nv.meaningId}</span>
                      </div>
                      <div className="text-[#486581] dark:text-slate-300">{nv.example}</div>
                    </div>
                    <button
                      type="button"
                      disabled={savingWord === nv.word}
                      onClick={() => handleSaveSuggestedWord(nv.word)}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] font-semibold text-[#3C8D8A] shrink-0 flex items-center gap-1"
                    >
                      <BookmarkPlus className="w-3 h-3" />
                      <span>{savingWord === nv.word ? '...' : 'Save'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sessionReport.grammarMistakes.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#718096]">Grammar Corrections</div>
              {sessionReport.grammarMistakes.map((gm, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="text-[#D65A5A]">Original: {gm.original}</div>
                    <div className="text-[#39856A] font-semibold">Better: {gm.correction}</div>
                    <div className="text-[#718096]">{gm.reason}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {gm.grammarTopicId && (
                      <button
                        type="button"
                        onClick={() => navigateToGrammarTopic(gm.grammarTopicId!)}
                        className="px-2.5 py-1 rounded-md border border-[#E4E8EE] dark:border-[#263344] font-semibold text-[#243447] dark:text-slate-200"
                      >
                        Review Grammar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        openAssistantWithPrompt(`Help me practice fixing: "${gm.original}"`)
                      }
                      className="px-2.5 py-1 rounded-md bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 font-semibold text-[#243B53] dark:text-[#E6F0ED]"
                    >
                      Practice Mistake
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sessionReport.betterExpressions && sessionReport.betterExpressions.length > 0 && (
            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-[#718096]">More Natural Expressions</div>
              <ul className="list-disc pl-5 space-y-1 text-[#243447] dark:text-slate-200">
                {sessionReport.betterExpressions.map((exp, i) => (
                  <li key={i}>{exp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
