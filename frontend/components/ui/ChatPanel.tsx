"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, X, Mic, MicOff, Volume2, MessageSquare, User, Bot } from "lucide-react"
import { useVoiceStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface ChatPanelProps {
    onSend: (message: string) => void;
    isThinking: boolean;
    isSpeaking: boolean;
}

// Brain control commands that should NOT be sent to AI
const BRAIN_CONTROL_COMMANDS = [
    'sola', 'sağa', 'sol', 'sağ',
    'yukarı', 'aşağı', 'yukarıda', 'aşağıda',
    'ortala', 'merkez', 'dur', 'stop',
    'git', 'hareket', 'hareket ettir', 'üste', 'alta'
];

interface Message {
    role: "user" | "jarvis";
    content: string;
}

export function ChatPanel({ onSend, isThinking, isSpeaking }: ChatPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isRecording, setIsRecordingState] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { startRecording, stopRecording, isRecording: isRecordingGlobal, speak } = useVoiceStore();

    // Listen for voice transcription events
    useEffect(() => {
        const handleTranscription = (e: CustomEvent<string>) => {
            const text = e.detail;
            const lowerText = text.toLowerCase();

            // Check if it's a brain control command
            const isBrainCommand = BRAIN_CONTROL_COMMANDS.some(cmd =>
                lowerText.includes(cmd)
            );

            // Only update input if it's NOT a brain control command
            if (!isBrainCommand) {
                setInputValue(text);
            }
        };

        window.addEventListener('voice-transcription', handleTranscription as EventListener);
        return () => window.removeEventListener('voice-transcription', handleTranscription as EventListener);
    }, []);

    // Update local recording state from store
    useEffect(() => {
        setIsRecordingState(isRecordingGlobal);
    }, [isRecordingGlobal]);

    // Recording timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            setRecordingTime(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleRecordClick = useCallback(async () => {
        if (!isRecording) {
            try {
                await startRecording();
            } catch (error) {
                console.error('Failed to start recording:', error);
            }
        } else {
            await stopRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim()) return;

        // Add user message
        setMessages(prev => [...prev, { role: "user", content: inputValue }]);

        // Send to AI
        onSend(inputValue);

        setInputValue("");
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="absolute top-4 right-4 z-50">
            <AnimatePresence mode="wait">
                {!isOpen ? (
                    // KÜÇÜK BUTONLAR - Sağ üstte
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="flex items-center gap-3"
                    >
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-jarvis-green/20 border border-jarvis-green/50 rounded-full text-jarvis-green text-sm font-bold hover:bg-jarvis-green/30 transition-all shadow-[0_0_20px_rgba(0,255,65,0.3)]"
                        >
                            <MessageSquare size={16} />
                            JARVIS İLE KONUŞ
                        </motion.button>

                        {/* Hand Active Butonu */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900/80 border border-jarvis-green/30 rounded-full text-jarvis-green/70 text-sm font-medium hover:text-jarvis-green hover:border-jarvis-green/50 transition-all"
                        >
                            <User size={16} />
                            HAND ACTIVE
                        </motion.button>
                    </motion.div>
                ) : (
                    // BÜYÜK PANEL
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, x: 50 }}
                        animate={{ scale: 1, opacity: 1, x: 0 }}
                        exit={{ scale: 0.8, opacity: 0, x: 50 }}
                        className="bg-black/95 border border-jarvis-green/50 rounded-2xl shadow-[0_0_40px_rgba(0,255,65,0.2)] overflow-hidden w-80"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-jarvis-green/30 bg-jarvis-green/5">
                            <div className="flex items-center gap-2">
                                <Bot size={20} className="text-jarvis-green" />
                                <span className="text-jarvis-green font-bold">JARVIS AI</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Mikrofon Butonu */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={handleRecordClick}
                                    className={cn(
                                        "p-2 rounded-full transition-all",
                                        isRecording
                                            ? "bg-red-500 text-white animate-pulse"
                                            : "bg-jarvis-green/20 text-jarvis-green hover:bg-jarvis-green/30"
                                    )}
                                    title={isRecording ? "Dinlemeyi durdur" : "Sesli komut başlat"}
                                >
                                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                                </motion.button>

                                {/* Kapat Butonu */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                                >
                                    <X size={18} />
                                </motion.button>
                            </div>
                        </div>

                        {/* Mesajlar */}
                        <div className="h-48 overflow-y-auto p-3 space-y-2">
                            {messages.length === 0 && (
                                <div className="text-center text-gray-500 text-xs py-4">
                                    Jarvis ile konuşmaya başlayın...
                                </div>
                            )}
                            {messages.map((msg, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "p-2 rounded-lg text-xs",
                                        msg.role === "user"
                                            ? "bg-jarvis-green/20 text-right ml-4"
                                            : "bg-gray-800/50 mr-4"
                                    )}
                                >
                                    <div className="font-bold text-[10px] opacity-70 mb-1">
                                        {msg.role === "user" ? "SİZ" : "JARVIS"}
                                    </div>
                                    {msg.content}
                                </motion.div>
                            ))}
                            {(isThinking || isSpeaking) && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-gray-800/50 p-2 rounded-lg text-xs mr-4"
                                >
                                    <span className="animate-pulse">Yazıyor...</span>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Alanı */}
                        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-jarvis-green/20">
                            <div className={cn(
                                "w-1 h-6 rounded-full transition-colors",
                                isRecording ? "bg-red-500 animate-pulse" : "bg-jarvis-green"
                            )} />

                            <input
                                autoFocus
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={isRecording ? "Dinliyorum..." : "Mesaj yazın..."}
                                className="flex-1 bg-transparent text-white text-xs font-mono placeholder:text-gray-500 focus:outline-none"
                                disabled={isRecording}
                            />

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                disabled={!inputValue.trim() || isRecording}
                                className={cn(
                                    "p-2 rounded-full transition-all",
                                    inputValue.trim() && !isRecording
                                        ? "bg-jarvis-green text-black"
                                        : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                )}
                            >
                                <Send size={14} />
                            </motion.button>
                        </form>

                        {/* Kayıt Göstergesi */}
                        {isRecording && (
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                className="h-1 bg-red-500 origin-left"
                            >
                                <motion.div
                                    animate={{ x: ["-100%", "100%"] }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="absolute top-0 left-0 w-1/2 h-full bg-red-400"
                                />
                            </motion.div>
                        )}

                        {/* Kayıt Süresi */}
                        {isRecording && (
                            <div className="px-3 py-1 bg-red-500/20 border-t border-red-500/30">
                                <span className="text-red-500 text-xs font-mono">
                                    {formatTime(recordingTime)}
                                </span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
