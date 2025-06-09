"use client";

import React from "react";

export default function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="loading loading-spinner loading-xl" />
    </div>
  );
}

//<div
//className="w-14 h-14 border-[5px] border-[#202021] border-b-[#fff] rounded-full inline-block
// box-border animate-spin [animation-duration:3s]"
// ></div>
