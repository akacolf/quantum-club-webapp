export default function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black z-9999">
      <div
        className="w-10 h-10 rounded-full border-2 animate-spin text-white"
        style={{
          borderColor: "color-mix(in srgb, currentColor 25%, transparent)",
          borderTopColor: "currentColor",
        }}
      />
    </div>
  );
}
