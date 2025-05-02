"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function Loader() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center"
      >
        <div
          className={`w-14 h-14 md:w-16 lg:w-20 border-[5px] border-[#202021] border-b-[#fff] rounded-full inline-block
            box-border animate-spin [animation-duration:3s]`}
        ></div>
      </motion.div>
    </AnimatePresence>
  );
};
