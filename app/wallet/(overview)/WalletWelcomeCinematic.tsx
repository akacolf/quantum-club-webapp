"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";

export default function WalletWelcomeCinematic() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        ".wallet-cinema-line",
        { scaleX: 0, opacity: 0 },
        {
          scaleX: 1,
          opacity: 1,
          duration: 1.35,
          ease: "power3.out",
          stagger: 0.09,
        }
      );
      gsap.to(".wallet-cinema-orbit", {
        rotate: 360,
        duration: 18,
        ease: "none",
        repeat: -1,
        stagger: 1.8,
      });
      gsap.to(".wallet-cinema-glow", {
        scale: 1.12,
        opacity: 0.78,
        duration: 2.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
      gsap.to(".wallet-cinema-vault", {
        y: -8,
        duration: 3.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }, root);

    return () => context.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative h-72 w-full overflow-hidden bg-black">
      <div className="wallet-cinema-glow absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_34%),linear-gradient(180deg,transparent,rgba(0,0,0,0.86))]" />

      <div className="absolute inset-x-8 top-10 space-y-4">
        {[0, 1, 2, 3, 4].map((line) => (
          <div
            key={line}
            className="wallet-cinema-line h-px origin-left bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ width: `${72 + line * 7}%`, marginLeft: `${line % 2 === 0 ? 0 : 16}px` }}
          />
        ))}
      </div>

      <motion.div
        className="wallet-cinema-vault absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0.84 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-sm" />
        <div className="absolute inset-4 rounded-[1.5rem] border border-white/15 bg-black" />
        <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-white/[0.04]" />
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </motion.div>

      {[0, 1, 2].map((orbit) => (
        <div
          key={orbit}
          className="wallet-cinema-orbit absolute left-1/2 top-1/2 rounded-full border border-white/10"
          style={{
            width: `${178 + orbit * 40}px`,
            height: `${178 + orbit * 40}px`,
            marginLeft: `${-(178 + orbit * 40) / 2}px`,
            marginTop: `${-(178 + orbit * 40) / 2}px`,
            transform: `rotate(${orbit * 24}deg)`,
          }}
        >
          <div className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/70" />
        </div>
      ))}

      <motion.div
        className="absolute bottom-6 left-1/2 h-px w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
        initial={{ opacity: 0, scaleX: 0.35 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.35, duration: 0.8 }}
      />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
