import { Toaster, ToastBar } from "react-hot-toast";

export default function ClaimToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        // Reset default styles to allow full Tailwind control
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
          maxWidth: "500px",
        },
        success: {
          iconTheme: {
            primary: "#4ade80", // Green-400
            secondary: "black",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444", // Red-500
            secondary: "white",
          },
        },
        className: "mt-18", // Add some top margin
      }}
    >
      {(t) => (
        <ToastBar toast={t} style={{ padding: 0, background: "transparent" }}>
          {({ icon, message }) => (
            <div
              className={`
                flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300
                ${
                  t.type === "error"
                    ? "bg-[#1a1a1a]/95 border-red-500/20 text-red-50"
                    : "bg-[#1a1a1a]/95 border-[#333] text-white"
                }
              `}
            >
              <div className="shrink-0 scale-110">{icon}</div>
              <span className="text-sm font-medium pr-1">{message}</span>
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}