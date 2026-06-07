"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Info,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  ScreenShareOff,
  Send,
  Shield,
  Users,
  X,
} from "lucide-react";
import { createLiveSocket, type LiveSocket } from "@/lib/realtime/liveSocket";

interface RemotePeer {
  id: string;
  name: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

type SessionConfig = {
  sessionId: number;
  getRequestUrl: (path: string) => string;
  token: string | null;
};

interface LiveMeetingProps {
  roomId: string;
  userName: string;
  onExit: () => void;
  attendance?: {
    endpointUrl: string;
    token: string;
    userId: number | string;
  } | null;
  session?: SessionConfig | null;
}

type PresenceMessage =
  | { type: "join"; peerId: string; roomId: string; name: string; audioEnabled: boolean; videoEnabled: boolean }
  | { type: "leave"; peerId: string; roomId: string }
  | { type: "sync-request"; peerId: string; roomId: string }
  | { type: "sync-response"; peerId: string; roomId: string; name: string; audioEnabled: boolean; videoEnabled: boolean; targetPeerId: string }
  | { type: "status"; peerId: string; roomId: string; audioEnabled: boolean; videoEnabled: boolean }
  | { type: "chat"; peerId: string; roomId: string; sender: string; text: string; time: string };

type JoinContext = {
  room_id: string;
  channel_name: string;
  signal_url: string;
  broadcast_auth_url: string;
  ice_servers: RTCIceServer[];
  reverb: {
    key: string;
    host: string;
    port: number;
    scheme: string;
    use_tls: boolean;
  };
};

type LiveSignal = {
  session_id: number;
  sender_user_id: number;
  sender_name: string;
  type: "join" | "offer" | "answer" | "ice-candidate" | "status" | "chat" | "leave";
  sender_peer_id: string;
  target_peer_id?: string | null;
  payload?: Record<string, unknown>;
  sent_at: string;
};

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
  },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function shouldInitiateOffer(selfPeerId: string, remotePeerId: string) {
  return selfPeerId.localeCompare(remotePeerId) < 0;
}

export default function LiveMeeting({ roomId, userName, onExit, attendance = null, session = null }: LiveMeetingProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [peerId] = useState(() => `peer-${crypto.randomUUID().slice(0, 10)}`);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMediaPending, setIsMediaPending] = useState(true);
  const [displayRoomId, setDisplayRoomId] = useState(roomId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remotePeersRef = useRef<RemotePeer[]>([]);
  const pcMap = useRef<Map<string, RTCPeerConnection>>(new Map());
  const socketRef = useRef<LiveSocket | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const joinedAtRef = useRef<string>(new Date().toISOString());
  const attendanceSubmittedRef = useRef(false);
  const micStateRef = useRef(true);
  const camStateRef = useRef(true);
  const joinContextRef = useRef<JoinContext | null>(null);
  const isUnmountingRef = useRef(false);

  const upsertRemotePeer = useCallback((peer: Omit<RemotePeer, "stream"> & { stream?: MediaStream | null }) => {
    setRemotePeers((prev) => {
      const existing = prev.find((item) => item.id === peer.id);
      if (existing) {
        return prev.map((item) =>
          item.id === peer.id
            ? {
                ...item,
                name: peer.name,
                audioEnabled: peer.audioEnabled,
                videoEnabled: peer.videoEnabled,
                stream: peer.stream ?? item.stream,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          id: peer.id,
          name: peer.name,
          audioEnabled: peer.audioEnabled,
          videoEnabled: peer.videoEnabled,
          stream: peer.stream ?? null,
        },
      ];
    });
  }, []);

  useEffect(() => {
    remotePeersRef.current = remotePeers;
  }, [remotePeers]);

  useEffect(() => {
    micStateRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    camStateRef.current = isCamOn;
  }, [isCamOn]);

  useEffect(() => {
    joinedAtRef.current = new Date().toISOString();
    attendanceSubmittedRef.current = false;
    setDisplayRoomId(roomId);
  }, [roomId]);

  const submitAttendance = useCallback(async () => {
    if (!attendance || attendanceSubmittedRef.current) {
      return;
    }

    attendanceSubmittedRef.current = true;

    const leftAt = new Date();
    const joinedAtDate = new Date(joinedAtRef.current);
    const durationMinutes = Math.max(1, Math.round((leftAt.getTime() - joinedAtDate.getTime()) / 60000));

    try {
      await fetch(attendance.endpointUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${attendance.token}`,
        },
        body: JSON.stringify({
          user_id: attendance.userId,
          joined_at: joinedAtRef.current,
          left_at: leftAt.toISOString(),
          duration_minutes: durationMinutes,
        }),
        keepalive: true,
      });
    } catch (error) {
      console.error("Failed to store session attendance:", error);
      attendanceSubmittedRef.current = false;
    }
  }, [attendance]);

  const closePeerConnection = useCallback((remotePeerId: string) => {
    const pc = pcMap.current.get(remotePeerId);
    if (pc) {
      pc.close();
      pcMap.current.delete(remotePeerId);
    }
  }, []);

  const removeRemotePeer = useCallback((remotePeerId: string) => {
    closePeerConnection(remotePeerId);
    setRemotePeers((prev) => prev.filter((peer) => peer.id !== remotePeerId));
  }, [closePeerConnection]);

  const sendHttpSignal = useCallback(async (type: LiveSignal["type"], payload: Record<string, unknown> = {}, targetPeerId?: string | null) => {
    if (!session?.token) {
      return;
    }

    const signalUrl = session.getRequestUrl(`/virtual-sessions/${session.sessionId}/signals`);
    await fetch(signalUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        type,
        sender_peer_id: peerId,
        target_peer_id: targetPeerId ?? null,
        payload,
      }),
    });
  }, [peerId, session?.token]);

  const broadcastPresence = useCallback((message: PresenceMessage) => {
    channelRef.current?.postMessage(message);
  }, []);

  const sendSignal = useCallback(async (type: LiveSignal["type"], payload: Record<string, unknown> = {}, targetPeerId?: string | null) => {
    if (session?.sessionId && session.token) {
      try {
        await sendHttpSignal(type, payload, targetPeerId);
      } catch (error) {
        if (!isUnmountingRef.current) {
          setConnectionError(normalizeError(error, "Failed to send the latest live signal."));
        }
      }
      return;
    }

    if (type === "join" || type === "status" || type === "chat" || type === "leave") {
      if (type === "join") {
        broadcastPresence({
          type: "join",
          peerId,
          roomId: displayRoomId,
          name: userName,
          audioEnabled: micStateRef.current,
          videoEnabled: camStateRef.current,
        });
      } else if (type === "status") {
        broadcastPresence({
          type: "status",
          peerId,
          roomId: displayRoomId,
          audioEnabled: Boolean(payload.audioEnabled),
          videoEnabled: Boolean(payload.videoEnabled),
        });
      } else if (type === "chat") {
        broadcastPresence({
          type: "chat",
          peerId,
          roomId: displayRoomId,
          sender: userName,
          text: String(payload.text ?? ""),
          time: String(payload.time ?? ""),
        });
      } else if (type === "leave") {
        broadcastPresence({
          type: "leave",
          peerId,
          roomId: displayRoomId,
        });
      }
    }
  }, [broadcastPresence, displayRoomId, peerId, sendHttpSignal, session?.sessionId, session?.token, userName]);

  const createPeerConnection = useCallback((remotePeerId: string, remotePeerName: string) => {
    const existing = pcMap.current.get(remotePeerId);
    if (existing) {
      return existing;
    }

    const pc = new RTCPeerConnection({
      iceServers: joinContextRef.current?.ice_servers?.length ? joinContextRef.current.ice_servers : DEFAULT_ICE_SERVERS,
    });

    const stream = new MediaStream();
    upsertRemotePeer({
      id: remotePeerId,
      name: remotePeerName,
      audioEnabled: true,
      videoEnabled: true,
      stream,
    });

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current as MediaStream);
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      void sendSignal("ice-candidate", { candidate: event.candidate.toJSON() }, remotePeerId);
    };

    pc.ontrack = (event) => {
      const [incomingStream] = event.streams;
      if (incomingStream) {
        upsertRemotePeer({
          id: remotePeerId,
          name: remotePeerName,
          audioEnabled: true,
          videoEnabled: true,
          stream: incomingStream,
        });
        return;
      }

      stream.addTrack(event.track);
      upsertRemotePeer({
        id: remotePeerId,
        name: remotePeerName,
        audioEnabled: true,
        videoEnabled: true,
        stream,
      });
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        removeRemotePeer(remotePeerId);
      }
    };

    pcMap.current.set(remotePeerId, pc);
    return pc;
  }, [removeRemotePeer, sendSignal, upsertRemotePeer]);

  const createAndSendOffer = useCallback(async (remotePeerId: string, remotePeerName: string) => {
    const pc = createPeerConnection(remotePeerId, remotePeerName);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal("offer", { description: offer }, remotePeerId);
  }, [createPeerConnection, sendSignal]);

  const handleLiveSignal = useCallback(async (signal: LiveSignal) => {
    if (!signal || signal.sender_peer_id === peerId) {
      return;
    }

    if (signal.target_peer_id && signal.target_peer_id !== peerId) {
      return;
    }

    const payload = asRecord(signal.payload) ?? {};
    const remotePeerId = signal.sender_peer_id;
    const remotePeerName = signal.sender_name || "Participant";

    try {
      switch (signal.type) {
        case "join": {
          upsertRemotePeer({
            id: remotePeerId,
            name: String(payload.name ?? remotePeerName),
            audioEnabled: payload.audioEnabled !== false,
            videoEnabled: payload.videoEnabled !== false,
          });

          await sendSignal("status", {
            name: userName,
            audioEnabled: micStateRef.current,
            videoEnabled: camStateRef.current,
          }, remotePeerId);

          if (shouldInitiateOffer(peerId, remotePeerId)) {
            await createAndSendOffer(remotePeerId, String(payload.name ?? remotePeerName));
          }
          break;
        }

        case "offer": {
          const description = asRecord(payload.description);
          if (!description) {
            return;
          }

          const pc = createPeerConnection(remotePeerId, remotePeerName);
          await pc.setRemoteDescription(new RTCSessionDescription(description as unknown as RTCSessionDescriptionInit));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal("answer", { description: answer }, remotePeerId);
          break;
        }

        case "answer": {
          const description = asRecord(payload.description);
          const pc = pcMap.current.get(remotePeerId);
          if (!pc || !description) {
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(description as unknown as RTCSessionDescriptionInit));
          break;
        }

        case "ice-candidate": {
          const candidate = asRecord(payload.candidate);
          const pc = pcMap.current.get(remotePeerId);
          if (!pc || !candidate) {
            return;
          }

          await pc.addIceCandidate(new RTCIceCandidate(candidate as unknown as RTCIceCandidateInit));
          break;
        }

        case "status": {
          upsertRemotePeer({
            id: remotePeerId,
            name: String(payload.name ?? remotePeerName),
            audioEnabled: payload.audioEnabled !== false,
            videoEnabled: payload.videoEnabled !== false,
          });
          break;
        }

        case "chat": {
          const text = String(payload.text ?? "").trim();
          if (!text) {
            return;
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `${remotePeerId}-${signal.sent_at}`,
              sender: String(payload.sender ?? remotePeerName),
              text,
              time: String(payload.time ?? new Date(signal.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
              isMe: false,
            },
          ]);
          break;
        }

        case "leave": {
          removeRemotePeer(remotePeerId);
          break;
        }
      }
    } catch (error) {
      if (!isUnmountingRef.current) {
        setConnectionError(normalizeError(error, "A live peer signal could not be processed."));
      }
    }
  }, [createAndSendOffer, createPeerConnection, peerId, removeRemotePeer, sendSignal, upsertRemotePeer, userName]);

  useEffect(() => {
    isUnmountingRef.current = false;

    return () => {
      isUnmountingRef.current = true;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const startMedia = async () => {
      try {
        setMediaError(null);
        setIsMediaPending(true);

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("This browser does not support camera access.");
        }

        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        const hasVideoInput = devices.some((device) => device.kind === "videoinput");
        const hasAudioInput = devices.some((device) => device.kind === "audioinput");

        if (!hasVideoInput) {
          throw new Error("No camera device was found.");
        }

        if (!hasAudioInput) {
          throw new Error("No microphone device was found.");
        }

        const timeoutToken = Symbol("camera-timeout");
        const streamOrTimeout = await Promise.race<MediaStream | typeof timeoutToken>([
          navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30, max: 30 },
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          }),
          new Promise<typeof timeoutToken>((resolve) => window.setTimeout(() => resolve(timeoutToken), 12000)),
        ]);

        if (streamOrTimeout === timeoutToken) {
          if (isMounted) {
            setLocalStream(null);
            localStreamRef.current = null;
            setIsMediaPending(false);
            setMediaError("Camera request timed out. Please allow browser permissions and check that no other app is locking the camera.");
          }
          return;
        }

        if (isMounted) {
          setLocalStream(streamOrTimeout);
          localStreamRef.current = streamOrTimeout;
          setIsMediaPending(false);
        }
      } catch (error) {
        if (isMounted) {
          setLocalStream(null);
          localStreamRef.current = null;
          setIsMediaPending(false);
          setMediaError(normalizeError(error, "Camera or microphone access was blocked. Allow permissions for this site, then refresh."));
        }
      }
    };

    void startMedia();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      if (localStream) {
        void localVideoRef.current.play().catch(() => undefined);
      }
    }

    if (!localStream) {
      return;
    }

    pcMap.current.forEach((pc) => {
      localStream.getTracks().forEach((track) => {
        const sender = pc.getSenders().find((item) => item.track?.kind === track.kind);
        if (sender) {
          void sender.replaceTrack(track);
        } else {
          pc.addTrack(track, localStream);
        }
      });
    });
  }, [localStream]);

  useEffect(() => {
    let cancelled = false;

    const connectSessionBackedRoom = async () => {
      if (!session?.sessionId || !session.token) {
        return false;
      }

      const response = await fetch(session.getRequestUrl(`/virtual-sessions/${session.sessionId}/join-context`), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.token}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as { data?: JoinContext; message?: string } | null;
      if (!response.ok || !payload?.data) {
        return false;
      }

      if (cancelled) {
        return true;
      }

      const context = payload.data;
      joinContextRef.current = context;
      setDisplayRoomId(context.room_id || roomId);

      const socket = createLiveSocket({
        authEndpoint: session.getRequestUrl('/broadcasting/auth'),
        authToken: session.token,
        channelName: context.channel_name,
        key: context.reverb.key,
        host: context.reverb.host,
        port: context.reverb.port,
        scheme: context.reverb.scheme,
        useTls: context.reverb.use_tls,
      });

      socket.channel.bind("pusher:subscription_succeeded", () => {
        void sendSignal("join", {
          name: userName,
          audioEnabled: micStateRef.current,
          videoEnabled: camStateRef.current,
        });
      });

      socket.channel.bind("virtual-session.signal", (event: unknown) => {
        void handleLiveSignal((event ?? {}) as LiveSignal);
      });

      socketRef.current = socket;
      return true;
    };

    const connectFallbackRoom = () => {
      const channel = new BroadcastChannel(`afaq-live:${roomId}`);
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent<PresenceMessage>) => {
        const message = event.data;
        if (!message || message.roomId !== roomId || message.peerId === peerId) {
          return;
        }

        if (message.type === "join") {
          upsertRemotePeer({
            id: message.peerId,
            name: message.name,
            audioEnabled: message.audioEnabled,
            videoEnabled: message.videoEnabled,
          });
          broadcastPresence({
            type: "sync-response",
            peerId,
            roomId,
            name: userName,
            audioEnabled: micStateRef.current,
            videoEnabled: camStateRef.current,
            targetPeerId: message.peerId,
          });
          return;
        }

        if (message.type === "sync-request") {
          broadcastPresence({
            type: "sync-response",
            peerId,
            roomId,
            name: userName,
            audioEnabled: micStateRef.current,
            videoEnabled: camStateRef.current,
            targetPeerId: message.peerId,
          });
          return;
        }

        if (message.type === "sync-response") {
          if (message.targetPeerId !== peerId) return;
          upsertRemotePeer({
            id: message.peerId,
            name: message.name,
            audioEnabled: message.audioEnabled,
            videoEnabled: message.videoEnabled,
          });
          return;
        }

        if (message.type === "status") {
          upsertRemotePeer({
            id: message.peerId,
            name: remotePeersRef.current.find((peer) => peer.id === message.peerId)?.name ?? "Participant",
            audioEnabled: message.audioEnabled,
            videoEnabled: message.videoEnabled,
          });
          return;
        }

        if (message.type === "chat") {
          setMessages((prev) => [
            ...prev,
            {
              id: `${message.peerId}-${Date.now()}`,
              sender: message.sender,
              text: message.text,
              time: message.time,
              isMe: false,
            },
          ]);
          return;
        }

        if (message.type === "leave") {
          setRemotePeers((prev) => prev.filter((peer) => peer.id !== message.peerId));
        }
      };

      broadcastPresence({
        type: "join",
        peerId,
        roomId,
        name: userName,
        audioEnabled: true,
        videoEnabled: true,
      });

      broadcastPresence({
        type: "sync-request",
        peerId,
        roomId,
      });
    };

    setConnectionError(null);

    void (async () => {
      try {
        const connected = await connectSessionBackedRoom();
        if (!connected) {
          connectFallbackRoom();
        }
      } catch {
        if (!cancelled) {
          connectFallbackRoom();
        }
      }
    })();

    const currentPcMap = pcMap.current;

    return () => {
      cancelled = true;
      void submitAttendance();
      void sendSignal("leave");
      socketRef.current?.disconnect();
      socketRef.current = null;
      channelRef.current?.close();
      channelRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      currentPcMap.forEach((pc) => pc.close());
      currentPcMap.clear();
    };
  }, [broadcastPresence, handleLiveSignal, peerId, roomId, sendSignal, session, submitAttendance, upsertRemotePeer, userName]);

  const toggleMic = async () => {
    if (!localStreamRef.current) {
      return;
    }

    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !isMicOn;
    });

    const nextState = !isMicOn;
    setIsMicOn(nextState);
    await sendSignal("status", {
      name: userName,
      audioEnabled: nextState,
      videoEnabled: isCamOn,
    });
  };

  const toggleCam = async () => {
    if (!localStreamRef.current) {
      return;
    }

    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !isCamOn;
    });

    const nextState = !isCamOn;
    setIsCamOn(nextState);
    await sendSignal("status", {
      name: userName,
      audioEnabled: isMicOn,
      videoEnabled: nextState,
    });
  };

  const stopScreenShare = () => {
    if (!localVideoRef.current || !localStreamRef.current) {
      setIsScreenSharing(false);
      return;
    }

    localVideoRef.current.srcObject = localStreamRef.current;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      pcMap.current.forEach((pc) => {
        const sender = pc.getSenders().find((item) => item.track?.kind === "video");
        if (sender) {
          void sender.replaceTrack(videoTrack);
        }
      });
    }

    setIsScreenSharing(false);
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        pcMap.current.forEach((pc) => {
          const sender = pc.getSenders().find((item) => item.track?.kind === "video");
          if (sender) {
            void sender.replaceTrack(videoTrack);
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        videoTrack.onended = () => stopScreenShare();
        setIsScreenSharing(true);
      } catch (error) {
        setConnectionError(normalizeError(error, "Screen sharing could not be started."));
      }
      return;
    }

    stopScreenShare();
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) {
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      {
        id: `${peerId}-${Date.now()}`,
        sender: userName,
        text,
        time,
        isMe: true,
      },
    ]);
    setChatInput("");

    await sendSignal("chat", {
      sender: userName,
      text,
      time,
    });
  };

  const handleExit = async () => {
    await sendSignal("leave");
    await submitAttendance();
    onExit();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950 text-white font-sans overflow-hidden">
      <div className="flex-1 flex flex-col relative">
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-900/40">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
                {displayRoomId}
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase font-black tracking-widest">Secure</span>
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                {userName} • Live Session
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium">{remotePeers.length + 1} participants</span>
            </div>
          </div>
        </div>

        <div className="flex-1 relative p-4 md:p-8 flex items-center justify-center overflow-hidden">
          <div
            className={`grid gap-6 w-full h-full max-w-7xl transition-all duration-700 ${
              remotePeers.length === 0
                ? "grid-cols-1"
                : remotePeers.length === 1
                  ? "grid-cols-1 md:grid-cols-2"
                  : remotePeers.length <= 3
                    ? "grid-cols-2"
                    : "grid-cols-2 lg:grid-cols-3"
            }`}
          >
            <div className="relative group rounded-[32px] overflow-hidden bg-slate-900 border border-white/10 aspect-video shadow-2xl ring-1 ring-white/5">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover transition-all duration-700 ${isCamOn ? "opacity-100 scale-100" : "opacity-0 scale-110"}`}
              />
              {(!isCamOn || !localStream || mediaError || connectionError) && (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0f172a_100%)]">
                  <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600 border-4 border-indigo-400/20 shadow-2xl shadow-indigo-500/20">
                      <span className="text-4xl font-black text-white">{userName.charAt(0).toUpperCase()}</span>
                    </div>
                    {mediaError ? <p className="text-sm font-medium text-slate-200">{mediaError}</p> : null}
                    {connectionError ? <p className="text-sm font-medium text-amber-300">{connectionError}</p> : null}
                    {!mediaError && !connectionError && (isMediaPending || !localStream) ? (
                      <p className="text-sm font-medium text-slate-300">Starting your HD camera and microphone...</p>
                    ) : null}
                  </div>
                </div>
              )}
              <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-xl">
                <span className="text-sm font-bold text-white">{userName} (You)</span>
                {!isMicOn && <MicOff className="w-4 h-4 text-rose-500" />}
              </div>
            </div>

            {remotePeers.map((peer) => (
              <div key={peer.id} className="relative group rounded-[32px] overflow-hidden bg-slate-900 border border-white/10 aspect-video shadow-2xl ring-1 ring-white/5">
                <RemoteVideo stream={peer.stream} />
                <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-xl">
                  <span className="text-sm font-bold text-white">{peer.name}</span>
                  {!peer.audioEnabled && <MicOff className="w-4 h-4 text-rose-500" />}
                  {!peer.videoEnabled && <CameraOff className="w-4 h-4 text-amber-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-4 bg-slate-900/90 backdrop-blur-3xl p-3 px-6 rounded-[32px] border border-white/10 shadow-2xl shadow-black/50">
            <button
              onClick={() => void toggleMic()}
              title={isMicOn ? "Mute" : "Unmute"}
              className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-95 ${isMicOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-600 text-white"}`}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>

            <button
              onClick={() => void toggleCam()}
              title={isCamOn ? "Stop Video" : "Start Video"}
              className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-95 ${isCamOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-600 text-white"}`}
            >
              {isCamOn ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
            </button>

            <button
              onClick={() => void toggleScreenShare()}
              title={isScreenSharing ? "Stop Presenting" : "Present Now"}
              className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-95 ${isScreenSharing ? "bg-emerald-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
            >
              {isScreenSharing ? <ScreenShareOff className="w-6 h-6" /> : <MonitorUp className="w-6 h-6" />}
            </button>

            <div className="w-px h-8 bg-white/10 mx-2" />

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              title="Chat"
              className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-95 ${isChatOpen ? "bg-indigo-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
            >
              <MessageSquare className="w-6 h-6" />
            </button>

            <button
              onClick={() => void handleExit()}
              title="Leave Call"
              className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-all hover:rotate-12 active:scale-95 shadow-lg shadow-rose-900/40"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className={`w-96 bg-slate-900 border-l border-white/10 flex flex-col transition-all duration-500 ${isChatOpen ? "mr-0" : "-mr-96"}`}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <h2 className="font-black text-lg tracking-tight">In-call messages</h2>
          <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/50">
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-2xl">
            <p className="text-xs text-indigo-300 leading-relaxed font-medium">Messages can only be seen by people in the call and are deleted when the call ends.</p>
          </div>

          {messages.map((message) => (
            <div key={message.id} className={`flex flex-col ${message.isMe ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{message.sender}</span>
                <span className="text-[10px] text-slate-600">{message.time}</span>
              </div>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${message.isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white/5 text-slate-200 rounded-tl-none border border-white/5"}`}>
                {message.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={(event) => void sendMessage(event)} className="p-6 bg-slate-950/50 border-t border-white/10">
          <div className="relative">
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Send a message"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="absolute right-2 top-2 p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RemoteVideo({ stream }: { stream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0f172a_100%)]">
        <Info className="w-12 h-12 text-slate-600 animate-pulse" />
      </div>
    );
  }

  return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />;
}
