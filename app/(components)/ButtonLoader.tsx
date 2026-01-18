export function ButtonLoader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-5 h-5 border-2",
    lg: "w-6 h-6 border-[2.5px]",
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full border-white/20 border-t-white animate-spin`}
    />
  );
}
