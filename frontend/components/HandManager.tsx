"use client";

import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { useHandStore } from "@/lib/store";

export default function HandManager() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const setHandData = useHandStore((state) => state.setHandData);
    const isGestureMode = useHandStore((state) => state.isGestureMode);
    const animationRef = useRef<number>(null);

    useEffect(() => {
        if (!isGestureMode) {
            // Stop Everything if mode is off
            setHandData({ isDetected: false });
            // Stop stream tracks
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        let handLandmarker: HandLandmarker | null = null;
        let webcamRunning = false;

        const setupMediaPipe = async () => {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
            );

            handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 1
            });

            startWebcam();
        };

        const startWebcam = async () => {
            if (!videoRef.current) return;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoRef.current.srcObject = stream;
                videoRef.current.addEventListener("loadeddata", predictWebcam);
                webcamRunning = true;
            } catch (err) {
                console.error("Error accessing webcam:", err);
            }
        };

        const predictWebcam = () => {
            if (!handLandmarker || !videoRef.current || !webcamRunning) return;

            const startTimeMs = performance.now();
            const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

            if (results.landmarks && results.landmarks.length > 0) {
                const landmarks = results.landmarks[0];
                // Index Finger Tip is index 8
                const indexTip = landmarks[8];
                // Thumb Tip is index 4
                const thumbTip = landmarks[4];

                // Calculate Pinch (Distance between thumb and index)
                const distance = Math.hypot(
                    indexTip.x - thumbTip.x,
                    indexTip.y - thumbTip.y
                );

                const isPinching = distance < 0.1;

                setHandData({
                    isDetected: true,
                    // Mirror X because webcam is mirrored usually
                    position: { x: 1 - indexTip.x, y: indexTip.y },
                    isPinching
                });
            } else {
                setHandData({ isDetected: false, isPinching: false });
            }

            animationRef.current = requestAnimationFrame(predictWebcam);
        };

        setupMediaPipe();

        return () => {
            webcamRunning = false;
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            // Cleanup tracks on unmount is handled by the initial check or parent unmount
        };
    }, [isGestureMode, setHandData]);

    return (
        <div className="fixed top-4 right-4 z-[60] flex flex-col items-end pointer-events-none">
            {/* Video element kept for processing but hidden */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-32 h-24 object-cover opacity-0 pointer-events-none absolute"
            />
        </div>
    );
}
