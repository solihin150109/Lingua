import React, { useRef, useState } from 'react';
import { Headphones, Mic, Square, Volume2 } from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import type { EnglishAccent } from '../../types/lingua';
import { PageHeader, useToast } from '../ui/ToastAndPrimitives';

const LISTENING_DRILLS = [
  {
    id: 'ld-1',
    phrase: 'Could you share the updated schedule before our afternoon meeting?',
    question: 'What is the speaker asking for?',
    options: [
      'A printed restaurant menu',
      'An updated meeting schedule',
      'A flight confirmation code',
      'A hotel room key',
    ],
    correctIndex: 1,
  },
  {
    id: 'ld-2',
    phrase: 'I have been improving my English pronunciation by shadowing short podcasts.',
    question: 'How is the speaker practicing pronunciation?',
    options: [
      'By reading silent textbooks',
      'By shadowing short podcasts',
      'By memorizing phone numbers',
      'By writing weekly essays',
    ],
    correctIndex: 1,
  },
  {
    id: 'ld-3',
    phrase: 'Although the traffic was heavy, we arrived at the conference center on time.',
    question: 'Did they arrive late to the conference?',
    options: [
      'Yes, thirty minutes late',
      'No, they arrived on time',
      'They canceled the trip',
      'The conference was postponed',
    ],
    correctIndex: 1,
  },
];

const PRONUNCIATION_DRILLS = [
  {
    id: 'pd-1',
    level: 'Everyday Fluency',
    phrase: 'I would really appreciate a quick follow-up tomorrow morning.',
    ipa: '/aɪ wʊd ˈrɪəli əˈpriːʃieɪt ə kwɪk ˈfɒləʊ ʌp təˈmɒrəʊ ˈmɔːnɪŋ/',
    focus: 'Connected speech ("would really", "follow-up") and crisp /p/ and /t/ endings.',
  },
  {
    id: 'pd-2',
    level: 'Workplace & Interviews',
    phrase: 'We collaborated across three teams to improve customer satisfaction.',
    ipa: '/wi kəˈlæbəreɪtɪd əˈkrɒs θriː tiːmz tuː ɪmˈpruːv ˈkʌstəmər ˌsætɪsˈfækʃən/',
    focus: 'The /θ/ sound in "three" and multi-syllable stress in "collaborated" and "satisfaction".',
  },
  {
    id: 'pd-3',
    level: 'Natural Rhythm',
    phrase: 'Thoughtful preparation makes challenging conversations feel effortless.',
    ipa: '/ˈθɔːtfəl ˌprepəˈreɪʃən meɪks ˈtʃælɪndʒɪŋ ˌkɒnvəˈseɪʃənz fiːl ˈefətləs/',
    focus: 'Voiceless /θ/ in "thoughtful" and /tʃ/ in "challenging".',
  },
];

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
        title="Listening & Pronunciation"
        subtitle="Train comprehension, dictation accuracy, and natural English pronunciation across American and British accents."
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
  const { profile, speakText, recordQuizResult } = useLingua();
  const { showToast } = useToast();
  const [accent, setAccent] = useState<EnglishAccent>(profile?.preferredAccent || 'American');
  const [mode, setMode] = useState<'choose' | 'dictation'>('choose');
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [dictationInput, setDictationInput] = useState('');
  const [dictationFeedback, setDictationFeedback] = useState<string | null>(null);

  const drill = LISTENING_DRILLS[idx];

  const handleChoose = async (optIdx: number) => {
    setChoice(optIdx);
    const ok = optIdx === drill.correctIndex;
    await recordQuizResult('listening', 'Listen and Choose', ok ? 100 : 0, 1);
    showToast(ok ? 'Correct comprehension answer' : 'Review the transcript below', ok ? 'success' : 'info');
  };

  const handleCheckDictation = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTarget = drill.phrase.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const cleanUser = dictationInput.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const targetWords = cleanTarget.split(/\s+/);
    const userWords = cleanUser.split(/\s+/);
    const matches = targetWords.filter((w, i) => userWords[i] === w).length;
    const pct = Math.round((matches / targetWords.length) * 100);
    setDictationFeedback(
      pct >= 85
        ? `Accurate transcription (${pct}%). Target: "${drill.phrase}"`
        : `Word match: ${pct}%. Listen closely and compare with: "${drill.phrase}"`
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

      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-[#718096]">
            Track {idx + 1} / {LISTENING_DRILLS.length} · {accent} English
          </span>
          <button
            type="button"
            onClick={() => {
              setIdx((i) => (i + 1) % LISTENING_DRILLS.length);
              setChoice(null);
              setDictationFeedback(null);
              setDictationInput('');
            }}
            className="text-xs font-semibold text-[#3C8D8A] hover:underline"
          >
            Next Track
          </button>
        </div>

        <button
          type="button"
          onClick={() => speakText(drill.phrase, accent)}
          className="px-4 py-2.5 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Headphones className="w-4 h-4" />
          <span>Play Audio ({accent})</span>
        </button>

        {mode === 'choose' ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-[#243447] dark:text-white">
              {drill.question}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {drill.options.map((opt, oIdx) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChoose(oIdx)}
                  className={`p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                    choice === oIdx
                      ? oIdx === drill.correctIndex
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
                Transcript: "{drill.phrase}"
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleCheckDictation} className="space-y-3">
            <label
              htmlFor="dictation-input"
              className="block text-xs font-medium text-[#486581] dark:text-slate-300"
            >
              Type exactly what you hear
            </label>
            <textarea
              id="dictation-input"
              rows={2}
              value={dictationInput}
              onChange={(e) => setDictationInput(e.target.value)}
              placeholder="Write the sentence you heard..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold"
            >
              Check Dictation
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
    learnerContext,
    grantAudioConsent,
    recordPronunciationEvidence,
    speakText,
  } = useLingua();
  const [accent, setAccent] = useState<EnglishAccent>(profile?.preferredAccent || 'American');
  const [drillIdx, setDrillIdx] = useState(0);
  const [mode, setMode] = useState<'repeat' | 'shadowing'>('repeat');
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
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
  const currentDrill = PRONUNCIATION_DRILLS[drillIdx];

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

      <div className="bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#718096]">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {currentDrill.level} · {accent}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[#486581] dark:text-slate-300">
              {learnerContext.pronunciationSamplesCount > 0
                ? `${learnerContext.pronunciationSamplesCount} audio check${learnerContext.pronunciationSamplesCount === 1 ? '' : 's'} · Avg ${learnerContext.pronunciationAvgMatch}%`
                : 'No recorded audio yet'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setDrillIdx((i) => (i + 1) % PRONUNCIATION_DRILLS.length);
              setResult(null);
            }}
            className="font-semibold text-[#3C8D8A] hover:underline"
          >
            Next Phrase
          </button>
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
            <p className="text-xs text-[#486581] dark:text-slate-300">{result.feedback}</p>
            <p className="text-xs text-[#3C8D8A]">Tip: {result.practiceTip}</p>
          </div>
        )}
      </div>
    </div>
  );
}
