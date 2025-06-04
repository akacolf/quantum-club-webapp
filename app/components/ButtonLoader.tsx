'use client';

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export const ButtonLoader:React.FC= () => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex items-center justify-center">
          <div className="loading loading-spinner loading-sm" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// <div className="w-5 h-5 border-[2px] border-[#202021] border-b-[#ffffff] rounded-full inline-block box-border animate-spin [animation-duration:3s]"></div>//