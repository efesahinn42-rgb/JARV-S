"use client"

import React, { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Send, X, Mic, MicOff, Volume2, MessageSquare } from "lucide-react"
import { useVoiceStore } from "@/lib/store"

interface AIInputProps {
    onSend: (message: string) => void;
    isThinking: boolean;
}

// Brain control commands that should NOT be sent to AI
const BRAIN_CONTROL_COMMANDS = [
    'sola', 'sağa', 'sol', 'sağ',
    'yukarı', 'aşağı', 'yukarıda', 'aşağıda',
    'ortala', 'merkez', 'dur', 'stop',
    'git', 'hareket', 'hareket ettir', 'üste', 'alta'
];

export function AIInput({ onSend, isThinking }: AIInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isRecording, setIsRecordingState] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const { startRecording, stopRecording, isRecording: isRecordingGlobal } = useVoiceStore();

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
                setIsOpen(true);
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
        onSend(inputValue);
        setInputValue("");
        setIsOpen(false);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative flex items-center justify-center min-h-[120px] w-full z-50">
            <AnimatePresence mode="popLayout">
                {!isOpen ? (
                    // BÜYÜK VE GÖRÜNÜR BUTON
                    <motion.div
                        layoutId="wrapper"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        className="cursor-pointer group"
                        onClick={() => setIsOpen(true)}
                    >
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            {/* Dış Halka - Pulse Efekti */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.3, 0.6, 0.3]
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className={cn(
                                    "absolute inset-0 rounded-full border-2",
                                    isRecording
                                        ? "border-red-500"
                                        : "border-jarvis-green"
                                )}
                            />

                            {/* İç Halka */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className={cn(
                                    "absolute inset-2 rounded-full border border-dashed",
                                    isRecording
                                        ? "border-red-500/50"
                                        : "border-jarvis-green/50"
                                )}
                            />

                            {/* Ana Buton - Glow Efekti */}
                            <div className={cn(
                                "relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
                                isRecording
                                    ? "bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                                    : "bg-jarvis-green/10 shadow-[0_0_30px_rgba(0,255,65,0.3)] group-hover:shadow-[0_0_50px_rgba(0,255,65,0.5)] group-hover:bg-jarvis-green/20"
                            )}>
                                {isThinking ? (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className="w-6 h-6 rounded-full bg-jarvis-green/50"
                                    />
                                ) : isRecording ? (
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map((i) => (
                                            <motion.div
                                                key={i}
                                                className="w-2 h-4 bg-red-500 rounded-full"
                                                animate={{ scaleY: [1, 2, 1] }}
                                                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <MessageSquare
                                        size={24}
                                        className={cn(
                                            "transition-colors",
                                            isRecording ? "text-red-500" : "text-jarvis-green"
                                        )}
                                    />
                                )}
                            </div>

                            {/* Ses Butonu - Küçük Göstergeler */}
                            {isRecording && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                                >
                                    <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                                </motion.div>
                            )}

                            {/* Etiket */}
                            <motion.div
                                animate={{ opacity: isRecording ? 1 : [0.5, 1, 0.5] }}
                                transition={{ duration: isRecording ? 0.5 : 2, repeat: Infinity }}
                                className={cn(
                                    "absolute -bottom-8 text-xs font-bold tracking-wider px-3 py-1 rounded-full",
                                    isRecording
                                        ? "text-red-500 bg-red-500/10"
                                        : "text-jarvis-green bg-jarvis-green/10"
                                )}
                            >
                                {isRecording ? `DINLIYOR ${formatTime(recordingTime)}` : 'JARVIS İLE KONUŞ'}
                            </motion.div>
                        </div>
                    </motion.div>
                ) : (
                    // AÇIK PANEL - Daha Geniş ve Görünür
                    <motion.div
                        layoutId="wrapper"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                        className="relative w-full max-w-lg bg-black/90 border-2 border-jarvis-green/50 rounded-2xl shadow-[0_0_40px_rgba(0,255,65,0.2)] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-jarvis-green/30 bg-jarvis-green/5">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={16} className="text-jarvis-green" />
                                <span className="text-jarvis-green font-bold text-sm tracking-widest">
                                    JARVIS ASISTAN
                                </span>
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

                        {/* Input Alanı */}
                        <form onSubmit={handleSubmit} className="flex items-center gap-3 p-4">
                            <div className={cn(
                                "w-1 h-8 rounded-full transition-colors",
                                isRecording ? "bg-red-500 animate-pulse" : "bg-jarvis-green"
                            )} />

                            <input
                                autoFocus
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={isRecording ? "Dinliyorum..." : "Bir soru sor veya sesli komut ver..."}
                                className="flex-1 bg-transparent text-white text-base font-mono placeholder:text-gray-500 focus:outline-none"
                                disabled={isRecording}
                            />

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                disabled={!inputValue.trim() || isRecording}
                                className={cn(
                                    "px-4 py-2 rounded-full font-bold text-sm transition-all",
                                    inputValue.trim() && !isRecording
                                        ? "bg-jarvis-green text-black hover:shadow-[0_0_20px_rgba(0,255,65,0.5)]"
                                        : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                )}
                            >
                                <Send size={16} />
                            </motion.button>
                        </form>

                        {/* Durum Çubuğu */}
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

                        {/* Alt Bilgi */}
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-t border-gray-800">
                            <span className="text-[10px] text-gray-500">
                                Sesli komutlar için mikrofon ikonuna basın
                            </span>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-jarvis-green animate-pulse" />
                                <span className="text-[10px] text-jarvis-green">Hazır</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
