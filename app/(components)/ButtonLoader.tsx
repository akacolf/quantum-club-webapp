import React from "react";

export const ButtonLoader: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="loading loading-spinner loading-sm" />
    </div>
  );
};
