"use client";

import React, { useRef } from "react";
import ecosystemAnimationData from "@/public/lottie/ecosystem-lottie.json";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const EcosystemContent = () => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  return (
    <div className="fixed inset-0 min-h-screen bg-black text-white p-6 flex flex-col pb-24">
      {/* Background Effects */}
      <div className="z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_50%)] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto relative z-10">
        
        {/* Animation Container */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
          <div className="relative w-48 h-48 flex items-center justify-center">
            <Lottie 
              lottieRef={lottieRef}
              animationData={ecosystemAnimationData}
              loop={true}
              autoplay={true}
              style={{ width: "50%", height: "50%" }}
            />
          </div>
        </div>

        {/* Content Card */}
        <Card className="bg-[#1a1a1a]/60 backdrop-blur-xl border-[#333] shadow-2xl w-full">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </Badge>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white via-gray-200 to-gray-400">
                Ecosystem
              </h1>
              <p className="text-gray-400 leading-relaxed">
                Quantum Club&apos;s ecosystem of products is currently under development. Get ready for a revolutionary platform experience.
              </p>
            </div>

            <div className="w-full pt-4 border-t border-[#333]">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                Beta Access Opening Soon
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
};

export default EcosystemContent;
