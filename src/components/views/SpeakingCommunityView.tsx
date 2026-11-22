import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Ban,
  BookmarkPlus,
  Flag,
  Languages,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOff,
  RotateCcw,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLingua } from '../../context/LinguaContext';
import { COMMUNITY_TOPICS } from '../../lib/curriculum';
import type {
  CommunityPeer,
  PeerLiveGuidance,
  SpeakingGuideScript,
  SpeakingSummaryReport,
  TranscriptEntry,
} from '../../types/lingua';
import { ConfirmModal, EmptyState, PageHeader, useToast } from '../ui/ToastAndPrimitives';

type GuideMode = 'Follow Script' | 'Smart Guidance' | 'Free Speaking';

export function SpeakingCommunityView() {
  const {
    profile,
    account,
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
  const [selectedTopic, setSelectedTopic] = useState<string>(COMMUNITY_TOPICS[0]);
  const [guideMode, setGuideMode] = useState<GuideMode>('Smart Guidance');
  const [showTranslation, setShowTranslation] = useState(true);

  const [guideScript, setGuideScript] = useState<SpeakingGuideScript | null>(null);
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [liveGuidance, setLiveGuidance] = useState<PeerLiveGuidance | null>(null);
  const [loadingLiveGuidance, setLoadingLiveGuidance] = useState(false);

  const [incomingInvite, setIncomingInvite] = useState<{
    fromUid: string;
    fromName: string;
    fromPhotoURL?: string;
    fromLevel: string;
    topic: string;
  } | null>(null);

  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'summary'>('idle');
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
  const [error, setError] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<CommunityPeer | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const activePeerRef = useRef<{ uid: string; displayName: string; photoURL?: string } | null>(null);

  useEffect(() => {
    activePeerRef.current = activePeer;
  }, [activePeer]);

  useEffect(() => {
    if (callState !== 'connected') return;
    const id = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [callState]);

  const cleanupMedia = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
  };

  const setupWebRTC = async (targetUid: string, isInitiator: boolean) => {
    if (!account?.audioConsentGranted) {
      await grantAudioConsent(true);
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
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
          topic: msg.topic || 'Introduction',
        });
      } else if (msg.type === 'call:accept') {
        setCallState('connected');
        setCallSeconds(0);
        try {
          await setupWebRTC(msg.fromUid, true);
        } catch {
          setError('Microphone access is needed for WebRTC voice call.');
        }
      } else if (msg.type === 'call:reject' || msg.type === 'call:unavailable') {
        setCallState('idle');
        setActivePeer(null);
        setError(msg.reason || 'Partner declined or is unavailable.');
      } else if (msg.type === 'webrtc:offer') {
        if (!pcRef.current) {
          await setupWebRTC(msg.fromUid, false);
        }
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.offer));
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
      } else if (msg.type === 'webrtc:answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.answer));
      } else if (msg.type === 'webrtc:ice-candidate' && pcRef.current && msg.candidate) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
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

  const loadTopicScript = async (topic: string) => {
    setLoadingGuide(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/speaking-guide/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level: profile?.level || 'B1-B2' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load conversation script.');
      setGuideScript(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate topic script.');
    } finally {
      setLoadingGuide(false);
    }
  };

  const fetchVisualGuidance = async (linesSnapshot?: TranscriptEntry[]) => {
    if (loadingLiveGuidance) return;
    setLoadingLiveGuidance(true);
    try {
      const source = linesSnapshot || captions;
      const res = await fetch('/api/ai/speaking-guide/live-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          level: profile?.level || 'B1-B2',
          recentLines: source.slice(-8).map((c) => `${c.speaker}: ${c.text}`),
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
    setError(null);
    setActivePeer({ uid: peer.uid, displayName: peer.displayName, photoURL: peer.photoURL });
    setCallState('calling');
    setCaptions([]);
    setSummaryReport(null);
    setLiveGuidance(null);
    if (!guideScript) {
      await loadTopicScript(selectedTopic);
    }
    wsRef.current?.send(
      JSON.stringify({
        type: 'call:invite',
        targetId: peer.uid,
        topic: selectedTopic,
      })
    );
  };

  const handleAcceptInvite = async () => {
    if (!incomingInvite) return;
    const inv = incomingInvite;
    setIncomingInvite(null);
    setSelectedTopic(inv.topic);
    setActivePeer({ uid: inv.fromUid, displayName: inv.fromName, photoURL: inv.fromPhotoURL });
    setCallState('connected');
    setCallSeconds(0);
    setCaptions([]);
    setLiveGuidance(null);
    await loadTopicScript(inv.topic);
    wsRef.current?.send(
      JSON.stringify({
        type: 'call:accept',
        targetId: inv.fromUid,
      })
    );
    wsRef.current?.send(JSON.stringify({ type: 'presence:status', status: 'in-call' }));
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
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = micMuted;
    });
    setMicMuted((m) => !m);
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !speakerMuted;
    }
    setSpeakerMuted((m) => !m);
  };

  const formattedTime = `${String(Math.floor(callSeconds / 60)).padStart(2, '0')}:${String(
    callSeconds % 60
  ).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <PageHeader
        title="Speaking Partner"
        subtitle="Connect via real-time WebRTC audio with online learners and quiet, visual-only AI Speaking Guidance."
        action={
          <div className="text-xs font-medium text-[#718096] bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-lg px-3 py-1.5">
            {wsConnected ? 'Online' : 'Connecting...'} ·{' '}
            <span className="font-mono tabular-nums font-semibold text-[#243447] dark:text-white">
              {peers.length}
            </span>{' '}
            learners
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
                Incoming Invitation from {incomingInvite.fromName}
              </div>
              <div className="text-xs text-[#486581] dark:text-slate-300">
                Level {incomingInvite.fromLevel} · Topic: {incomingInvite.topic}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRejectInvite}
              className="px-3.5 py-2 rounded-lg border border-[#E4E8EE] dark:border-[#263344] bg-white dark:bg-[#16202C] text-xs font-semibold"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={handleAcceptInvite}
              className="px-4 py-2 rounded-lg bg-[#39856A] hover:bg-[#2F6F58] text-white text-xs font-semibold"
            >
              Accept Call
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
          {/* Topic Setup */}
          <div className="lg:col-span-5 bg-white dark:bg-[#16202C] border border-[#E4E8EE] dark:border-[#263344] rounded-xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-[#243447] dark:text-white">
              1. Conversation Topic
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {COMMUNITY_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedTopic === topic
                      ? 'border-[#3C8D8A] bg-[#E6F0ED] dark:bg-[#3C8D8A]/20 text-[#243B53] dark:text-[#E6F0ED] font-semibold'
                      : 'border-[#E4E8EE] dark:border-[#263344] text-[#486581] dark:text-slate-300 hover:bg-[#F7F8FA]'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={loadingGuide}
              onClick={() => loadTopicScript(selectedTopic)}
              className="w-full py-2.5 px-4 rounded-lg bg-[#243B53] hover:bg-[#1B2D40] disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {loadingGuide
                  ? 'Preparing Conversation Guide...'
                  : `Preview Guide: ${selectedTopic}`}
              </span>
            </button>

            {guideScript && (
              <div className="p-3.5 rounded-xl bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] space-y-2 text-xs">
                <div className="font-semibold text-[#243447] dark:text-white">
                  Starter Dialogue Preview
                </div>
                {guideScript.starterPrompts.map((sp, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="text-[#243447] dark:text-slate-200">
                      <span className="font-semibold">Speaker {sp.speakerRole}:</span> {sp.line}
                    </div>
                    <div className="text-[#718096]">{sp.translationId}</div>
                  </div>
                ))}
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
          <div className="space-y-1">
            <div className="text-base font-semibold text-[#243447] dark:text-white">
              Calling {activePeer?.displayName}...
            </div>
            <p className="text-xs text-[#718096]">Topic: {selectedTopic}</p>
          </div>
          <button
            type="button"
            onClick={() => {
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
                    Voice Connected · {selectedTopic}
                  </div>
                </div>
              </div>
              <div className="font-mono tabular-nums text-sm font-semibold text-[#243447] dark:text-white">
                {formattedTime}
              </div>
            </div>

            <div className="text-[11px] text-[#718096] bg-[#F7F8FA] dark:bg-[#1E2B3B] border border-[#E4E8EE] dark:border-[#263344] rounded-lg px-3 py-2">
              Live speech captions rely on browser speech-to-text and may vary with accent or noise.
              AI guidance stays purely visual so your call is never interrupted.
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
