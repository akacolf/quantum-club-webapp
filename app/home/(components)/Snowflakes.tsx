"use client";

import { useEffect, useState, useMemo } from "react";

interface Snowflake {
    id: number;
    left: number;
    size: number;
    duration: number;
    delay: number;
    opacity: number;
    sway: number;
}

export const Snowflakes = () => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Generate snowflakes only on client-side to avoid hydration mismatch
    const snowflakes = useMemo<Snowflake[]>(() => {
        if (!isClient) return [];

        return Array.from({ length: 35 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            size: Math.random() * 8 + 6, // 6-14px
            duration: Math.random() * 8 + 8, // 8-16s fall time
            delay: Math.random() * 8, // 0-8s delay
            opacity: Math.random() * 0.4 + 0.4, // 0.4-0.8 opacity
            sway: Math.random() * 30 + 10, // 10-40px horizontal sway
        }));
    }, [isClient]);

    if (!isClient) return null;

    return (
        <>
            {/* CSS Keyframe Definitions */}
            <style jsx global>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10px) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(var(--sway)) rotate(360deg);
            opacity: 0;
          }
        }
        
        .snowflake {
          position: fixed;
          top: -20px;
          color: white;
          pointer-events: none;
          z-index: 9999;
          user-select: none;
          animation: snowfall linear infinite;
          text-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
        }
      `}</style>

            {/* Snowflake Container */}
            <div
                className="fixed inset-0 pointer-events-none overflow-hidden"
                aria-hidden="true"
            >
                {snowflakes.map((flake) => (
                    <div
                        key={flake.id}
                        className="snowflake"
                        style={{
                            left: `${flake.left}%`,
                            fontSize: `${flake.size}px`,
                            animationDuration: `${flake.duration}s`,
                            animationDelay: `${flake.delay}s`,
                            opacity: flake.opacity,
                            // @ts-expect-error - CSS custom property for sway amount
                            '--sway': `${flake.sway}px`,
                        }}
                    >
                        ❄
                    </div>
                ))}
            </div>
        </>
    );
};

export default Snowflakes;
