import React from "react";

export const ButtonLoader: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="loading loading-spinner loading-sm" />
    </div>
  );
};

// <div className="w-5 h-5 border-[2px] border-[#202021] border-b-[#ffffff] rounded-full inline-block box-border animate-spin [animation-duration:3s]"></div>//
