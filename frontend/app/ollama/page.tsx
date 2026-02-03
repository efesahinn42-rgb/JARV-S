"use client";

import { useState, useRef, useEffect } from "react";
import { MatrixCodeRain } from "@/components/MatrixRain";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import clsx from "clsx";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";

interface Interaction {
    question: string;
    answer: string | null;
}

export default function FocusChatPage() {
    const [interaction, setInteraction] = useState<Interaction | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Ref to hold the current answer during streaming to prevent closure staleness
    const answerRef = useRef("");

    const handleSend = async (message: string, files?: File[]) => {
        if (!message.trim()) return;

        // Reset interaction state
        answerRef.current = "";
        setInteraction({ question: message, answer: null });
        setIsLoading(true);

        try {
            const response = await fetch("http://localhost:8000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) throw new Error("Connection failed");
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;

            // Initialize answer string
            setInteraction(prev => prev ? { ...prev, answer: "" } : null);

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    answerRef.current += chunk;

                    // Update state incrementally
                    setInteraction(prev => prev ? { ...prev, answer: answerRef.current } : null);
                }
            }

        } catch (error) {
            setInteraction(prev => prev ? { ...prev, answer: "ERROR: Connection Lost." } : null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative h-screen w-full bg-black overflow-hidden font-mono text-jarvis-green selection:bg-jarvis-green selection:text-black flex flex-col items-center justify-center p-4">

            {/* Background */}
            <MatrixCodeRain />
            <div className="absolute inset-0 bg-black/80 pointer-events-none z-0" />
            <div className="scanlines z-50 pointer-events-none" />

            {/* Nav */}
            <div className="absolute top-6 left-6 z-40">
                <Link href="/" className="flex items-center gap-2 px-3 py-1 hover:bg-jarvis-green/10 rounded transition text-xs text-jarvis-green/60 hover:text-jarvis-green">
                    <ChevronLeft size={16} />
                </Link>
            </div>

            {/* RESPONSE AREA (Top) */}
            <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center z-20 min-h-0 overflow-hidden mb-8">
                <AnimatePresence mode="wait">

                    {/* STATE 1: IDLE */}
                    {!interaction && !isLoading && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center"
                        >
                            <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] mb-4 opacity-30 animate-pulse text-white">
                                SYSTEM_ONLINE
                            </h1>
                        </motion.div>
                    )}

                    {/* STATE 2: ACTIVE / LOADING */}
                    {(interaction || isLoading) && (
                        <motion.div
                            key="active"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full flex flex-col items-center text-center gap-8 max-h-full overflow-y-auto scrollbar-hide px-4"
                        >
                            {/* ANSWER OR THINKING */}
                            <div className="flex-1 flex flex-col items-center justify-center w-full">
                                {interaction && interaction.answer ? (
                                    <div className="text-xl md:text-3xl text-jarvis-green leading-relaxed drop-shadow-[0_0_8px_rgba(0,255,65,0.4)] whitespace-pre-wrap max-w-full">
                                        {interaction.answer}
                                        {isLoading && <span className="animate-pulse ml-1 inline-block w-3 h-6 bg-jarvis-green align-middle" />}
                                    </div>
                                ) : (
                                    /* THINKING/LOADING */
                                    <div className="flex items-center gap-2 text-jarvis-green/70 animate-pulse text-xl">
                                        <span>THINKING</span>
                                        <span className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-jarvis-green rounded-full animate-bounce delay-100" />
                                            <span className="w-1.5 h-1.5 bg-jarvis-green rounded-full animate-bounce delay-200" />
                                            <span className="w-1.5 h-1.5 bg-jarvis-green rounded-full animate-bounce delay-300" />
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* INPUT AREA (Bottom) */}
            <div className="w-full max-w-2xl z-40 mb-4 md:mb-12">
                <PromptInputBox
                    onSend={handleSend}
                    isLoading={isLoading}
                    placeholder={interaction ? "Ask a follow-up..." : "Ask Jarvis anything..."}
                    className="border-jarvis-green/20 bg-black/80 backdrop-blur-md"
                />
            </div>

        </main>
    );
}
