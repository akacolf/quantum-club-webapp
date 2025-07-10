import Link from "next/link";
export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white text-center space-y-6">
      <h1 className="text-6xl font-extrabold text-red-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1.8em"
          height="1.8em"
          viewBox="0 0 24 24"
        >
          <path
            fill="none"
            stroke="#fff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 8v3a1 1 0 0 0 1 1h3m0-4v8m10-8v3a1 1 0 0 0 1 1h3m0-4v8m-11-6v4a2 2 0 1 0 4 0v-4a2 2 0 1 0-4 0"
          />
        </svg>
      </h1>

      <p className="text-lg text-white">
        <span className="font-normal">This page doesn&apos;t exist.</span>
      </p>

      <div>
        <Link href={"/"}>
          <button className="bg-[#252526] text-white px-5 py-3 rounded-lg text-base transition">
            Back home
          </button>
        </Link>
      </div>
    </main>
  );
}
