export default function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <span
        className="
          inline-block
          w-12 h-12
          border-4 border-neutral-800 border-b-white
          rounded-full
          animate-spin
          animation-duration-[3s]
        "
      />
    </div>
  );
}
