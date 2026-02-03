"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';

// Using Katakana and standard characters for that authentic look
const KATAKANA = 'アカサタナハマヤラワガザダバパイキシチニヒミリギジヂビピウクスツヌフムユルグズヅブプエケセテネヘメレゲゼデベペオコソトノホモヨロヲゴゾドボポヴッン';
const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CHARS = KATAKANA + LATIN;

export const MatrixCodeRain = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Hardcoded best settings for the background
    const fontSize = 16;
    const speed = 1;
    const density = 1;
    const textColor = '#00FF41';

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        // Resize handler
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        // Columns config
        const columns = Math.floor(canvas.width / fontSize);
        const drops: number[] = new Array(columns).fill(1); // Y position of each drop

        const draw = () => {
            // Semi-transparent black rect to create fade trail effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = textColor;
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                // Random char
                const text = CHARS.charAt(Math.floor(Math.random() * CHARS.length));
                // x = column index * font size, y = drop value * font size
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                // Randomly reset drop to top, or move down
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        }

    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 opacity-40 pointer-events-none"
        />
    );
};
