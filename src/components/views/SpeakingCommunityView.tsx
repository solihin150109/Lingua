import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Ban,
  BookmarkPlus,
  CheckCircle2,
  Flag,
  Languages,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Plus,
  RotateCcw,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { COMMUNITY_TOPICS, SPEAKING_TOPIC_SCRIPTS } from '../../lib/curriculum';
import type {
  CommunityPeer,
  PeerLiveGuidance,
  SpeakingGuideScript,
  SpeakingSummaryReport,
  TranscriptEntry,
} from '../../types/lingua';
import { ConfirmModal, EmptyState, PageHeader, useToast } from '../ui/ToastAndPrimitives';

type GuideMode = 'Follow Script' | 'Smart Guidance' | 'Free Speaking';

function buildLocalWaiterScript(
  topicInput: string,
  words: { word: string; meaningId?: string }[] = []
): SpeakingGuideScript {
  const cleanTopic =
    topicInput === 'Otomatis dari Kosakata' ? COMMUNITY_TOPICS[0] : topicInput;
  if (words.length === 0 && SPEAKING_TOPIC_SCRIPTS[cleanTopic]) {
    return {
      roleA: 'Waiter',
      roleB: 'Guest',
      ...SPEAKING_TOPIC_SCRIPTS[cleanTopic],
    };
  }
  const w1 = words[0]?.word || 'recommend';
  const w2 = words[1]?.word || 'allergy';
  const hints =
    words.length > 0
      ? words.map((w) => ({
          word: w.word,
          meaningId: w.meaningId || 'kosakata layanan tamu',
          samplePhrase: `May I ${w.word} this option for your table?`,
        }))
      : [
          {
            word: 'recommend',
            meaningId: 'merekomendasikan',
            samplePhrase: 'I highly recommend our grilled salmon tonight.',
          },
          {
            word: 'right away',
            meaningId: 'segera',
            samplePhrase: 'I will bring your drinks right away.',
          },
        ];

  return {
    topic:
      words.length > 0
        ? `Hotel & Restaurant Service: ${words.map((w) => w.word).join(', ')}`
        : cleanTopic,
    roleA: 'Waiter',
    roleB: 'Guest',
    starterPrompts: [
      {
        speakerRole: 'A',
        line: 'Good evening, welcome to our restaurant. May I take your drink order first?',
        translationId: 'Selamat malam, selamat datang di restoran kami. Boleh saya catat pesanan minumnya dulu?',
      },
      {
        speakerRole: 'B',
        line: `Yes, please. What dish do you ${w1} tonight?`,
        translationId: `Ya, silakan. Hidangan apa yang Anda rekomendasikan (${w1}) malam ini?`,
      },
      {
        speakerRole: 'A',
        line: `I ${w1} our chef's grilled salmon. Do you have any ${w2} or dietary preferences?`,
        translationId: `Saya rekomendasikan (${w1}) salmon panggang spesial koki kami. Apakah ada pantangan atau ${w2}?`,
      },
      {
        speakerRole: 'B',
        line: `Good that you asked about ${w2}. No seafood please, just the roast chicken.`,
        translationId: `Bagus Anda menanyakan tentang ${w2}. Tanpa hidangan laut ya, ayam panggang saja.`,
      },
      {
        speakerRole: 'A',
        line: 'Understood. One roast chicken with no seafood. I will place your order right away.',
        translationId: 'Baik, dimengerti. Satu ayam panggang tanpa seafood. Saya proses pesanannya segera.',
      },
      {
        speakerRole: 'B',
        line: 'Thank you very much for your attentive service.',
        translationId: 'Terima kasih banyak atas pelayanan Anda yang ramah.',
      },
    ],
    vocabularyHints: hints,
    suggestedResponses: [
      `May I ${w1} our chef's special for tonight?`,
      `Do you have any food ${w2} we should note?`,
      'Certainly, I will bring your order right away.',
    ],
  };
}

export function SpeakingCommunityView() {
  const {
    profile,
    account,
    vocabulary,
    speakText,
    grantAudioConsent,
    blockUser,
    reportUser,
    saveSpeakingSession,
    saveWordFromAnywhere,
    navigateToGrammarTopic,
    openAssistantWithPrompt,
    setActiveRoute,
  } = useLingua();
  const { showToast } = useToast();

  const [peers, setPeers] = useState<CommunityPeer[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedCallWords, setSelectedCallWords] = useState<string[]>(() =>
    vocabulary.slice(0, 2).map((v) => v.word)
  );
  const [customCallWords, setCustomCallWords] = useState<string[]>([]);
  const [vocabQuickInput, setVocabQuickInput] = useState('');
  const [addingCallVocab, setAddingCallVocab] = useState(false);
  const [topicContextMode, setTopicContextMode] = useState<string>('Otomatis dari Kosakata');
  const [selectedTopic, setSelectedTopic] = useState<string>(
    vocabulary.length > 0 ? 'Vocabulary Focus' : COMMUNITY_TOPICS[0]
  );
  const [activeCallWords, setActiveCallWords] = useState<{ word: string; meaningId?: string }[]>([]);
  const [guideMode, setGuideMode] = useState<GuideMode>('Follow Script');
  const [showTranslation, setShowTranslation] = useState(true);
  const [myRole, setMyRole] = useState<'A' | 'B'>('A');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const [guideScript, setGuideScript] = useState<SpeakingGuideScript | null>(() =>
    vocabulary.length > 0
      ? buildLocalWaiterScript(
          COMMUNITY_TOPICS[0],
          vocabulary.slice(0, 2).map((v) => ({ word: v.word, meaningId: v.meaningId }))
        )
      : SPEAKING_TOPIC_SCRIPTS[COMMUNITY_TOPICS[0]] || null
  );
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [liveGuidance, setLiveGuidance] = useState<PeerLiveGuidance | null>(null);
  const [loadingLiveGuidance, setLoadingLiveGuidance] = useState(false);

  const [incomingInvite, setIncomingInvite] = useState<{
    fromUid: string;
    fromName: string;
    fromPhotoURL?: string;
    fromLevel: string;
    topic: string;
    targetWords?: { word: string; meaningId?: string }[];
    guideScript?: SpeakingGuideScript;
    callerRole?: 'A' | 'B';
    activeStepIndex?: number;
  } | null>(null);

  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'summary'>('idle');
  const [rtcState, setRtcState] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>(
    'connecting'
  );
  const [remoteTrackActive, setRemoteTrackActive] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [activePeer, setActivePeer] = useState<{
    uid: string;
    displayName: string;
    photoURL?: string;
  } | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [captions, setCaptions] = useState<TranscriptEntry[]>([]);
  const [captionInput, setCaptionInput] = useState('');
  const [sessionRating, setSessionRating] = useState(5);
  const [summaryReport, setSummaryReport] = useState<SpeakingSummaryReport | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [scriptWordsSignature, setScriptWordsSignature] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<CommunityPeer | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const speakerMutedRef = useRef<boolean>(false);
  const micMutedRef = useRef<boolean>(false);
  const callStateRef = useRef<'idle' | 'calling' | 'connected' | 'summary'>('idle');
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const activePeerRef = useRef<{ uid: string; displayName: string; photoURL?: string } | null>(null);
  const hasInitVocabSelectionRef = useRef<boolean>(vocabulary.length > 0);

  useEffect(() => {
    activePeerRef.current = activePeer;
  }, [activePeer]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    micMutedRef.current = micMuted;
  }, [micMuted]);

  useEffect(() => {
    if (!hasInitVocabSelectionRef.current && vocabulary.length > 0) {
      hasInitVocabSelectionRef.current = true;
      setSelectedCallWords(vocabulary.slice(0, 2).map((v) => v.word));
    }
  }, [vocabulary]);

  useEffect(() => {
    speakerMutedRef.current = speakerMuted;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = speakerMuted;
    }
  }, [speakerMuted]);

  useEffect(() => {
    if (callState !== 'connected') return;
    const id = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [callState]);

  const attachAndPlayRemoteAudio = async (stream?: MediaStream | null) => {
    const audioEl = remoteAudioRef.current;
    const targetStream = stream || remoteStreamRef.current;
    if (!audioEl || !targetStream) return;
    if (audioEl.srcObject !== targetStream) {
      audioEl.srcObject = targetStream;
    }
    audioEl.volume = 1;
    audioEl.muted = speakerMutedRef.current;
    try {
      await audioEl.play();
      setAudioBlocked(false);
    } catch {
      setAudioBlocked(true);
    }
  };

  useEffect(() => {
    if (callState === 'connected' && remoteStreamRef.current) {
      void attachAndPlayRemoteAudio(remoteStreamRef.current);
    }
  }, [callState]);

  const unlockAudioOutputGesture = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
        void remoteAudioRef.current.play().then(() => setAudioBlocked(false)).catch(() => {});
      }
    } catch {
      // Ignore autoplay warmup errors
    }
  };

  const cleanupMedia = () => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    try {
      rec?.stop();
    } catch {
      // ignore
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    remoteStreamRef.current = null;
    pendingIceRef.current = [];
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    setRemoteTrackActive(false);
    setAudioBlocked(false);
    setRtcState('connecting');
    setMicMuted(false);
  };

  const flushPendingIceCandidates = async (pc: RTCPeerConnection) => {
    while (pendingIceRef.current.length > 0) {
      const cand = pendingIceRef.current.shift();
      if (!cand) continue;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {
        // Ignore stale candidate
      }
    }
  };

  const setupWebRTC = async (targetUid: string, isInitiator: boolean) => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingIceRef.current = [];
    setRtcState('connecting');

    if (!account?.audioConsentGranted) {
      await grantAudioConsent(true);
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    localStreamRef.current = stream;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      track.enabled = true;
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      const incomingStream =
        event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      remoteStreamRef.current = incomingStream;
      setRemoteTrackActive(true);
      event.track.onunmute = () => {
        void attachAndPlayRemoteAudio(incomingStream);
      };
      void attachAndPlayRemoteAudio(incomingStream);
    };

    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if (st === 'connected' || st === 'completed') {
        setRtcState('connected');
        void attachAndPlayRemoteAudio();
      } else if (st === 'failed') {
        setRtcState('failed');
      } else if (st === 'disconnected') {
        setRtcState('disconnected');
      } else {
        setRtcState('connecting');
      }
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        setRtcState('connected');
        void attachAndPlayRemoteAudio();
      } else if (st === 'failed') {
        setRtcState('failed');
      } else if (st === 'disconnected') {
        setRtcState('disconnected');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'webrtc:ice-candidate',
            targetId: targetUid,
            candidate: event.candidate,
          })
        );
      }
    };

    const SpeechRec =
      (
        window as unknown as {
          SpeechRecognition?: new () => unknown;
          webkitSpeechRecognition?: new () => unknown;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec() as {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (ev: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void;
        onend?: () => void;
        start: () => void;
        stop: () => void;
      };
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = profile?.preferredAccent === 'British' ? 'en-GB' : 'en-US';
      rec.onresult = (ev) => {
        const last = ev.results[ev.results.length - 1];
        if (last?.isFinal && last[0]?.transcript) {
          const text = last[0].transcript.trim();
          if (text) {
            const entry: TranscriptEntry = {
              id: `cap-${Date.now()}`,
              speaker: profile?.displayName || 'You',
              text,
              timestamp: new Date().toISOString(),
            };
            setCaptions((prev) => [...prev, entry]);
            wsRef.current?.send(
              JSON.stringify({
                type: 'caption:utterance',
                targetId: targetUid,
                text,
              })
            );
          }
        }
      };
      rec.onend = () => {
        if (
          recognitionRef.current === rec &&
          callStateRef.current === 'connected' &&
          !micMutedRef.current
        ) {
          try {
            rec.start();
          } catch {
            // ignore restart timing collision
          }
        }
      };
      try {
        rec.start();
        recognitionRef.current = rec;
      } catch {
        // ignore speech rec start error
      }
    }

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      wsRef.current?.send(
        JSON.stringify({
          type: 'webrtc:offer',
          targetId: targetUid,
          offer,
        })
      );
    }
  };

  useEffect(() => {
    if (!profile?.uid) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/community`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(
        JSON.stringify({
          type: 'presence:join',
          uid: profile.uid,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          level: profile.level,
          preferredAccent: profile.preferredAccent,
          status: 'available',
          blockedIds: account?.blockedUserIds || [],
        })
      );
    };

    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'presence:list') {
        setPeers(msg.peers || []);
      } else if (msg.type === 'call:invite') {
        setIncomingInvite({
          fromUid: msg.fromUid,
          fromName: msg.fromName,
          fromPhotoURL: msg.fromPhotoURL,
          fromLevel: msg.fromLevel,
          topic: msg.topic || COMMUNITY_TOPICS[0],
          targetWords: Array.isArray(msg.targetWords) ? msg.targetWords : [],
          guideScript: msg.guideScript && Array.isArray(msg.guideScript.starterPrompts)
            ? msg.guideScript
            : undefined,
          callerRole: msg.callerRole === 'B' ? 'B' : 'A',
          activeStepIndex: typeof msg.activeStepIndex === 'number' ? msg.activeStepIndex : 0,
        });
      } else if (msg.type === 'guide:step') {
        if (typeof msg.stepIndex === 'number') {
          setActiveStepIndex(msg.stepIndex);
        }
      } else if (msg.type === 'guide:sync') {
        if (msg.guideScript && Array.isArray(msg.guideScript.starterPrompts)) {
          setGuideScript(msg.guideScript);
        }
        if (msg.topic) {
          setSelectedTopic(msg.topic);
        }
        if (msg.recipientRole === 'A' || msg.recipientRole === 'B') {
          setMyRole(msg.recipientRole);
        }
        if (typeof msg.activeStepIndex === 'number') {
          setActiveStepIndex(msg.activeStepIndex);
        }
        setIncomingInvite((prev) =>
          prev && prev.fromUid === msg.fromUid
            ? {
                ...prev,
                topic: msg.topic || prev.topic,
                guideScript: msg.guideScript || prev.guideScript,
                activeStepIndex:
                  typeof msg.activeStepIndex === 'number'
                    ? msg.activeStepIndex
                    : prev.activeStepIndex,
              }
            : prev
        );
      } else if (msg.type === 'call:accept') {
        setCallState('connected');
        setCallSeconds(0);
        try {
          await setupWebRTC(msg.fromUid, true);
        } catch {
          setError('Akses mikrofon dibutuhkan agar panggilan suara WebRTC dapat terhubung.');
        }
      } else if (msg.type === 'call:cancel') {
        setIncomingInvite((prev) => (prev?.fromUid === msg.fromUid ? null : prev));
      } else if (msg.type === 'call:reject' || msg.type === 'call:unavailable') {
        setCallState('idle');
        setActivePeer(null);
        setError(msg.reason || 'Partner declined or is unavailable.');
      } else if (msg.type === 'webrtc:offer') {
        try {
          if (!pcRef.current) {
            await setupWebRTC(msg.fromUid, false);
          }
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.offer));
            await flushPendingIceCandidates(pcRef.current);
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            ws.send(
              JSON.stringify({
                type: 'webrtc:answer',
                targetId: msg.fromUid,
                answer,
              })
            );
          }
        } catch {
          setError('Gagal menghubungkan audio WebRTC dengan partner.');
        }
      } else if (msg.type === 'webrtc:answer' && pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.answer));
          await flushPendingIceCandidates(pcRef.current);
        } catch {
          setError('Gagal menyinkronkan audio WebRTC.');
        }
      } else if (msg.type === 'webrtc:ice-candidate' && msg.candidate) {
        if (pcRef.current && pcRef.current.remoteDescription) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } catch {
            // Ignore malformed ICE candidate
          }
        } else {
          pendingIceRef.current.push(msg.candidate);
        }
      } else if (msg.type === 'caption:utterance') {
        setCaptions((prev) => [
          ...prev,
          {
            id: `peer-${Date.now()}`,
            speaker: msg.fromName || 'Partner',
            text: msg.text,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else if (msg.type === 'call:end') {
        cleanupMedia();
        setCallState('summary');
      }
    };

    ws.onclose = () => setWsConnected(false);

    return () => {
      cleanupMedia();
      ws.close();
    };
  }, [profile?.uid]);

  const allSelectableWords = Array.from(
    new Map(
      [
        ...vocabulary.map((v) => [v.word.toLowerCase(), { word: v.word, meaningId: v.meaningId }] as const),
        ...customCallWords.map((w) => [w.toLowerCase(), { word: w, meaningId: '' }] as const),
      ]
    ).values()
  );

  const buildTargetWordsPayload = (wordsList = selectedCallWords) =>
    wordsList
      .map((w) => {
        const clean = w.trim();
        const found = vocabulary.find((v) => v.word.toLowerCase() === clean.toLowerCase());
        return { word: found?.word || clean, meaningId: found?.meaningId || '' };
      })
      .filter((item) => item.word.length > 0);

  const toggleCallWord = (word: string) => {
    setSelectedCallWords((prev) =>
      prev.some((w) => w.toLowerCase() === word.toLowerCase())
        ? prev.filter((w) => w.toLowerCase() !== word.toLowerCase())
        : prev.length < 5
        ? [...prev, word]
        : prev
    );
  };

  const syncScriptWithPartner = (
    script: SpeakingGuideScript,
    topic: string,
    stepIdx = 0
  ) => {
    const peer = activePeerRef.current;
    if (!peer || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'guide:sync',
        targetId: peer.uid,
        topic,
        guideScript: script,
        activeStepIndex: stepIdx,
      })
    );
  };

  const loadTopicScript = async (
    topicInput: string,
    forceAi = false,
    overrideWords?: { word: string; meaningId?: string }[]
  ) => {
    const wordsPayload = overrideWords ?? buildTargetWordsPayload();
    const hasTargetWords = wordsPayload.length > 0;
    const effectiveTopicArg =
      topicInput === 'Otomatis dari Kosakata' ? COMMUNITY_TOPICS[0] : topicInput;
    const builtIn = !hasTargetWords ? SPEAKING_TOPIC_SCRIPTS[effectiveTopicArg] : undefined;

    if (!hasTargetWords && !forceAi && builtIn) {
      const normalized = { roleA: 'Waiter', roleB: 'Guest', ...builtIn };
      setGuideScript(normalized);
      setActiveStepIndex(0);
      setScriptWordsSignature('');
      setGuideError(null);
      setError(null);
      syncScriptWithPartner(normalized, normalized.topic, 0);
      return;
    }

    setLoadingGuide(true);
    setGuideError(null);
    setError(null);
    try {
      const res = await fetch('/api/ai/speaking-guide/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: effectiveTopicArg,
          level: profile?.level || 'B1-B2',
          targetWords: wordsPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate vocabulary conversation theme.');
      setGuideScript(data);
      setActiveStepIndex(0);
      setScriptWordsSignature(
        wordsPayload
          .map((w) => w.word.toLowerCase())
          .sort()
          .join(',')
      );
      if (data?.topic) {
        setSelectedTopic(data.topic);
      }
      syncScriptWithPartner(data, data?.topic || effectiveTopicArg, 0);
    } catch (err) {
      const fallback = buildLocalWaiterScript(effectiveTopicArg, wordsPayload);
      setGuideScript(fallback);
      setSelectedTopic(fallback.topic);
      setActiveStepIndex(0);
      syncScriptWithPartner(fallback, fallback.topic, 0);
      showToast(
        'Script waiter siap digunakan',
        'info',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setLoadingGuide(false);
    }
  };

  const handleAddCallVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = vocabQuickInput.trim();
    if (!clean || addingCallVocab) return;
    setAddingCallVocab(true);
    setGuideError(null);

    let addedWord = clean;
    let addedMeaning = '';
    try {
      const { item } = await saveWordFromAnywhere(clean);
      addedWord = item.word;
      addedMeaning = item.meaningId || '';
      showToast(`Kosakata "${addedWord}" ditambahkan`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setCustomCallWords((prev) =>
        prev.some((w) => w.toLowerCase() === clean.toLowerCase()) ? prev : [clean, ...prev]
      );
      showToast(
        `Kata "${clean}" dipakai untuk tema call`,
        'info',
        msg ? `Simpan detail vocabulary tertunda: ${msg}` : undefined
      );
    }

    const nextWords = selectedCallWords.some((w) => w.toLowerCase() === addedWord.toLowerCase())
      ? selectedCallWords
      : [...selectedCallWords.slice(-4), addedWord];
    setSelectedCallWords(nextWords);
    setVocabQuickInput('');
    setAddingCallVocab(false);

    const nextPayload = nextWords.map((w) => {
      if (w.toLowerCase() === addedWord.toLowerCase()) {
        return { word: addedWord, meaningId: addedMeaning };
      }
      const found = vocabulary.find((v) => v.word.toLowerCase() === w.toLowerCase());
      return { word: found?.word || w, meaningId: found?.meaningId || '' };
    });
    await loadTopicScript(topicContextMode, true, nextPayload);
  };

  const fetchVisualGuidance = async (linesSnapshot?: TranscriptEntry[]) => {
    if (loadingLiveGuidance) return;
    setLoadingLiveGuidance(true);
    try {
      const source = linesSnapshot || captions;
      const targetWordList = (
        activeCallWords.length > 0 ? activeCallWords : buildTargetWordsPayload()
      ).map((w) => w.word);
      const res = await fetch('/api/ai/speaking-guide/live-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: guideScript?.topic || selectedTopic,
          level: profile?.level || 'B1-B2',
          recentLines: source.slice(-8).map((c) => `${c.speaker}: ${c.text}`),
          targetWords: targetWordList,
        }),
      });
      const data = await res.json();
      if (res.ok) setLiveGuidance(data);
    } catch {
      // keep silent during live peer call
    } finally {
      setLoadingLiveGuidance(false);
    }
  };

  const handleInvitePeer = async (peer: CommunityPeer) => {
    unlockAudioOutputGesture();
    setError(null);
    const wordsPayload = buildTargetWordsPayload();
    const currentSignature = wordsPayload
      .map((w) => w.word.toLowerCase())
      .sort()
      .join(',');
    const scriptMatchesWords =
      Boolean(guideScript) &&
      (wordsPayload.length === 0 || scriptWordsSignature === currentSignature);
    const effectiveTopic = scriptMatchesWords && guideScript?.topic
      ? guideScript.topic
      : wordsPayload.length > 0
      ? `Waiter: ${wordsPayload.map((w) => w.word).join(', ')}`
      : topicContextMode === 'Otomatis dari Kosakata'
      ? COMMUNITY_TOPICS[0]
      : topicContextMode;

    const scriptToShare: SpeakingGuideScript =
      scriptMatchesWords && guideScript
        ? guideScript
        : buildLocalWaiterScript(effectiveTopic, wordsPayload);

    setGuideScript(scriptToShare);
    setMyRole('A');
    setActiveStepIndex(0);
    setActiveCallWords(wordsPayload);
    setSelectedTopic(scriptToShare.topic || effectiveTopic);
    const nextPeer = { uid: peer.uid, displayName: peer.displayName, photoURL: peer.photoURL };
    activePeerRef.current = nextPeer;
    setActivePeer(nextPeer);
    setCallState('calling');
    setCaptions([]);
    setSummaryReport(null);
    setLiveGuidance(null);
    wsRef.current?.send(
      JSON.stringify({
        type: 'call:invite',
        targetId: peer.uid,
        topic: scriptToShare.topic || effectiveTopic,
        targetWords: wordsPayload,
        guideScript: scriptToShare,
        callerRole: 'A',
        activeStepIndex: 0,
      })
    );
    if (!scriptMatchesWords && wordsPayload.length > 0) {
      void loadTopicScript(topicContextMode, true, wordsPayload);
    }
  };

  const handleAcceptInvite = async () => {
    if (!incomingInvite) return;
    unlockAudioOutputGesture();
    const inv = incomingInvite;
    const invWords = inv.targetWords || [];
    const callerRole = inv.callerRole === 'B' ? 'B' : 'A';
    const assignedRole = callerRole === 'A' ? 'B' : 'A';
    const sharedScript = inv.guideScript || buildLocalWaiterScript(inv.topic, invWords);

    setIncomingInvite(null);
    setError(null);
    setMyRole(assignedRole);
    setActiveStepIndex(inv.activeStepIndex ?? 0);
    setGuideScript(sharedScript);
    setSelectedTopic(sharedScript.topic || inv.topic);
    setActiveCallWords(invWords);
    const nextPeer = { uid: inv.fromUid, displayName: inv.fromName, photoURL: inv.fromPhotoURL };
    activePeerRef.current = nextPeer;
    setActivePeer(nextPeer);
    setCallState('connected');
    setCallSeconds(0);
    setCaptions([]);
    setLiveGuidance(null);
    wsRef.current?.send(
      JSON.stringify({
        type: 'call:accept',
        targetId: inv.fromUid,
      })
    );
    wsRef.current?.send(JSON.stringify({ type: 'presence:status', status: 'in-call' }));
    if (!inv.guideScript && invWords.length > 0) {
      void loadTopicScript(inv.topic, true, invWords);
    }
  };

  const handleRejectInvite = () => {
    if (!incomingInvite) return;
    wsRef.current?.send(
      JSON.stringify({
        type: 'call:reject',
        targetId: incomingInvite.fromUid,
        reason: 'Learner is busy right now.',
      })
    );
    setIncomingInvite(null);
  };

  const handleSwapRole = () => {
    const previousRole = myRole;
    const nextRole = previousRole === 'A' ? 'B' : 'A';
    setMyRole(nextRole);
    if (activePeerRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'guide:sync',
          targetId: activePeerRef.current.uid,
          recipientRole: previousRole,
        })
      );
    }
  };

  const handleSelectScriptStep = async (stepIndex: number, line: string) => {
    const nextStep = stepIndex + 1;
    setActiveStepIndex(nextStep);
    if (activePeerRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'guide:step',
          targetId: activePeerRef.current.uid,
          stepIndex: nextStep,
        })
      );
    }
    await pushCaptionLine(line);
  };

  const handleResetScriptSteps = () => {
    setActiveStepIndex(0);
    if (activePeerRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'guide:step',
          targetId: activePeerRef.current.uid,
          stepIndex: 0,
        })
      );
    }
  };

  const pushCaptionLine = async (line: string) => {
    const clean = line.trim();
    if (!clean) return;
    const entry: TranscriptEntry = {
      id: `me-${Date.now()}`,
      speaker: profile?.displayName || 'You',
      text: clean,
      timestamp: new Date().toISOString(),
    };
    const next = [...captions, entry];
    setCaptions(next);
    if (activePeerRef.current) {
      wsRef.current?.send(
        JSON.stringify({
          type: 'caption:utterance',
          targetId: activePeerRef.current.uid,
          text: clean,
        })
      );
    }
    if (guideMode !== 'Free Speaking') {
      fetchVisualGuidance(next);
    }
  };

  const handleSendCaptionLine = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = captionInput.trim();
    if (!clean) return;
    setCaptionInput('');
    await pushCaptionLine(clean);
  };

  const handleEndCall = async () => {
    if (activePeer) {
      wsRef.current?.send(JSON.stringify({ type: 'call:end', targetId: activePeer.uid }));
    }
    wsRef.current?.send(JSON.stringify({ type: 'presence:status', status: 'available' }));
    cleanupMedia();
    setCallState('summary');
    setLoadingSummary(true);

    try {
      const res = await fetch('/api/ai/speaking-guide/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          durationSeconds: callSeconds,
          transcript: captions.map((c) => ({ speaker: c.speaker, text: c.text })),
        }),
      });
      const data = await res.json();
      if (res.ok) setSummaryReport(data);
    } catch {
      // summary optional
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSaveSummaryAndClose = async () => {
    await saveSpeakingSession({
      sessionType: 'community',
      topic: selectedTopic,
      peerId: activePeer?.uid,
      durationSeconds: callSeconds,
      rating: sessionRating,
      summaryText: summaryReport?.summary || summaryReport?.speakingPerformance,
      transcript: captions,
    });
    setCallState('idle');
    setActivePeer(null);
    showToast('Call session saved', 'success');
  };

  const toggleMic = () => {
    const nextMuted = !micMuted;
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
    setMicMuted(nextMuted);
  };

  const toggleSpeaker = () => {
    const nextMuted = !speakerMuted;
    speakerMutedRef.current = nextMuted;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = nextMuted;
      if (!nextMuted) {
        void attachAndPlayRemoteAudio();
      }
    }
    setSpeakerMuted(nextMuted);
  };

  const formattedTime = `${String(Math.floor(callSeconds / 60)).padStart(2, '0')}:${String(
    callSeconds % 60
  ).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" />

      <PageHeader
        title="Speaking Partner (Script Waiter)"
        subtitle="Latihan dialog Waiter & Tamu berdua dengan script yang tersinkron real-time."
        action={
          <div className="text-xs font-medium text-[#718096] bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-lg px-3 py-1.5">
            {wsConnected ? 'Online' : 'Connecting...'} ·{' '}
            <span className="font-mono tabular-nums font-semibold text-[#243447] dark:text-white">
              {peers.length}
            </span>{' '}
            partner
          </div>
        }
      />

      {/* Incoming Call Modal Banner */}
      {incomingInvite && (
        <div className="p-4 rounded-xl bg-[#E6F0ED]/70 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PhoneIncoming className="w-5 h-5 text-[#3C8D8A]" />
            <div>
              <div className="text-sm font-semibold text-[#243447] dark:text-white">
                Panggilan Masuk dari {incomingInvite.fromName}
              </div>
              <div className="text-xs text-[#486581] dark:text-slate-300 space-y-1">
                <div>
                  Tema: {incomingInvite.topic} · Peran Anda:{' '}
                  <span className="font-semibold text-[#243B53] dark:text-white">
                    {incomingInvite.callerRole === 'B' ? 'Waiter (A)' : 'Guest / Tamu (B)'}
                  </span>
                </div>
                {incomingInvite.targetWords && incomingInvite.targetWords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {incomingInvite.targetWords.map((tw) => (
                      <span
                        key={tw.word}
                        className="px-2 py-0.5 rounded bg-white/80 dark:bg-[#16202C] border border-[#C3DED6] dark:border-[#3C8D8A]/40 font-semibold text-[#243B53] dark:text-[#E6F0ED]"
                      >
                        {tw.word}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRejectInvite}
              className="px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] text-xs font-semibold"
            >
              Tolak
            </button>
            <button
              type="button"
              onClick={handleAcceptInvite}
              className="px-4 py-2 rounded-lg bg-[#39856A] hover:bg-[#2F6F58] text-white text-xs font-semibold"
            >
              Terima Call
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-[#FDF2F2] dark:bg-[#D65A5A]/15 border border-[#F5C6C6] text-xs text-[#9E3535] dark:text-rose-200">
          {error}
        </div>
      )}

      {callState === 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Vocabulary-Driven AI Topic & Script Setup */}
          <div className="lg:col-span-5 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                1. Script Percakapan Waiter
              </h2>
              <p className="text-xs text-[#718096]">
                Pilih kata waiter atau situasi restoran/hotel untuk dibagikan ke partner saat call.
              </p>
            </div>

            <form onSubmit={handleAddCallVocab} className="flex gap-2">
              <input
                type="text"
                value={vocabQuickInput}
                onChange={(e) => setVocabQuickInput(e.target.value)}
                placeholder="Tambah kata waiter (cth: recommend, allergy, bill)..."
                className="flex-1 px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-xs focus:outline-none focus:ring-2 focus:ring-[#3C8D8A]/40 focus:border-[#3C8D8A]"
              />
              <button
                type="submit"
                disabled={addingCallVocab || !vocabQuickInput.trim()}
                className="px-3 py-2 rounded-lg bg-[#3C8D8A] hover:bg-[#317572] disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
              >
                {addingCallVocab ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Tambah</span>
              </button>
            </form>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#718096]">
                <span>Kosakata Dipilih ({selectedCallWords.length}/5)</span>
                {selectedCallWords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCallWords([])}
                    className="hover:text-[#243447] dark:hover:text-white"
                  >
                    Kosongkan
                  </button>
                )}
              </div>
              {allSelectableWords.length === 0 ? (
                <div className="text-xs text-[#718096] p-2.5 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B]">
                  Belum ada kosakata tersimpan. Ketik kata di kolom atas untuk langsung membuat tema percakapan AI.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {allSelectableWords.slice(0, 28).map((v) => {
                    const picked = selectedCallWords.some(
                      (w) => w.toLowerCase() === v.word.toLowerCase()
                    );
                    return (
                      <button
                        key={v.word}
                        type="button"
                        title={v.meaningId || v.word}
                        onClick={() => toggleCallWord(v.word)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors text-left ${
                          picked
                            ? 'border-[#3C8D8A] bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] font-semibold'
                            : 'border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#1E2B3B]'
                        }`}
                      >
                        <span>{v.word}</span>
                        {v.meaningId && (
                          <span className="ml-1 text-[10px] opacity-75">· {v.meaningId}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#E4E8EE] dark:border-[#263344]">
              <div className="text-[11px] font-semibold text-[#718096]">
                Situasi Pendukung (Opsional)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Otomatis dari Kosakata', ...COMMUNITY_TOPICS].map((ctxTopic) => (
                  <button
                    key={ctxTopic}
                    type="button"
                    onClick={() => {
                      setTopicContextMode(ctxTopic);
                      if (selectedCallWords.length === 0 && SPEAKING_TOPIC_SCRIPTS[ctxTopic]) {
                        setSelectedTopic(ctxTopic);
                        setGuideScript(SPEAKING_TOPIC_SCRIPTS[ctxTopic]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                      topicContextMode === ctxTopic
                        ? 'border-[#243B53] bg-[#243B53] text-white'
                        : 'border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA]'
                    }`}
                  >
                    {ctxTopic}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={loadingGuide || (selectedCallWords.length === 0 && topicContextMode === 'Otomatis dari Kosakata')}
              onClick={() => void loadTopicScript(topicContextMode, true)}
              className="w-full py-2.5 px-4 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {loadingGuide ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#7FD4D0]" />
              )}
              <span>
                {loadingGuide
                  ? 'AI Sedang Membuat Tema & Script...'
                  : 'Generate Tema & Script AI dari Kosakata'}
              </span>
            </button>

            {guideError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-[#FDF2F2] dark:bg-[#D65A5A]/15 border border-[#F5C6C6] flex flex-wrap items-center justify-between gap-2 text-xs text-[#9E3535] dark:text-rose-200"
              >
                <span>{guideError}</span>
                <button
                  type="button"
                  onClick={() => void loadTopicScript(topicContextMode, true)}
                  className="px-2.5 py-1 rounded bg-[#243B53] text-white font-semibold shrink-0"
                >
                  Coba Generate Ulang
                </button>
              </div>
            )}

            {guideScript && (
              <div className="p-3.5 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#3C8D8A]">
                      Preview Script ({guideScript.roleA || 'Waiter'} &amp; {guideScript.roleB || 'Guest'})
                    </div>
                    <div className="font-semibold text-sm text-[#243447] dark:text-white">
                      {guideScript.topic}
                    </div>
                  </div>
                </div>
                {guideScript.vocabularyHints?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {guideScript.vocabularyHints.map((vh) => (
                      <span
                        key={vh.word}
                        className="px-2 py-0.5 rounded bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] text-[11px] text-[#243447] dark:text-slate-200"
                      >
                        <span className="font-semibold text-[#3C8D8A]">{vh.word}</span>
                        {vh.meaningId ? ` (${vh.meaningId})` : ''}
                      </span>
                    ))}
                  </div>
                )}
                <div className="space-y-2 pt-1 max-h-64 overflow-y-auto pr-1">
                  {guideScript.starterPrompts.map((sp, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344]"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-[#243447] dark:text-slate-200">
                          <span className="font-semibold text-[#3C8D8A]">
                            {i + 1}. {sp.speakerRole === 'A' ? guideScript.roleA || 'Waiter' : guideScript.roleB || 'Guest'}:
                          </span>{' '}
                          {sp.line}
                        </div>
                        <div className="text-[#718096]">{sp.translationId}</div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Dengar baris ${i + 1}`}
                        onClick={() => speakText(sp.line)}
                        className="p-1.5 rounded-md text-[#3C8D8A] hover:bg-[#E6F0ED] dark:hover:bg-[#3C8D8A]/20 shrink-0"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Compact Partner Directory */}
          <div className="lg:col-span-7 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                2. Online Speaking Partners
              </h2>
              <span className="text-xs text-[#718096]">Real-time WebRTC directory</span>
            </div>

            {peers.length === 0 ? (
              <EmptyState
                icon={<Users className="w-5 h-5" />}
                title="No other learners online right now"
                description="Speaking Partner uses real WebRTC peer connections with live signaling. Open a second browser session or invite a study partner to sign in to start a call."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {peers.map((peer) => (
                  <div
                    key={peer.uid}
                    className="p-4 rounded-xl border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA]/50 dark:bg-[#1E2B3B]/40 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#243B53] text-white font-semibold text-xs flex items-center justify-center shrink-0">
                          {peer.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#243447] dark:text-white truncate">
                            {peer.displayName}
                          </div>
                          <div className="text-[11px] text-[#718096]">
                            {peer.level} · {peer.preferredAccent}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-medium ${
                          peer.status === 'available' ? 'text-[#39856A]' : 'text-[#A0AEC0]'
                        }`}
                      >
                        {peer.status === 'available' ? 'Online' : 'In Call'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E4E8EE] dark:border-[#263344]">
                      <button
                        type="button"
                        disabled={peer.status !== 'available'}
                        onClick={() => handleInvitePeer(peer)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-[#3C8D8A] hover:bg-[#317572] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Invite</span>
                      </button>
                      <button
                        type="button"
                        title="Block user"
                        aria-label={`Block ${peer.displayName}`}
                        onClick={() => setBlockTarget(peer)}
                        className="p-1.5 rounded-lg text-[#A0AEC0] hover:text-[#D65A5A]"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Report user"
                        aria-label={`Report ${peer.displayName}`}
                        onClick={async () => {
                          await reportUser(peer.uid, 'Community safety report');
                          showToast('User reported and blocked', 'info');
                        }}
                        className="p-1.5 rounded-lg text-[#A0AEC0] hover:text-[#D69E36]"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {callState === 'calling' && (
        <div className="max-w-md mx-auto bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#243B53] text-white font-semibold text-lg flex items-center justify-center mx-auto">
            {(activePeer?.displayName || 'P').charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1.5">
            <div className="text-base font-semibold text-[#243447] dark:text-white">
              Calling {activePeer?.displayName}...
            </div>
            <p className="text-xs text-[#718096]">Topic: {selectedTopic}</p>
            {activeCallWords.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 pt-1">
                {activeCallWords.map((w) => (
                  <span
                    key={w.word}
                    className="px-2 py-0.5 rounded bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[11px] font-semibold text-[#243B53] dark:text-[#E6F0ED]"
                  >
                    {w.word}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (activePeer) {
                wsRef.current?.send(
                  JSON.stringify({ type: 'call:cancel', targetId: activePeer.uid })
                );
              }
              setCallState('idle');
              setActivePeer(null);
            }}
            className="px-4 py-2 rounded-lg bg-[#D65A5A] hover:bg-[#BF4B4B] text-white text-xs font-semibold"
          >
            Cancel Invitation
          </button>
        </div>
      )}

      {/* Focused 2-User Voice Call Room */}
      {callState === 'connected' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E8EE] dark:border-[#263344]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-[#243B53] text-white font-semibold text-sm flex items-center justify-center">
                    {(profile?.displayName || 'Y').charAt(0)}
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#3C8D8A] text-white font-semibold text-sm flex items-center justify-center">
                    {(activePeer?.displayName || 'P').charAt(0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#243447] dark:text-white">
                    {profile?.displayName} &amp; {activePeer?.displayName}
                  </div>
                  <div className="text-xs text-[#39856A]">
                    {rtcState === 'connected'
                      ? remoteTrackActive
                        ? 'Audio Terhubung (WebRTC Aktif)'
                        : 'WebRTC Terhubung — Menunggu suara partner'
                      : rtcState === 'failed'
                      ? 'Koneksi WebRTC gagal'
                      : 'Menghubungkan audio WebRTC...'}{' '}
                    · {selectedTopic}
                  </div>
                </div>
              </div>
              <div className="font-mono tabular-nums text-sm font-semibold text-[#243447] dark:text-white">
                {formattedTime}
              </div>
            </div>

            {audioBlocked && (
              <div className="p-3 rounded-lg bg-[#FDF6E7] dark:bg-[#D69E36]/15 border border-[#EFE0BC] dark:border-[#D69E36]/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#7A5615] dark:text-amber-200 font-medium">
                  Browser menahan pemutaran suara penelpon otomatis. Klik tombol ini untuk menyalakan speaker:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    unlockAudioOutputGesture();
                    void attachAndPlayRemoteAudio();
                  }}
                  className="px-3 py-1.5 rounded-md bg-[#243B53] text-white font-semibold shrink-0"
                >
                  Aktifkan Suara Penelpon
                </button>
              </div>
            )}

            <div className="text-[11px] text-[#718096] bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] rounded-lg px-3 py-2">
              Ikuti script di panel kanan agar percakapan berdua tertata langkah demi langkah. Klik baris script untuk mengirim ke catatan percakapan.
            </div>

            {/* Live Caption Panel */}
            <div className="h-60 overflow-y-auto p-3.5 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-2 text-sm">
              {captions.length === 0 ? (
                <p className="text-xs text-[#A0AEC0] text-center py-8">
                  Live speech captions and typed phrases appear here...
                </p>
              ) : (
                captions.map((c) => (
                  <div key={c.id} className="text-xs">
                    <span className="font-semibold text-[#3C8D8A]">{c.speaker}: </span>
                    <span className="text-[#243447] dark:text-slate-100">{c.text}</span>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendCaptionLine} className="flex gap-2">
              <input
                type="text"
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                placeholder="Type a caption note or phrase..."
                className="flex-1 px-3 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B] text-xs"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold"
              >
                Send
              </button>
            </form>

            {/* Clear Mic & End Call Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={toggleMic}
                aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
                className={`px-4 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  micMuted
                    ? 'border-[#F5C6C6] bg-[#FDF2F2] text-[#9E3535]'
                    : 'border-[#E4E8EE] dark:border-[#263344] text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA]'
                }`}
              >
                {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#3C8D8A]" />}
                <span>{micMuted ? 'Mic Muted' : 'Mic Active'}</span>
              </button>
              <button
                type="button"
                onClick={toggleSpeaker}
                aria-label={speakerMuted ? 'Unmute speaker' : 'Mute speaker'}
                className="px-4 py-2.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold text-[#243447] dark:text-slate-200 hover:bg-[#F7F8FA] flex items-center gap-1.5 transition-colors"
              >
                {speakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{speakerMuted ? 'Speaker Off' : 'Speaker On'}</span>
              </button>
              <button
                type="button"
                onClick={handleEndCall}
                className="px-5 py-2.5 rounded-lg bg-[#D65A5A] hover:bg-[#BF4B4B] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            </div>
          </div>

          {/* Visual-Only AI Speaking Guidance Side Panel */}
          <div className="lg:col-span-5 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[#243447] dark:text-white">
                AI Speaking Guidance
              </h2>
              <button
                type="button"
                onClick={() => setShowTranslation((t) => !t)}
                className="text-xs font-medium text-[#3C8D8A] flex items-center gap-1"
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{showTranslation ? 'Hide ID' : 'Show ID'}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(['Follow Script', 'Smart Guidance', 'Free Speaking'] as GuideMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGuideMode(m)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    guideMode === m
                      ? 'bg-[#243B53] text-white'
                      : 'bg-[#F7F8FA] dark:bg-[#1E2B3B] text-[#718096] dark:text-slate-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {guideMode !== 'Free Speaking' && (
              <>
                {guideMode === 'Follow Script' && (
                  <div className="space-y-3">
                    {(activeCallWords.length > 0 || selectedCallWords.length > 0) && (
                      <div className="p-2.5 rounded-lg bg-[#E6F0ED]/60 dark:bg-[#3C8D8A]/15 border border-[#C3DED6] dark:border-[#3C8D8A]/30 space-y-1">
                        <div className="text-[11px] font-semibold text-[#243B53] dark:text-[#E6F0ED]">
                          Target Kosakata Percakapan:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(activeCallWords.length > 0
                            ? activeCallWords
                            : buildTargetWordsPayload()
                          ).map((w) => (
                            <span
                              key={w.word}
                              className="px-2 py-0.5 rounded bg-white dark:bg-[#16202C] text-[11px] font-semibold text-[#3C8D8A]"
                            >
                              {w.word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-xs">
                      <div>
                        <div className="font-semibold text-[#243447] dark:text-white">
                          Peran Anda:{' '}
                          <span className="text-[#3C8D8A]">
                            {myRole === 'A'
                              ? `${guideScript?.roleA || 'Waiter'} (A)`
                              : `${guideScript?.roleB || 'Guest'} (B)`}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#718096]">
                          Langkah {Math.min(activeStepIndex + 1, guideScript?.starterPrompts?.length || 6)} /{' '}
                          {guideScript?.starterPrompts?.length || 6} ·{' '}
                          {activeStepIndex >= (guideScript?.starterPrompts?.length || 6)
                            ? 'Dialog selesai!'
                            : (guideScript?.starterPrompts?.[activeStepIndex]?.speakerRole || 'A') === myRole
                            ? 'Giliran Anda berbicara'
                            : 'Giliran partner berbicara'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSwapRole}
                          className="px-2.5 py-1 rounded-md border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] text-[11px] font-semibold text-[#243B53] dark:text-slate-200 flex items-center gap-1"
                        >
                          <ArrowLeftRight className="w-3 h-3 text-[#3C8D8A]" />
                          <span>Tukar Peran</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleResetScriptSteps}
                          title="Ulangi script dari langkah 1"
                          className="px-2 py-1 rounded-md border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] text-[11px] font-semibold text-[#718096]"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#243447] dark:text-white truncate">
                        {guideScript?.topic || selectedTopic}
                      </span>
                      <button
                        type="button"
                        disabled={loadingGuide}
                        onClick={() =>
                          void loadTopicScript(
                            topicContextMode,
                            true,
                            activeCallWords.length > 0 ? activeCallWords : undefined
                          )
                        }
                        className="text-xs font-semibold text-[#3C8D8A] hover:underline shrink-0"
                      >
                        {loadingGuide ? 'Memuat...' : 'Regenerasi AI'}
                      </button>
                    </div>
                    {guideScript?.starterPrompts?.length ? (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {guideScript.starterPrompts.map((sp, i) => {
                          const isCurrent = i === activeStepIndex;
                          const isDone = i < activeStepIndex;
                          const isMyTurn = sp.speakerRole === myRole;
                          const roleLabel =
                            sp.speakerRole === 'A'
                              ? `${guideScript.roleA || 'Waiter'} (A)`
                              : `${guideScript.roleB || 'Guest'} (B)`;
                          return (
                            <div
                              key={i}
                              className={`p-2.5 rounded-lg border transition-colors space-y-1 text-xs ${
                                isCurrent
                                  ? 'border-[#3C8D8A] bg-[#E6F0ED]/70 dark:bg-[#3C8D8A]/20'
                                  : isDone
                                  ? 'border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA]/50 dark:bg-[#1E2B3B]/40 opacity-70'
                                  : 'border-[#E4E8EE] dark:border-[#263344] bg-[#F7F8FA] dark:bg-[#1E2B3B]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 font-semibold text-[#3C8D8A]">
                                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-[#39856A]" />}
                                  <span>
                                    {i + 1}. {roleLabel}
                                  </span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#243B53] text-white text-[10px]">
                                      {isMyTurn ? 'Giliran Anda' : 'Giliran Partner'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    aria-label={`Putar pengucapan langkah ${i + 1}`}
                                    onClick={() => speakText(sp.line)}
                                    className="p-1 rounded text-[#3C8D8A] hover:bg-white dark:hover:bg-[#16202C]"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleSelectScriptStep(i, sp.line)}
                                    className="px-2 py-0.5 rounded bg-[#243B53] hover:bg-[#1B2D40] text-white text-[11px] font-semibold"
                                  >
                                    Ucap &amp; Lanjut
                                  </button>
                                </div>
                              </div>
                              <div className="text-[#243447] dark:text-slate-100 font-medium">
                                {sp.line}
                              </div>
                              {showTranslation && (
                                <div className="text-[#718096]">{sp.translationId}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={loadingGuide}
                        onClick={() =>
                          void loadTopicScript(
                            topicContextMode,
                            true,
                            activeCallWords.length > 0 ? activeCallWords : undefined
                          )
                        }
                        className="w-full py-2 px-3 rounded-lg bg-[#243B53] text-white text-xs font-semibold"
                      >
                        {loadingGuide ? 'Menyiapkan Script...' : 'Muat Script Percakapan'}
                      </button>
                    )}
                  </div>
                )}

                {guideMode === 'Smart Guidance' && (
                  <button
                    type="button"
                    disabled={loadingLiveGuidance}
                    onClick={() => fetchVisualGuidance()}
                    className="w-full py-2 px-3 rounded-lg bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    {loadingLiveGuidance ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3C8D8A]" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[#3C8D8A]" />
                    )}
                    <span>{loadingLiveGuidance ? 'Updating Tips...' : 'Refresh Visual Guidance'}</span>
                  </button>
                )}

                {liveGuidance?.grammarNote && (
                  <div className="p-3 rounded-xl bg-[#FDF6E7] dark:bg-[#D69E36]/15 border border-[#EFE0BC] dark:border-[#D69E36]/30 text-xs space-y-1">
                    <div className="font-semibold text-[#7A5615] dark:text-amber-200">
                      Visual Grammar Note
                    </div>
                    <div className="text-[#9E3535] dark:text-rose-300">
                      Original: {liveGuidance.grammarNote.original}
                    </div>
                    <div className="text-[#285E4B] dark:text-emerald-200 font-semibold">
                      Try: {liveGuidance.grammarNote.correction}
                    </div>
                    <div className="text-[#486581] dark:text-slate-300">
                      {liveGuidance.grammarNote.explanation}
                    </div>
                  </div>
                )}

                {liveGuidance && (
                  <div className="p-3.5 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-2.5 text-xs">
                    <div className="font-semibold text-[#3C8D8A]">Suggested Responses</div>
                    <div className="flex flex-col gap-1.5">
                      {liveGuidance.suggestedResponses.map((resp) => (
                        <button
                          key={resp}
                          type="button"
                          onClick={() => pushCaptionLine(resp)}
                          className="text-left p-2 rounded-lg bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] hover:border-[#3C8D8A] text-[#243447] dark:text-slate-100 transition-colors"
                        >
                          {resp}
                        </button>
                      ))}
                    </div>

                    {liveGuidance.followUpQuestions?.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <div className="font-semibold text-[#718096]">Follow-Up Questions</div>
                        <ul className="list-disc pl-4 space-y-1 text-[#486581] dark:text-slate-300">
                          {liveGuidance.followUpQuestions.map((fq) => (
                            <li key={fq}>{fq}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {(liveGuidance?.vocabularyHints || guideScript?.vocabularyHints) && (
                  <div className="space-y-2 text-xs">
                    <div className="font-semibold text-[#718096]">Vocabulary Hints</div>
                    <div className="space-y-1.5">
                      {(liveGuidance?.vocabularyHints || guideScript?.vocabularyHints || []).map(
                        (vh) => (
                          <div
                            key={vh.word}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B]"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-[#243447] dark:text-white">
                                {vh.word}
                              </span>
                              {showTranslation && (
                                <span className="text-[#718096] ml-1.5">{vh.meaningId}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                await saveWordFromAnywhere(vh.word);
                                showToast(`Saved "${vh.word}"`, 'success');
                              }}
                              className="text-[11px] font-semibold text-[#3C8D8A] hover:underline shrink-0"
                            >
                              + Save
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {callState === 'summary' && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#243447] dark:text-white">
              Speaking Session Summary
            </h2>
            <span className="font-mono tabular-nums text-sm font-semibold text-[#3C8D8A]">
              {formattedTime}
            </span>
          </div>

          {summaryReport ? (
            <div className="space-y-4 text-sm">
              <p className="text-[#486581] dark:text-slate-300 leading-relaxed">
                {summaryReport.summary || summaryReport.speakingPerformance}
              </p>

              {summaryReport.newVocabulary && summaryReport.newVocabulary.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#718096]">New Vocabulary</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {summaryReport.newVocabulary.map((nv) => (
                      <div
                        key={nv.word}
                        className="p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-[#243447] dark:text-white">
                            {nv.word} · <span className="text-[#718096] font-normal">{nv.meaningId}</span>
                          </div>
                          <div className="text-[#486581] dark:text-slate-300 mt-0.5">{nv.example}</div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await saveWordFromAnywhere(nv.word);
                            showToast(`Saved "${nv.word}"`, 'success');
                          }}
                          className="px-2 py-1 rounded bg-white dark:bg-[#16202C] border border-[#E4E8EE] text-[#3C8D8A] font-semibold flex items-center gap-1 shrink-0"
                        >
                          <BookmarkPlus className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summaryReport.grammarMistakes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#718096]">Recommended Corrections</div>
                  {summaryReport.grammarMistakes.map((gm, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-[#D65A5A]">Original: {gm.original}</div>
                        <div className="text-[#39856A] font-semibold">Better: {gm.correction}</div>
                        <div className="text-[#718096] mt-0.5">{gm.reason}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {gm.grammarTopicId && (
                          <button
                            type="button"
                            onClick={() => navigateToGrammarTopic(gm.grammarTopicId!)}
                            className="px-2.5 py-1 rounded border border-[#E4E8EE] font-semibold text-[#243447] dark:text-slate-200"
                          >
                            Review Grammar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            openAssistantWithPrompt(`Practice correcting: "${gm.original}"`)
                          }
                          className="px-2.5 py-1 rounded bg-[#E6F0ED] text-[#243B53] font-semibold"
                        >
                          Practice Mistake
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {summaryReport.betterExpressions && summaryReport.betterExpressions.length > 0 && (
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-[#718096]">Better Expressions</div>
                  <ul className="list-disc pl-4 space-y-1 text-[#243447] dark:text-slate-200">
                    {summaryReport.betterExpressions.map((be, i) => (
                      <li key={i}>{be}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCallState('idle');
                    setSummaryReport(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#E4E8EE] dark:border-[#263344] text-xs font-semibold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#3C8D8A]" />
                  <span>Repeat Conversation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRoute('sentence-builder')}
                  className="px-3 py-1.5 rounded-lg bg-[#E6F0ED] text-[#243B53] text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>Practice in Sentence Coach</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : loadingSummary ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#718096]">
              <Loader2 className="w-4 h-4 animate-spin text-[#3C8D8A]" />
              <span>AI sedang menyusun ringkasan dan koreksi percakapan...</span>
            </div>
          ) : (
            <p className="text-sm text-[#718096]">
              Session completed. Rate your experience below to save.
            </p>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-[#E4E8EE] dark:border-[#263344]">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#718096]">Rate partner:</span>
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSessionRating(r)}
                  className={`px-2.5 py-1 rounded-md font-mono font-semibold ${
                    sessionRating >= r
                      ? 'bg-[#D6AD60] text-white'
                      : 'bg-[#F7F8FA] dark:bg-[#1E2B3B] text-[#718096]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSaveSummaryAndClose}
              className="px-4 py-2 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] text-white text-xs font-semibold"
            >
              Save &amp; Finish
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(blockTarget)}
        title={`Block ${blockTarget?.displayName}?`}
        description="They will no longer appear in your online Speaking Partner list or be able to invite you to voice calls."
        confirmLabel="Block Partner"
        destructive
        onCancel={() => setBlockTarget(null)}
        onConfirm={async () => {
          if (!blockTarget) return;
          const target = blockTarget;
          setBlockTarget(null);
          await blockUser(target.uid);
          wsRef.current?.send(JSON.stringify({ type: 'safety:block', targetId: target.uid }));
          showToast(`Blocked ${target.displayName}`, 'info');
        }}
      />
    </div>
  );
}
