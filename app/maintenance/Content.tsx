'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import Lottie from "lottie-react";
import constructionAnimation from "@/public/lottie/construction-lottie.json";
import { Users } from "lucide-react";

const MaintenanceContent = () => {
    const openTelegramGroup = () => {
        window.open("https://t.me/quantumclubinc", "_blank");
    };

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center p-6 bg-black text-white overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center w-full max-w-sm space-y-8 md:space-y-10">
                <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                    <Lottie 
                        animationData={constructionAnimation} 
                        loop={true} 
                        autoplay={true}
                        className="w-full h-full"
                    />
                </div>
                
                <div className="space-y-4 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-purple-400">
                        System Upgrade
                    </h1>
                    <p className="text-gray-400 text-base md:text-lg leading-relaxed">
                        We&apos;re currently fine-tuning the Quantum experience. 
                        Please check back shortly for improved performance and new features.
                    </p>
                </div>

                <Button 
                    onClick={openTelegramGroup}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-12 rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/20"
                >
                    <Users className="w-5 h-5 mr-2" />
                    Check Community
                </Button>
            </div>
        </div>
    );
}

export default MaintenanceContent;