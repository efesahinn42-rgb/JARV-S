"use client";

import { create } from 'zustand';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: Event) => void) | null;
}

interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
}

interface VoiceState {
    isRecording: boolean;
    isSpeaking: boolean;
    transcript: string;
    lastTranscript: string;
    lastTranscriptTime: number;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    speak: (text: string) => Promise<void>;
    stopSpeaking: () => void;
}

// Brain control commands that should NOT be sent to AI
const BRAIN_CONTROL_COMMANDS = [
    'sola', 'sağa', 'sol', 'sağ',
    'yukarı', 'aşağı', 'yukarıda', 'aşağıda',
    'ortala', 'merkez', 'dur', 'stop',
    'git', 'hareket', 'hareket ettir'
];

export const useVoiceStore = create<VoiceState>((set, get) => ({
    isRecording: false,
    isSpeaking: false,
    transcript: '',
    lastTranscript: '',
    lastTranscriptTime: 0,

    startRecording: async () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return;
        }

        const SpeechRecognition = (window as unknown as Window).SpeechRecognition || (window as unknown as Window).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'tr-TR'; // Turkish

        recognition.onstart = () => {
            set({ isRecording: true, transcript: '' });
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                // Check if it's a brain control command
                const lowerTranscript = finalTranscript.toLowerCase();
                const isBrainCommand = BRAIN_CONTROL_COMMANDS.some(cmd =>
                    lowerTranscript.includes(cmd)
                );

                // Prevent duplicate transcriptions (within 2 seconds)
                const now = Date.now();
                const { lastTranscript, lastTranscriptTime } = get();

                if (isBrainCommand) {
                    // Dispatch brain control event instead
                    window.dispatchEvent(new CustomEvent('voice-transcription', {
                        detail: finalTranscript
                    }));
                } else if (
                    finalTranscript !== lastTranscript ||
                    now - lastTranscriptTime > 2000
                ) {
                    // New transcript or enough time passed
                    set({ transcript: finalTranscript, lastTranscript: finalTranscript, lastTranscriptTime: now });
                    // Dispatch event for other components
                    window.dispatchEvent(new CustomEvent('voice-transcription', { detail: finalTranscript }));
                }
            }
        };

        recognition.onerror = (event: Event) => {
            console.error('Speech recognition error:', event);
            set({ isRecording: false });
        };

        recognition.onend = () => {
            set({ isRecording: false });
        };

        (window as any).__speechRecognition = recognition;
        recognition.start();
    },

    stopRecording: async () => {
        const recognition = (window as any).__speechRecognition as SpeechRecognition | undefined;
        if (recognition) {
            recognition.stop();
        }
        set({ isRecording: false });
    },

    speak: async (text: string) => {
        const { stopSpeaking } = get();
        stopSpeaking();

        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = speechSynthesis.getVoices();
        const turkishVoice = voices.find(
            voice => voice.lang.includes('tr') || voice.name.toLowerCase().includes('mehmet')
        );
        if (turkishVoice) {
            utterance.voice = turkishVoice;
        }

        utterance.onstart = () => set({ isSpeaking: true });
        utterance.onend = () => set({ isSpeaking: false });
        utterance.onerror = () => set({ isSpeaking: false });

        (window as any).__currentUtterance = utterance;
        speechSynthesis.speak(utterance);
    },

    stopSpeaking: () => {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            (window as any).__currentUtterance = null;
        }
        set({ isSpeaking: false });
    },
}));

interface HandState {
    isDetected: boolean;
    position: { x: number; y: number };
    isPinching: boolean;
    isGestureMode: boolean;
    setHandData: (data: Partial<HandState>) => void;
    toggleGestureMode: () => void;
}

export const useHandStore = create<HandState>((set) => ({
    isDetected: false,
    position: { x: 0.5, y: 0.5 },
    isPinching: false,
    isGestureMode: true,
    setHandData: (data) => set((state) => ({ ...state, ...data })),
    toggleGestureMode: () => set((state) => ({ isGestureMode: !state.isGestureMode })),
}));
