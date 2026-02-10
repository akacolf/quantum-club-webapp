export function ButtonLoader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "w-4 h-4 border-2", md: "w-5 h-5 border-2", lg: "w-6 h-6 border-[2.5px]" };

  return (
    <span
      className={`${dims[size]} inline-block rounded-full animate-spin`}
      style={{
        borderColor: "color-mix(in srgb, currentColor 25%, transparent)",
        borderTopColor: "currentColor",
      }}
    />
  );
}
