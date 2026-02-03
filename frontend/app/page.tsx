"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import JarvisBrain from "@/components/JarvisBrain";
import { MatrixCodeRain } from "@/components/MatrixRain";
import { motion, AnimatePresence } from "framer-motion";
import HandManager from "@/components/HandManager";
import { AIInput } from "@/components/ui/ai-input";
import { ChatPanel } from "@/components/ui/ChatPanel";
import VoiceCommandHandler from "@/components/VoiceCommandHandler";
import clsx from "clsx";
import { Terminal, Eye, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { useHandStore, useVoiceStore } from "@/lib/store";
import Link from "next/link";

interface Message {
  role: "user" | "jarvis";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [jarvisState, setJarvisState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false); // Prevent duplicate sends

  // Store actions
  const toggleGestureMode = useHandStore((state) => state.toggleGestureMode);
  const isGestureMode = useHandStore((state) => state.isGestureMode);
  const handData = useHandStore();

  // Voice store
  const { speak, stopSpeaking, isSpeaking } = useVoiceStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Gesture-to-Action: Pinch to send message
  useEffect(() => {
    if (handData.isDetected && handData.isPinching && messages.length > 0) {
      // Son kullanıcı mesajını tekrar gönder
      const lastUserMessage = messages.findLast(m => m.role === "user");
      if (lastUserMessage) {
        sendMessage(lastUserMessage.content);
      }
    }
  }, [handData.isPinching, messages]);

  // TTS playback when Jarvis responds
  const lastMessageRef = useRef<string>('');
  const lastSpokenRef = useRef<string>('');

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "jarvis" && isTTSEnabled && lastMessage.content) {
      // Only speak if content changed and not already speaking
      if (lastMessage.content !== lastMessageRef.current && !isSpeaking) {
        lastMessageRef.current = lastMessage.content;

        // Play TTS when message has substantial length
        const shouldSpeak = lastMessage.content.length > 10;

        if (shouldSpeak) {
          // Wait a bit for streaming to complete
          setTimeout(() => {
            if (lastSpokenRef.current !== lastMessage.content) {
              lastSpokenRef.current = lastMessage.content;
              speak(lastMessage.content);
            }
          }, 500);
        }
      }
    }
  }, [messages, isTTSEnabled, isSpeaking, speak]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isSendingRef.current) return;

    isSendingRef.current = true;

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setJarvisState("thinking");

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message }),
      });

      if (!response.ok) throw new Error("Backend connection failed");
      if (!response.body) throw new Error("No response body");

      // Streaming response parsing
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantMessage = "";

      setJarvisState("speaking");
      setMessages((prev) => [...prev, { role: "jarvis", content: "" }]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          assistantMessage += chunk;

          // Update the last assistant message
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated.findLast(m => m.role === "jarvis");
            if (lastMsg) {
              lastMsg.content = assistantMessage;
            }
            return updated;
          });
        }
      }

      setTimeout(() => {
        setJarvisState("idle");
        isSendingRef.current = false;
      }, 1000);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "jarvis", content: "ERROR: Connection Lost. Brain Offline." }]);
      setJarvisState("idle");
      isSendingRef.current = false;
    }
  };

  return (
    <main className="relative h-screen w-full flex flex-col items-center justify-center bg-black overflow-hidden font-mono text-jarvis-green selection:bg-jarvis-green selection:text-black">

      {/* 1. BACKGROUND */}
      <HandManager />
      <MatrixCodeRain />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/40 to-black pointer-events-none z-0" />
      <div className="scanlines z-50 pointer-events-none" />

      {/* Gesture Status Indicator */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsTTSEnabled(!isTTSEnabled)}
          className={clsx(
            "px-3 py-1 rounded border text-xs transition",
            isTTSEnabled
              ? "bg-jarvis-green/20 border-jarvis-green text-jarvis-green"
              : "bg-gray-900 border-gray-700 text-gray-500"
          )}
          title={isTTSEnabled ? "Voice output enabled" : "Voice output disabled"}
        >
          {isTTSEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
        <button
          onClick={toggleGestureMode}
          className={clsx(
            "px-3 py-1 rounded border text-xs transition",
            isGestureMode
              ? "bg-jarvis-green/20 border-jarvis-green text-jarvis-green"
              : "bg-gray-900 border-gray-700 text-gray-500"
          )}
        >
          {isGestureMode ? "HAND: ACTIVE" : "HAND: OFF"}
        </button>
        {handData.isDetected && (
          <span className="text-xs text-jarvis-green animate-pulse">
            {handData.isPinching ? "PINCH: SEND" : "DETECTED"}
          </span>
        )}
      </div>

      {/* State Indicator */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        {jarvisState === "listening" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1 rounded border border-red-500 bg-red-500/10 text-red-500 text-xs"
          >
            <Mic size={14} className="animate-pulse" />
            LISTENING...
          </motion.div>
        )}
        {jarvisState === "speaking" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1 rounded border border-blue-500 bg-blue-500/10 text-blue-500 text-xs"
          >
            <Volume2 size={14} className="animate-pulse" />
            SPEAKING...
          </motion.div>
        )}
        {jarvisState === "thinking" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1 rounded border border-yellow-500 bg-yellow-500/10 text-yellow-500 text-xs"
          >
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
            THINKING...
          </motion.div>
        )}
      </div>

      {/* 3. CHAT HISTORY (Floating) */}
      {messages.length > 0 && (
        <div className="absolute top-24 bottom-32 w-full max-w-4xl overflow-y-auto px-4 z-10 scrollbar-hide">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                  "mb-4 p-4 rounded-lg border backdrop-blur-md max-w-[80%]",
                  msg.role === "user"
                    ? "ml-auto border-jarvis-green/50 bg-jarvis-green/5 text-right shadow-[0_0_15px_rgba(0,255,65,0.1)]"
                    : "mr-auto border-gray-800 bg-black/80 text-left shadow-lg"
                )}
              >
                <div className="text-[10px] opacity-70 mb-1 font-bold tracking-widest">
                  {msg.role === "user" ? "USER@COMMAND_LINE:~$" : "JARVIS_CORE:"}
                </div>
                <div className="leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 4. BRAIN VISUALIZATION (Full Screen Center) */}
      <div className="absolute w-full h-full pointer-events-none z-0 opacity-50">
        <JarvisBrain state={jarvisState} />
      </div>

      {/* 5. AI Input - Chat Panel */}
      <ChatPanel onSend={sendMessage} isThinking={jarvisState === "thinking"} isSpeaking={jarvisState === "speaking"} />

      {/* Voice Command Handler */}
      <VoiceCommandHandler />

      {/* 6. Quick Links */}
      <div className="absolute bottom-6 left-6 z-40">
        <Link
          href="/ollama"
          className="flex items-center gap-2 px-3 py-1 text-xs text-jarvis-green/60 hover:text-jarvis-green border border-jarvis-green/20 hover:border-jarvis-green/50 rounded transition"
        >
          <Terminal size={14} />
          TERMINAL_MODE
        </Link>
      </div>

    </main>
  );
}
