import type { IncomingMessage } from 'node:http';
import type { Server } from 'node:http';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';

interface CommunityClient {
  ws: WebSocket;
  uid: string;
  displayName: string;
  photoURL?: string;
  level: string;
  preferredAccent: string;
  status: 'available' | 'in-call';
  blockedIds: Set<string>;
}

const communityClients = new Map<string, CommunityClient>();

function broadcastPresence() {
  const peerList = Array.from(communityClients.values()).map((c) => ({
    uid: c.uid,
    displayName: c.displayName,
    photoURL: c.photoURL,
    level: c.level,
    preferredAccent: c.preferredAccent,
    status: c.status,
  }));

  for (const client of communityClients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      const visiblePeers = peerList.filter(
        (p) => p.uid !== client.uid && !client.blockedIds.has(p.uid)
      );
      client.ws.send(JSON.stringify({ type: 'presence:list', peers: visiblePeers }));
    }
  }
}

function getLiveModeDirective(mode: string, speed: string): string {
  const pace =
    speed === 'slow'
      ? 'Speak slowly, articulate every syllable clearly, and use short approachable sentences.'
      : speed === 'natural'
      ? 'Speak at a brisk, authentic native pace using natural contractions and everyday idioms.'
      : 'Speak at a clear, relaxed natural pace.';

  switch (mode) {
    case 'Professional Tutor':
      return `${pace} Use polished workplace/academic register and explain subtle nuances politely.`;
    case 'Strict Practice':
      return `${pace} Watch closely for tense, article, and preposition mistakes and guide the learner to fix them accurately.`;
    case 'Interview Practice':
      return `${pace} Roleplay as an encouraging English interviewer asking relevant behavioral and career follow-ups.`;
    case 'Free Speaking':
      return `${pace} Keep the dialogue flowing smoothly without interrupting mid-thought; save gentle corrections until after understanding their full idea.`;
    case 'Friendly Conversation':
    default:
      return `${pace} Keep the chat warm, friendly, and confidence-building.`;
  }
}

export function attachWebSocketHub(server: Server) {
  const liveWss = new WebSocketServer({ noServer: true });
  const communityWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname === '/ws/live') {
      liveWss.handleUpgrade(req, socket, head, (ws) => {
        liveWss.emit('connection', ws, req);
      });
    } else if (pathname === '/ws/community') {
      communityWss.handleUpgrade(req, socket, head, (ws) => {
        communityWss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  // ------------------------------------------------------------------
  // 1. Gemini Live API Voice Tutor Bridge (/ws/live)
  // ------------------------------------------------------------------
  liveWss.on('connection', async (clientWs, req) => {
    const url = new URL(req.url || '/ws/live', 'http://localhost:3000');
    const tutorName = (url.searchParams.get('tutorName') || 'Emma').slice(0, 60);
    const voiceName = url.searchParams.get('voiceName') || 'Kore';
    const accent = (url.searchParams.get('accent') || 'American').slice(0, 20);
    const mode = (url.searchParams.get('mode') || 'Friendly Conversation').slice(0, 60);
    const speed = (url.searchParams.get('speed') || 'normal').slice(0, 20);
    const level = (url.searchParams.get('level') || 'B1-B2').slice(0, 20);
    const contextNote = (url.searchParams.get('contextNote') || '').slice(0, 600);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: 'GEMINI_API_KEY is not configured. Configure it in Settings > Secrets to start Live Voice.',
        })
      );
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    let liveSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;

    const systemInstruction = [
      `You are ${tutorName}, a native ${accent} English tutor speaking with an Indonesian learner at CEFR level ${level}.`,
      `Mode: ${mode}. ${getLiveModeDirective(mode, speed)}`,
      contextNote ? `Learner memory focus: ${contextNote}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    try {
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceName)
                  ? voiceName
                  : 'Kore',
              },
            },
          },
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'ready' }));
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'inputTranscript',
                  text: content.inputTranscription.text,
                })
              );
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'outputTranscript',
                  text: content.outputTranscription.text,
                })
              );
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ type: 'audio', audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
            if (content?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turnComplete' }));
            }
          },
          onerror: (err: unknown) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  message: err instanceof Error ? err.message : 'Gemini Live stream error',
                })
              );
            }
          },
        },
      });
    } catch (error) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unable to initialize Gemini Live session',
          })
        );
        clientWs.close();
      }
      return;
    }

    clientWs.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.audio && liveSession) {
          liveSession.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.text && liveSession) {
          liveSession.sendRealtimeInput({ text: String(msg.text) });
        }
      } catch {
        // Ignore malformed packets
      }
    });

    clientWs.on('close', () => {
      try {
        liveSession?.close();
      } catch {
        // Ignore close errors
      }
    });
  });

  // ------------------------------------------------------------------
  // 2. Real-Time User-to-User Speaking Community & WebRTC Signaling (/ws/community)
  // ------------------------------------------------------------------
  communityWss.on('connection', (ws) => {
    let boundUid: string | null = null;

    ws.on('message', (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        const type = String(payload.type || '');

        if (type === 'presence:join') {
          const uid = String(payload.uid || '').trim();
          if (!uid) return;
          boundUid = uid;
          communityClients.set(uid, {
            ws,
            uid,
            displayName: String(payload.displayName || 'Learner').slice(0, 80),
            photoURL: payload.photoURL ? String(payload.photoURL).slice(0, 512) : undefined,
            level: String(payload.level || 'B1-B2'),
            preferredAccent: String(payload.preferredAccent || 'American'),
            status: payload.status === 'in-call' ? 'in-call' : 'available',
            blockedIds: new Set(Array.isArray(payload.blockedIds) ? payload.blockedIds.map(String) : []),
          });
          broadcastPresence();
          return;
        }

        if (!boundUid) return;
        const sender = communityClients.get(boundUid);
        if (!sender) return;

        if (type === 'presence:status') {
          sender.status = payload.status === 'in-call' ? 'in-call' : 'available';
          broadcastPresence();
          return;
        }

        if (type === 'safety:block') {
          const targetId = String(payload.targetId || '');
          if (targetId) {
            sender.blockedIds.add(targetId);
            broadcastPresence();
          }
          return;
        }

        const targetId = String(payload.targetId || '');
        const target = communityClients.get(targetId);
        if (target && target.ws.readyState === WebSocket.OPEN && !target.blockedIds.has(boundUid)) {
          target.ws.send(
            JSON.stringify({
              ...payload,
              fromUid: boundUid,
              fromName: sender.displayName,
              fromPhotoURL: sender.photoURL,
              fromLevel: sender.level,
            })
          );
        } else if (type === 'call:invite') {
          ws.send(
            JSON.stringify({
              type: 'call:unavailable',
              targetId,
              reason: 'Selected learner is currently offline or unavailable.',
            })
          );
        }
      } catch {
        // Ignore invalid signaling payload
      }
    });

    ws.on('close', () => {
      if (boundUid && communityClients.get(boundUid)?.ws === ws) {
        communityClients.delete(boundUid);
        broadcastPresence();
      }
    });
  });
}
