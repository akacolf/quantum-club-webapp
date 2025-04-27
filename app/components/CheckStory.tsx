"use client";

import React from "react";
import Link from "next/link";
const CheckStory = () => {
  
  const StoryNavigation = () => {
      <Link href={'/story'}/>
  };
  return (
   <div className="flex items-center justify-between bg-gray-300 p-4 rounded-2xl max-w-80 mx-auto">
    <div className="flex flex-col">
    <span className="text-lg text-black font-semibold">Quantum Era of Telegram</span>
    <span className="text-sm font-semibold text-black">Check your TG story.</span>
    <div>
    <button className="font-normal text-sm rounded-full bg-black text-white py-2 px-4 mt-4" onClick={StoryNavigation}>
      Explore
    </button>
    </div>
    </div>
    <div className="flex items-center justify-center">
    <svg xmlns="http://www.w3.org/2000/svg" width="4em" height="4em" viewBox="0 0 48 48">
	<path fill="#24A1DE" stroke="none" strokeLinecap="round" strokeLinejoin="round" d="M40.83 8.48c1.14 0 2 1 1.54 2.86l-5.58 26.3c-.39 1.87-1.52 2.32-3.08 1.45L20.4 29.26a.4.4 0 0 1 0-.65l15.37-13.88c.7-.62-.15-.92-1.07-.36L15.41 26.54a.46.46 0 0 1-.4.05L6.82 24C5 23.47 5 22.22 7.23 21.33L40 8.69a2.2 2.2 0 0 1 .83-.21M16.832 35.504a3.648 3.648 0 0 0-5.16-5.159c-2.681 2.682-4.242 5.736-4.242 5.736l3.122-.882l-2.512 3.937l3.836-2.07l-.034 2.613s2.206-1.391 4.99-4.175" strokeWidth="1" />
</svg>
    </div>
   </div>
  );
};

export default CheckStory;
