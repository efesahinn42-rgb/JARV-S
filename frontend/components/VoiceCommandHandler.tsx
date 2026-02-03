"use client";

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useVoiceStore } from '@/lib/store';

export default function VoiceCommandHandler() {
    const [listeningText, setListeningText] = useState('');
    const [showCommands, setShowCommands] = useState(false);
    const { isRecording, isSpeaking, startRecording, stopRecording } = useVoiceStore();
    const lastTranscriptRef = useRef<string>('');

    // Listen for voice transcription to show what Jarvis heard
    useEffect(() => {
        const handleTranscription = (e: CustomEvent<string>) => {
            const text = e.detail;
            setListeningText(text);

            // Parse voice commands for brain control
            parseVoiceCommand(text);

            // Clear after 3 seconds
            setTimeout(() => setListeningText(''), 3000);
        };

        window.addEventListener('voice-transcription', handleTranscription as EventListener);
        return () => window.removeEventListener('voice-transcription', handleTranscription as EventListener);
    }, []);

    const parseVoiceCommand = (text: string) => {
        const lowerText = text.toLowerCase();

        // Dispatch brain control events
        if (lowerText.includes('sola') || lowerText.includes('sol')) {
            window.dispatchEvent(new CustomEvent('brain-move', { detail: { direction: 'left' } }));
        } else if (lowerText.includes('sağa') || lowerText.includes('sağ')) {
            window.dispatchEvent(new CustomEvent('brain-move', { detail: { direction: 'right' } }));
        } else if (lowerText.includes('yukarı') || lowerText.includes('yukarıda')) {
            window.dispatchEvent(new CustomEvent('brain-move', { detail: { direction: 'up' } }));
        } else if (lowerText.includes('aşağı') || lowerText.includes('aşağıda')) {
            window.dispatchEvent(new CustomEvent('brain-move', { detail: { direction: 'down' } }));
        } else if (lowerText.includes('ortala') || lowerText.includes('merkez')) {
            window.dispatchEvent(new CustomEvent('brain-move', { detail: { direction: 'center' } }));
        } else if (lowerText.includes('dur') || lowerText.includes('stop')) {
            window.dispatchEvent(new CustomEvent('brain-move', { detail: { direction: 'stop' } }));
        } else if (lowerText.includes('komutlar') || lowerText.includes('ne yapabilirsin')) {
            setShowCommands(true);
            setTimeout(() => setShowCommands(false), 5000);
        }
    };

    return (
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 pointer-events-none z-50">
            {/* Recording indicator */}
            {isRecording && (
                <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="w-2 h-8 bg-red-500 rounded-full"
                                animate={{
                                    scaleY: [1, 2, 1],
                                    opacity: [0.5, 1, 0.5]
                                }}
                                transition={{
                                    duration: 0.5,
                                    repeat: Infinity,
                                    delay: i * 0.1
                                }}
                            />
                        ))}
                    </div>
                    <span className="text-red-500 font-mono text-xs tracking-widest animate-pulse">
                        DİNLİYORUM...
                    </span>
                </div>
            )}

            {/* Transcribed text display */}
            {listeningText && (
                <div className="bg-black/80 border border-jarvis-green/50 px-4 py-2 rounded-lg">
                    <span className="text-jarvis-green font-mono text-sm">{listeningText}</span>
                </div>
            )}

            {/* Available commands help */}
            {showCommands && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-black/90 border border-jarvis-green/50 p-4 rounded-lg mt-2"
                >
                    <div className="text-jarvis-green font-mono text-xs mb-2">SESLİ KOMUTLAR:</div>
                    <div className="text-gray-400 font-mono text-xs space-y-1">
                        <div>• "Sola/Sağa git" - Küreyi hareket ettir</div>
                        <div>• "Yukarı/Aşağı git" - Pozisyon değiştir</div>
                        <div>• "Ortala" - Merkeze getir</div>
                        <div>• "Dur" - Hareketi durdur</div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
