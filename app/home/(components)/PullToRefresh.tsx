"use client";

import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Icon } from "@iconify/react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
}

export default function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  className = "",
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const rotate = useTransform(y, [0, threshold], [0, 180]);
  const scale = useTransform(y, [0, threshold / 2, threshold], [0.5, 0.8, 1]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    
    // Only enable pull-to-refresh when at the top of the page
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    // Only allow pulling down
    if (diff > 0) {
      // Apply resistance to make it feel more natural
      const resistance = 0.5;
      const pullDistance = Math.min(diff * resistance, threshold * 1.5);
      y.set(pullDistance);
    }
  }, [isPulling, isRefreshing, y, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || isRefreshing) return;
    
    setIsPulling(false);
    const currentPull = y.get();
    
    if (currentPull >= threshold) {
      // Trigger refresh
      setIsRefreshing(true);
      animate(y, threshold, { duration: 0.2 });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(y, 0, { duration: 0.3 });
      }
    } else {
      // Snap back
      animate(y, 0, { duration: 0.2 });
    }
  }, [isPulling, isRefreshing, y, threshold, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
        style={{ 
          y: useTransform(y, (v) => v - 50),
          opacity 
        }}
      >
        <motion.div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isRefreshing 
              ? "bg-purple-500/20 ring-2 ring-purple-500/30" 
              : "bg-[#222] ring-1 ring-[#333]"
          }`}
          style={{ scale }}
        >
          <motion.div
            style={{ rotate: isRefreshing ? undefined : rotate }}
            animate={isRefreshing ? { rotate: 360 } : undefined}
            transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : undefined}
          >
            <Icon icon="lucide:refresh-cw" className={`w-5 h-5 ${isRefreshing ? "text-purple-400" : "text-gray-400"}`} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}
