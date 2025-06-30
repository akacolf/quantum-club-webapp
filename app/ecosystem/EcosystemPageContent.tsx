"use client";

import React, { useRef } from "react";
import ecosystemAnimationData from "../../public/images/ecosystem-lottie.json";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

const EcosystemPageContent = () => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center">
        <Lottie 
        lottieRef={lottieRef}
        animationData={ecosystemAnimationData}
        loop={true}
        autoplay={true}
        style={{ width: "20%", height: "20%" }}
        />
        <div className="text-xl text-center font-semibold">Quantum Club&apos;s ecosystem of products will be shown here. Stay tuned.</div>
    </div>
  )
};

export default EcosystemPageContent;

{
  /*<div className="p-4 text-4xl font-bold">
            Ecosystem
        </div> */
}
