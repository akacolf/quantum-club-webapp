'use client';

import { AnimatePresence, motion } from "framer-motion";

export default function RewardsHistory() {
  return (
    <AnimatePresence>
      <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      className="flex flex-col overflow-auto"
      >
        <div className="flex items-center justify-center h-screen">
          <div>This feature is under development.</div>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}