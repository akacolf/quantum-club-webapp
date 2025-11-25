export function ButtonLoader() {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-4 h-4">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-current border-t-transparent border-l-transparent opacity-90 animate-spin" />
        
        {/* Inner Ring (Reverse Spin) */}
        <div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full border-2 border-current border-b-transparent border-r-transparent opacity-90 animate-[spin_1s_linear_infinite_reverse]" />
      </div>
    </div>
  )
}
