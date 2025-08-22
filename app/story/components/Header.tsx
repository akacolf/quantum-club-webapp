import Lottie, { LottieRefCurrentProps } from "lottie-react";
import sparklesAnimationData from "@/public/lottie/sparkles-lottie.json";
import { useRef } from "react";

export default function StoryHeader() {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
    return (
        <div className="card bg-base-200 rounded-xl h-20 w-9/10 mx-auto">
        <div className="flex items-center justify-between">
          <div className="card-body p-4">
            <div className="font-semibold text-base">
              Your story.
              <br />
              In one place.
            </div>
          </div>
          <div className="card-body flex items-end">
            <Lottie
              lottieRef={lottieRef}
              animationData={sparklesAnimationData}
              loop={1}
              autoplay={true}
              style={{width: "2.5em", height: "2.5em"}}
            />
          </div>
        </div>
      </div>
    )
}