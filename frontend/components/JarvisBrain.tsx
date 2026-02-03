"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial, Ring } from "@react-three/drei";
import * as THREE from "three";
import { useHandStore, useVoiceStore } from "@/lib/store";

interface JarvisBrainProps {
    state: "listening" | "thinking" | "speaking" | "idle";
}

function Particles({ state }: { state: JarvisBrainProps["state"] }) {
    const ref = useRef<THREE.Points>(null!);
    const { viewport, mouse } = useThree();

    // Hand Store
    const handData = useHandStore();

    // Voice Store for speaking state
    const isSpeaking = useVoiceStore(state => state.isSpeaking);

    // Voice command position control
    const voiceTargetPos = useRef({ x: 0, y: 0 });
    const isVoiceControlled = useRef(false);

    // Listen for voice commands
    useEffect(() => {
        const handleBrainMove = (e: CustomEvent<{ direction: string }>) => {
            const direction = e.detail.direction;
            const step = 0.5; // Movement step size

            switch (direction) {
                case 'left':
                    voiceTargetPos.current.x = Math.max(voiceTargetPos.current.x - step, -viewport.width / 2);
                    isVoiceControlled.current = true;
                    break;
                case 'right':
                    voiceTargetPos.current.x = Math.min(voiceTargetPos.current.x + step, viewport.width / 2);
                    isVoiceControlled.current = true;
                    break;
                case 'up':
                    voiceTargetPos.current.y = Math.min(voiceTargetPos.current.y + step, viewport.height / 2);
                    isVoiceControlled.current = true;
                    break;
                case 'down':
                    voiceTargetPos.current.y = Math.max(voiceTargetPos.current.y - step, -viewport.height / 2);
                    isVoiceControlled.current = true;
                    break;
                case 'center':
                    voiceTargetPos.current = { x: 0, y: 0 };
                    isVoiceControlled.current = true;
                    break;
                case 'stop':
                    isVoiceControlled.current = false;
                    break;
            }
        };

        window.addEventListener('brain-move', handleBrainMove as EventListener);
        return () => window.removeEventListener('brain-move', handleBrainMove as EventListener);
    }, [viewport]);

    const sphere = useMemo(() => {
        const positions = new Float32Array(3000 * 3);
        for (let i = 0; i < 3000; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 1.3 + (Math.random() * 0.2);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        return positions;
    }, []);

    useFrame((state, delta) => {
        if (!ref.current) return;

        // Default Animation
        let rotationSpeed = 0.2;
        let targetScale = 1;

        // State Based overrides
        if (state as any === "thinking") rotationSpeed = 2.0;
        if (state as any === "speaking" || isSpeaking) {
            rotationSpeed = 0.5;
            targetScale = 1.2;
        }

        // Voice Command Control (highest priority)
        if (isVoiceControlled.current && !handData.isDetected) {
            ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, voiceTargetPos.current.x, 0.05);
            ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, voiceTargetPos.current.y, 0.05);
        }
        // Hand Control Logic
        else if (handData.isDetected) {
            // Map 0-1 to viewport coords
            // viewport.width is total width in 3 units at z=0 (approx)
            const x = (handData.position.x * viewport.width) - (viewport.width / 2);
            const y = -(handData.position.y * viewport.height) + (viewport.height / 2); // Flip Y

            // Smooth Lerp to Hand Position
            ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, x, 0.1);
            ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, y, 0.1);

            // Gestures
            if (handData.isPinching) {
                targetScale = 0.5; // Shrink
                rotationSpeed = 0.1; // Slow down
            } else {
                // Open Hand
                rotationSpeed = 3.0; // Spin fast
                targetScale = 1.3; // Grow
            }
        } else {
            // Reset position if no hand or voice control
            ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, 0, 0.05);
            ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, 0, 0.05);
        }

        // Apply Rotation
        ref.current.rotation.y -= delta * rotationSpeed * 0.5;

        // Apply Scale
        ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, targetScale, 0.1));
    });

    // Color Logic
    let color = "#00ff41";
    if (state === "thinking") color = "#008F11";
    if (state === "speaking" || isSpeaking) color = "#ffffff";

    if (handData.isDetected) {
        if (handData.isPinching) color = "#ff0000"; // Red Warning
        else color = "#00ffaa"; // Bright Neon
    }

    return (
        <>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
                <PointMaterial
                    transparent
                    color={color}
                    size={0.02}
                    sizeAttenuation={true}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </Points>
            {/* Hand Cursor Visualization */}
            {handData.isDetected && (
                <mesh position={[
                    (handData.position.x * viewport.width) - (viewport.width / 2),
                    -(handData.position.y * viewport.height) + (viewport.height / 2),
                    0
                ]}>
                    <ringGeometry args={[0.05, 0.06, 32]} />
                    <meshBasicMaterial color={handData.isPinching ? "red" : "white"} transparent opacity={0.5} />
                </mesh>
            )}
        </>
    );
}

export default function JarvisBrain({ state }: JarvisBrainProps) {
    return (
        <div className="w-full h-full relative">
            <Canvas camera={{ position: [0, 0, 4], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <Particles state={state} />
            </Canvas>
        </div>
    );
}
