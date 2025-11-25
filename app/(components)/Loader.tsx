export default function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black z-9999">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <div className="w-16 h-16 rounded-full border-2 border-white/20 border-t-white animate-spin shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
        
        {/* Inner reverse spinning ring */}
        <div className="absolute w-10 h-10 rounded-full border-2 border-white/20 border-b-white animate-[spin_1.5s_linear_infinite_reverse]" />
        
        {/* Center dot */}
        <div className="absolute w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
      </div>
    </div>
  );
}
