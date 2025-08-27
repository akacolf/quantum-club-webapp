import React from "react";

export default function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-10 h-10 border-[0.3rem] border-base-200 border-b-[#fff] rounded-full inline-block
      animate-spin [animation-duration:2s]" />
    </div>
  );
};

{
  /*
  <div className="fixed inset-0 flex items-center justify-center">
      <div className="loading loading-spinner loading-xl" />
  </div>
  */
}

{
  /*<div className="fixed inset-0 flex items-center justify-center">
      <div className="w-12 h-12 border-[0.3rem] border-base-200 border-b-[#fff] rounded-full inline-block
      animate-spin [animation-duration:3s]" />
    </div> */
}
