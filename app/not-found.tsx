"use client";
import { motion } from "framer-motion";
export default function NotFound() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white text-center space-y-6">
            
            <motion.h1 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 0.5 }} 
                className="text-6xl font-extrabold text-red-500"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="1.8em" height="1.8em" viewBox="0 0 24 24">
	<path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8v3a1 1 0 0 0 1 1h3m0-4v8m10-8v3a1 1 0 0 0 1 1h3m0-4v8m-11-6v4a2 2 0 1 0 4 0v-4a2 2 0 1 0-4 0" />
</svg>
            </motion.h1>

            <motion.p 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3, duration: 0.5 }} 
                className="text-lg text-white"
            >
                <span className="font-normal">This page doesn&apos;t exist.</span>
            </motion.p>

            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <a onClick={()=>{if(typeof window !== "undefined"){window.location.replace("/")}}}>
                    <button className="bg-[#252526] text-white px-5 py-3 rounded-lg text-base transition">
                        Back home
                    </button>
                </a>
            </motion.div>
            
        </main>
    );
}
