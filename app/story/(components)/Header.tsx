import Lottie, { LottieRefCurrentProps } from "lottie-react";
import sparklesAnimationData from "@/public/lottie/sparkles-lottie.json";
import { useRef } from "react";

export default function StoryHeader() {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
    return (
          <Lottie
              lottieRef={lottieRef}
              animationData={sparklesAnimationData}
              loop={1}
              autoplay={true}
              style={{width: "2.5em", height: "2.5em"}}
            />
          
    )
}