"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

type LoaderProps = {
  size?: "sm" | "md" | "lg";
  color?: string;
};

const Loader: React.FC<LoaderProps> = ({ size = "md", color = "#202021" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center"
      >
        <div
          className={`${sizeClasses[size]} border-[5px] border-b-[#fff] rounded-full inline-block
            box-border animate-spin [animation-duration:3s]`}
          style={{ borderColor: color }}
        ></div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Loader;
