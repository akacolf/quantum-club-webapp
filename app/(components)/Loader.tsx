export default function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div
        className="
          inline-block
          w-12 h-12
          border-5 border-base-200 border-b-white
          rounded-full
          box-border
          animate-spin
          [animation-duration:3s]
        "
      />
    </div>
  );
}
