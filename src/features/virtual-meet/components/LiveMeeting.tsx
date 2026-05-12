"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { 
  Camera, CameraOff, Mic, MicOff, PhoneOff, 
  MonitorUp, ScreenShareOff, Users, MessageSquare, 
  Settings, Maximize, Grid, Layout, Send, X, Shield, Info
} from "lucide-react";

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

interface LiveMeetingProps {
  roomId: string;
  userName: string;
  onExit: () => void;
  wsUrl?: string;
}

export default function LiveMeeting({ roomId, userName, onExit, wsUrl = "ws://localhost:8080" }: LiveMeetingProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "speaker">("grid");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const pcMap = useRef<Map<string, RTCPeerConnection>>(new Map());
  const ws = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Media initialization helper

  const createPeerConnection = useCallback((peerId: string, peerName: string, isOffer: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: "ice",
          roomId,
          from: userName,
          to: peerId,
          payload: event.candidate
        }));
      }
    };

    pc.ontrack = (event) => {
      setRemotePeers(prev => {
        const existing = prev.find(p => p.id === peerId);
        if (existing) {
          return prev.map(p => p.id === peerId ? { ...p, stream: event.streams[0] } : p);
        }
        return [...prev, { id: peerId, name: peerName, stream: event.streams[0], audioEnabled: true, videoEnabled: true }];
      });
    };

    localStreamRef.current?.getTracks().forEach(track => {
      if (localStreamRef.current) pc.addTrack(track, localStreamRef.current);
    });

    if (isOffer) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        ws.current?.send(JSON.stringify({
          type: "offer",
          roomId,
          from: userName,
          to: peerId,
          payload: offer
        }));
      });
    }

    pcMap.current.set(peerId, pc);
    return pc;
  }, [roomId, userName]);

  useEffect(() => {
    let isMounted = true;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        if (isMounted) {
          setLocalStream(stream);
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };

    void startMedia();

    // Signaling server mock logic
    console.log(`Connecting to signaling server at ${wsUrl} (Room: ${roomId})`);

    const mockTimeout = setTimeout(() => {
      if (isMounted) {
        setMessages([
          { id: "1", sender: "System", text: `Welcome to ${roomId}! You are the first one here.`, time: new Date().toLocaleTimeString(), isMe: false },
          { id: "2", sender: "Assistant", text: "I'll help you manage the session. Camera and Mic are ready.", time: new Date().toLocaleTimeString(), isMe: false }
        ]);
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(mockTimeout);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcMap.current.forEach(pc => pc.close());
      ws.current?.close();
    };
  }, [roomId, wsUrl]);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCam = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !isCamOn);
      setIsCamOn(!isCamOn);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        pcMap.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(videoTrack);
        });
        
        videoTrack.onended = () => stopScreenShare();
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      const videoTrack = localStream.getVideoTracks()[0];
      pcMap.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);
      });
    }
    setIsScreenSharing(false);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: userName,
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };
    
    setMessages([...messages, newMsg]);
    setChatInput("");
    
    // In real app: ws.current?.send(JSON.stringify({ type: "chat", text: chatInput }));
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950 text-white font-sans overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-900/40">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
                {roomId}
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

        {/* Video Grid */}
        <div className="flex-1 relative p-4 md:p-8 flex items-center justify-center overflow-hidden">
          <div className={`grid gap-6 w-full h-full max-w-7xl transition-all duration-700 ${
            remotePeers.length === 0 ? "grid-cols-1" : 
            remotePeers.length === 1 ? "grid-cols-1 md:grid-cols-2" : 
            remotePeers.length <= 3 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3"
          }`}>
            {/* Local Video */}
            <div className="relative group rounded-[32px] overflow-hidden bg-slate-900 border border-white/10 aspect-video shadow-2xl ring-1 ring-white/5">
              <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                className={`w-full h-full object-cover transition-all duration-700 ${isCamOn ? "opacity-100 scale-100" : "opacity-0 scale-110"}`}
              />
              {!isCamOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0f172a_100%)]">
                  <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center border-4 border-indigo-400/20 shadow-2xl shadow-indigo-500/20">
                    <span className="text-4xl font-black text-white">{userName.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-xl">
                <span className="text-sm font-bold text-white">{userName} (You)</span>
                {!isMicOn && <MicOff className="w-4 h-4 text-rose-500" />}
              </div>
            </div>

            {/* Remote Videos (Placeholder logic for multiple peers) */}
            {remotePeers.map(peer => (
              <div key={peer.id} className="relative group rounded-[32px] overflow-hidden bg-slate-900 border border-white/10 aspect-video shadow-2xl ring-1 ring-white/5">
                <RemoteVideo stream={peer.stream} />
                <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-xl">
                  <span className="text-sm font-bold text-white">{peer.name}</span>
                  {!peer.audioEnabled && <MicOff className="w-4 h-4 text-rose-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-4 bg-slate-900/90 backdrop-blur-3xl p-3 px-6 rounded-[32px] border border-white/10 shadow-2xl shadow-black/50">
            <button 
              onClick={toggleMic}
              title={isMicOn ? "Mute" : "Unmute"}
              className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-95 ${isMicOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-600 text-white"}`}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
            
            <button 
              onClick={toggleCam}
              title={isCamOn ? "Stop Video" : "Start Video"}
              className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-95 ${isCamOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-600 text-white"}`}
            >
              {isCamOn ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
            </button>

            <button 
              onClick={toggleScreenShare}
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
              onClick={onExit}
              title="Leave Call"
              className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-all hover:rotate-12 active:scale-95 shadow-lg shadow-rose-900/40"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
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
          
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{msg.sender}</span>
                <span className="text-[10px] text-slate-600">{msg.time}</span>
              </div>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white/5 text-slate-200 rounded-tl-none border border-white/5"}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="p-6 bg-slate-950/50 border-t border-white/10">
          <div className="relative">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
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
      <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
        <Info className="w-12 h-12 text-slate-600 animate-pulse" />
      </div>
    );
  }

  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      className="w-full h-full object-cover"
    />
  );
}
