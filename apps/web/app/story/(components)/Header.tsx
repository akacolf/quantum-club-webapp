import Lottie, { LottieRefCurrentProps } from "lottie-react";
import sparklesAnimationData from "@/public/lottie/sparkles-lottie.json";
import { useRef } from "react";

export default function StoryHeader() {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
    return (
        <div className="flex flex-col items-center justify-center space-y-4 py-6 px-4">
            <div className="w-20 h-20 flex items-center justify-center bg-yellow-500/10 rounded-2xl border border-yellow-500/20 shadow-[0_0_30px_-10px_rgba(234,179,8,0.3)]">
                <Lottie
                    lottieRef={lottieRef}
                    animationData={sparklesAnimationData}
                    loop={1}
                    autoplay={true}
                    className="w-full h-full scale-125"
                />
            </div>
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">Your Legacy</h1>
                <p className="text-gray-400 text-sm max-w-[250px] mx-auto leading-relaxed">
                    Your journey through the Quantum ecosystem and achievements
                </p>
            </div>
        </div>
    )
}