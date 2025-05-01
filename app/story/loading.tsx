'use client';
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Loader from "../loading";

export default function StoryLoading() {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <Loader />
            </motion.div>
        </AnimatePresence>
    )
};