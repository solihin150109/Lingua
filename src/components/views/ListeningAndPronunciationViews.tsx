import React, { useMemo, useRef, useState } from 'react';
import {
  Headphones,
  Loader2,
  Mic,
  RotateCcw,
  Shuffle,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import {
  DICTATION_BANK_150,
  LISTENING_BANK_150,
  PRONUNCIATION_BANK_150,
  SESSION_QUESTION_COUNT,
  TOTAL_BANK_SIZE,
  getSessionSlice,
} from '../../lib/hospitalityBanks';
import type { EnglishAccent } from '../../types/lingua';
import { PageHeader, useToast } from '../ui/ToastAndPrimitives';

interface ListeningDrill {
  id: string;
  station?: string;
  phrase: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface PronunciationDrill {
  id: string;
  level: string;
  phrase: string;
  ipa: string;
  focus: string;
}

function ListeningPronunciationHeader({
  activeTab,
  accent,
  onAccentChange,
}: {
  activeTab: 'listening' | 'pronunciation';
  accent: EnglishAccent;
  onAccentChange: (acc: EnglishAccent) => void;
}) {
  const { setActiveRoute } = useLingua();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Listening & Pronunciation Waiter"
        subtitle="30 soal per sesi login (dari 150 bank soal hotel & restoran) — berganti otomatis setiap login."
        action={
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-lg p-1">
            {(['American', 'British'] as EnglishAccent[]).map((acc) => (
              <button
                key={acc}
                type="button"
                onClick={() => onAccentChange(acc)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  accent === acc
                    ? 'bg-[#243B53] text-white'
                    : 'text-[#718096] dark:text-slate-300 hover:text-[#243447]'
                }`}
              >
                {acc}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex items-center gap-1.5 border-b border-[#E4E8EE] dark:border-[#263344] pb-2">
        <button
          type="button"
          onClick={() => setActiveRoute('listening')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'listening'
              ? 'bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED]'
              : 'text-[#718096] dark:text-slate-400 hover:bg-white dark:hover:bg-[#16202C]'
          }`}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>Listening Practice</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveRoute('pronunciation')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'pronunciation'
              ? 'bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED]'
              : 'text-[#718096] dark:text-slate-400 hover:bg-white dark:hover:bg-[#16202C]'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Pronunciation &amp; Shadowing</span>
        </button>
      </div>
    </div>
  );
}

export function ListeningPracticeView() {
  const {
    profile,
    vocabulary,
    speakText,
    recordQuizResult,
    quizSessionSeed,
    rotateQuizSessionSeed,
  } = useLingua();
  const { showToast } = useToast();
  const [accent, setAccent] = useState<EnglishAccent>(profile?.preferredAccent || 'American');
  const [mode, setMode] = useState<'choose' | 'dictation'>('choose');
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [dictationInput, setDictationInput] = useState('');
  const [dictationFeedback, setDictationFeedback] = useState<string | null>(null);
  const [customDrills, setCustomDrills] = useState<ListeningDrill[] | null>(null);
  const [generatingDrills, setGeneratingDrills] = useState(false);

  const sessionChooseDrills = useMemo(
    () => getSessionSlice(LISTENING_BANK_150, `${quizSessionSeed}:listen`, SESSION_QUESTION_COUNT),
    [quizSessionSeed]
  );
  const sessionDictationDrills = useMemo(
    () => getSessionSlice(DICTATION_BANK_150, `${quizSessionSeed}:dictation`, SESSION_QUESTION_COUNT),
    [quizSessionSeed]
  );

  const activeChooseList =
    customDrills && customDrills.length > 0 ? customDrills : sessionChooseDrills;
  const activeDictationList =
    customDrills && customDrills.length > 0 ? customDrills : sessionDictationDrills;

  const currentListLength =
    mode === 'choose' ? activeChooseList.length : activeDictationList.length;
  const currentChooseDrill = activeChooseList[idx % activeChooseList.length];
  const currentDictationDrill = activeDictationList[idx % activeDictationList.length];
  const currentPhrase =
    mode === 'choose' ? currentChooseDrill.phrase : currentDictationDrill.phrase;
  const currentStation =
    mode === 'choose' ? currentChooseDrill.station : currentDictationDrill.station;

  const handleReshuffleSession = () => {
    rotateQuizSessionSeed();
    setCustomDrills(null);
    setIdx(0);
    setChoice(null);
    setDictationInput('');
    setDictationFeedback(null);
    showToast('30 soal baru disiapkan', 'success', `Diacak dari ${TOTAL_BANK_SIZE} bank soal waiter.`);
  };

  const handleGenerateCustomDrills = async () => {
    setGeneratingDrills(true);
    try {
      const words = vocabulary.slice(0, 6).map((v) => v.word);
      const res = await fetch('/api/ai/drills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words,
          level: profile?.level || 'B1-B2',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate listening drills.');
      if (Array.isArray(data.listeningDrills) && data.listeningDrills.length > 0) {
        setCustomDrills(data.listeningDrills);
        setIdx(0);
        setChoice(null);
        setDictationFeedback(null);
        setDictationInput('');
        showToast('Latihan listening dari kosakata siap!', 'success');
      }
    } catch (err) {
      showToast(
        'Gagal membuat latihan AI',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setGeneratingDrills(false);
    }
  };

  const handleChoose = async (optIdx: number) => {
    setChoice(optIdx);
    const ok = optIdx === currentChooseDrill.correctIndex;
    await recordQuizResult('listening', 'Listen and Choose', ok ? 100 : 0, 1);
    showToast(ok ? 'Benar!' : 'Cek transkrip di bawah', ok ? 'success' : 'info');
  };

  const handleCheckDictation = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTarget = currentDictationDrill.phrase.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const cleanUser = dictationInput.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const targetWords = cleanTarget.split(/\s+/);
    const userWords = cleanUser.split(/\s+/);
    const matches = targetWords.filter((w, i) => userWords[i] === w).length;
    const pct = Math.round((matches / targetWords.length) * 100);
    setDictationFeedback(
      pct >= 85
        ? `Akurat (${pct}%). Kalimat: "${currentDictationDrill.phrase}"`
        : `Kecocokan ${pct}%. Kalimat asli: "${currentDictationDrill.phrase}"`
    );
    await recordQuizResult('listening', 'Dictation Practice', pct, targetWords.length);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <ListeningPronunciationHeader
        activeTab="listening"
        accent={accent}
        onAccentChange={setAccent}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('choose');
              setChoice(null);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'choose'
                ? 'bg-[#243B53] text-white'
                : 'bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300'
            }`}
          >
            Listen and Choose
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('dictation');
              setDictationFeedback(null);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'dictation'
                ? 'bg-[#243B53] text-white'
                : 'bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300'
            }`}
          >
            Dictation
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {customDrills && (
            <button
              type="button"
              onClick={() => {
                setCustomDrills(null);
                setIdx(0);
                setChoice(null);
                setDictationFeedback(null);
              }}
              className="px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#718096] hover:text-[#243447] flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bank 30 Sesi</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleReshuffleSession}
            className="px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] text-xs font-semibold text-[#243447] dark:text-slate-200 flex items-center gap-1.5"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#3C8D8A]" />
            <span>Acak 30 Soal Baru</span>
          </button>
          <button
            type="button"
            disabled={generatingDrills}
            onClick={() => void handleGenerateCustomDrills()}
            className="px-3.5 py-2 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] text-xs font-semibold flex items-center gap-1.5"
          >
            {generatingDrills ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3C8D8A]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#3C8D8A]" />
            )}
            <span>AI dari Kosakata</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#718096]">
            <span>
              Soal {(idx % currentListLength) + 1} / {currentListLength}
              {!customDrills ? ` (Bank ${TOTAL_BANK_SIZE})` : ' (AI)'}
            </span>
            {currentStation && (
              <span className="px-2 py-0.5 rounded bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] font-sans text-[11px] font-semibold text-[#3C8D8A]">
                {currentStation}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIdx((i) => (i - 1 + currentListLength) % currentListLength);
                setChoice(null);
                setDictationFeedback(null);
                setDictationInput('');
              }}
              className="text-xs font-semibold text-[#718096] hover:text-[#243447] dark:hover:text-white"
            >
              ← Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => {
                setIdx((i) => (i + 1) % currentListLength);
                setChoice(null);
                setDictationFeedback(null);
                setDictationInput('');
              }}
              className="text-xs font-semibold text-[#3C8D8A] hover:underline"
            >
              Soal Berikutnya →
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => speakText(currentPhrase, accent)}
            className="px-4 py-2.5 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Headphones className="w-4 h-4" />
            <span>Putar Audio ({accent})</span>
          </button>
          <button
            type="button"
            onClick={() => speakText(currentPhrase, accent, undefined, 'slow')}
            className="px-3.5 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] text-xs font-semibold text-[#243447] dark:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Volume2 className="w-4 h-4 text-[#3C8D8A]" />
            <span>Pelan (0.82x)</span>
          </button>
        </div>

        {mode === 'choose' ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-[#243447] dark:text-white">
              {currentChooseDrill.question}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentChooseDrill.options.map((opt, oIdx) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChoose(oIdx)}
                  className={`p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                    choice === oIdx
                      ? oIdx === currentChooseDrill.correctIndex
                        ? 'border-[#39856A] bg-[#E6F0ED] dark:bg-[#39856A]/20 text-[#285E4B] dark:text-emerald-200'
                        : 'border-[#D65A5A] bg-[#FDF2F2] dark:bg-[#D65A5A]/20 text-[#9E3535] dark:text-rose-200'
                      : 'border-[#E4E8EE] dark:border-[#263344] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {choice !== null && (
              <p className="text-xs text-[#486581] dark:text-slate-300 bg-[#F7F8FA] dark:bg-[#1E2B3B] p-3 rounded-lg">
                Kalimat: "{currentChooseDrill.phrase}"
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleCheckDictation} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="dictation-input"
                className="block text-xs font-medium text-[#486581] dark:text-slate-300"
              >
                Ketik persis kalimat waiter yang Anda dengar
              </label>
              {'contextId' in currentDictationDrill && currentDictationDrill.contextId && (
                <span className="text-[11px] text-[#718096]">
                  Konteks: {currentDictationDrill.contextId}
                </span>
              )}
            </div>
            <textarea
              id="dictation-input"
              rows={2}
              value={dictationInput}
              onChange={(e) => setDictationInput(e.target.value)}
              placeholder="Tulis kalimat yang Anda dengar..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold"
            >
              Periksa Dikte
            </button>
            {dictationFeedback && (
              <p className="text-xs text-[#243447] dark:text-slate-200 bg-[#F7F8FA] dark:bg-[#1E2B3B] p-3 rounded-lg border border-[#E4E8EE] dark:border-[#263344]">
                {dictationFeedback}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export function PronunciationView() {
  const {
    profile,
    account,
    vocabulary,
    learnerContext,
    grantAudioConsent,
    recordPronunciationEvidence,
    speakText,
    quizSessionSeed,
    rotateQuizSessionSeed,
  } = useLingua();
  const { showToast } = useToast();
  const [accent, setAccent] = useState<EnglishAccent>(profile?.preferredAccent || 'American');
  const [drillIdx, setDrillIdx] = useState(0);
  const [mode, setMode] = useState<'repeat' | 'shadowing'>('repeat');
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingDrills, setGeneratingDrills] = useState(false);
  const [customDrills, setCustomDrills] = useState<PronunciationDrill[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    transcript: string;
    matchPercentage: number;
    matchedWords: string[];
    missedOrDifferentWords: string[];
    feedback: string;
    practiceTip: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionPronDrills = useMemo(
    () => getSessionSlice(PRONUNCIATION_BANK_150, `${quizSessionSeed}:pron`, SESSION_QUESTION_COUNT),
    [quizSessionSeed]
  );
  const activeDrills =
    customDrills && customDrills.length > 0 ? customDrills : sessionPronDrills;
  const currentDrill = activeDrills[drillIdx % activeDrills.length];

  const handleReshufflePron = () => {
    rotateQuizSessionSeed();
    setCustomDrills(null);
    setDrillIdx(0);
    setResult(null);
    showToast('30 frasa shadowing baru siap', 'success', `Diacak dari ${TOTAL_BANK_SIZE} frasa waiter.`);
  };

  const handleGenerateCustomDrills = async () => {
    setGeneratingDrills(true);
    try {
      const words = vocabulary.slice(0, 6).map((v) => v.word);
      const res = await fetch('/api/ai/drills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words,
          level: profile?.level || 'B1-B2',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate pronunciation drills.');
      if (Array.isArray(data.pronunciationDrills) && data.pronunciationDrills.length > 0) {
        setCustomDrills(data.pronunciationDrills);
        setDrillIdx(0);
        setResult(null);
        showToast('Latihan pelafalan dari kosakata siap!', 'success');
      }
    } catch (err) {
      showToast(
        'Gagal membuat latihan AI',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setGeneratingDrills(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    setResult(null);
    if (!account?.audioConsentGranted) {
      await grantAudioConsent(true);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = String(reader.result || '').split(',')[1] || '';
          if (!base64) return;
          setAnalyzing(true);
          try {
            const res = await fetch('/api/ai/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                base64Audio: base64,
                mimeType: blob.type || 'audio/webm',
                targetPhrase: currentDrill.phrase,
                accent,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Transcription failed.');
            setResult(data);
            await recordPronunciationEvidence(Number(data.matchPercentage || 0));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to analyze speech.');
          } finally {
            setAnalyzing(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError('Microphone permission is required to record your pronunciation.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <ListeningPronunciationHeader
        activeTab="pronunciation"
        accent={accent}
        onAccentChange={setAccent}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('repeat')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'repeat'
                ? 'bg-[#243B53] text-white'
                : 'bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300'
            }`}
          >
            Listen &amp; Repeat
          </button>
          <button
            type="button"
            onClick={() => setMode('shadowing')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'shadowing'
                ? 'bg-[#243B53] text-white'
                : 'bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300'
            }`}
          >
            Shadowing Practice
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {customDrills && (
            <button
              type="button"
              onClick={() => {
                setCustomDrills(null);
                setDrillIdx(0);
                setResult(null);
              }}
              className="px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#718096] hover:text-[#243447] flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bank 30 Sesi</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleReshufflePron}
            className="px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B] text-xs font-semibold text-[#243447] dark:text-slate-200 flex items-center gap-1.5"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#3C8D8A]" />
            <span>Acak 30 Frasa Baru</span>
          </button>
          <button
            type="button"
            disabled={generatingDrills}
            onClick={() => void handleGenerateCustomDrills()}
            className="px-3.5 py-2 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] text-xs font-semibold flex items-center gap-1.5"
          >
            {generatingDrills ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3C8D8A]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#3C8D8A]" />
            )}
            <span>AI dari Kosakata</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#718096]">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Frasa {(drillIdx % activeDrills.length) + 1} / {activeDrills.length}
              {!customDrills ? ` (Bank ${TOTAL_BANK_SIZE})` : ' (AI)'} · {currentDrill.level} · {accent}
            </span>
            {learnerContext.pronunciationSamplesCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-[#486581] dark:text-slate-300">
                  Avg {learnerContext.pronunciationAvgMatch}%
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setDrillIdx((i) => (i - 1 + activeDrills.length) % activeDrills.length);
                setResult(null);
              }}
              className="font-semibold text-[#718096] hover:text-[#243447] dark:hover:text-white"
            >
              ← Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => {
                setDrillIdx((i) => (i + 1) % activeDrills.length);
                setResult(null);
              }}
              className="font-semibold text-[#3C8D8A] hover:underline"
            >
              Frasa Berikutnya →
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xl font-semibold text-[#243447] dark:text-white">
            {currentDrill.phrase}
          </div>
          <div className="text-xs font-mono text-[#718096]">{currentDrill.ipa}</div>
          <p className="text-xs text-[#486581] dark:text-slate-300">
            Focus: {currentDrill.focus}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => speakText(currentDrill.phrase, accent)}
            className="px-4 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] flex items-center gap-2 transition-colors"
          >
            <Volume2 className="w-4 h-4 text-[#3C8D8A]" />
            <span>{mode === 'shadowing' ? 'Play & Shadow Along' : 'Listen First'}</span>
          </button>

          {!recording ? (
            <button
              type="button"
              disabled={analyzing}
              onClick={startRecording}
              className="px-4 py-2 rounded-lg bg-[#3C8D8A] hover:bg-[#317572] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Mic className="w-4 h-4" />
              <span>{analyzing ? 'Transcribing...' : 'Record & Compare'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="px-4 py-2 rounded-lg bg-[#D65A5A] hover:bg-[#BF4B4B] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Square className="w-4 h-4" />
              <span>Stop Recording</span>
            </button>
          )}
        </div>

        {error && <p className="text-xs text-[#D65A5A]">{error}</p>}

        {result && (
          <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#243447] dark:text-white">
                Transcript Comparison
              </span>
              <span className="font-mono tabular-nums font-semibold text-[#3C8D8A]">
                {result.matchPercentage}% word match
              </span>
            </div>
            <div>
              <div className="text-xs text-[#718096]">Recognized Speech</div>
              <div className="font-medium mt-0.5 text-[#243447] dark:text-white">
                "{result.transcript || '(no words detected)'}"
              </div>
            </div>
            {(result.matchedWords?.length > 0 || result.missedOrDifferentWords?.length > 0) && (
              <div className="space-y-1.5 text-xs">
                {result.matchedWords?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[#718096] font-medium">Tepat:</span>
                    {result.matchedWords.map((w, i) => (
                      <span
                        key={`${w}-${i}`}
                        className="px-2 py-0.5 rounded bg-[#E6F0ED] dark:bg-[#39856A]/20 text-[#285E4B] dark:text-emerald-200 font-medium"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}
                {result.missedOrDifferentWords?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[#718096] font-medium">Perlu diperjelas:</span>
                    {result.missedOrDifferentWords.map((w, i) => (
                      <span
                        key={`${w}-${i}`}
                        className="px-2 py-0.5 rounded bg-[#FDF2F2] dark:bg-[#D65A5A]/20 text-[#9E3535] dark:text-rose-200 font-medium"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-[#486581] dark:text-slate-300">{result.feedback}</p>
            <p className="text-xs text-[#3C8D8A]">Tip: {result.practiceTip}</p>
          </div>
        )}
      </div>
    </div>
  );
}
