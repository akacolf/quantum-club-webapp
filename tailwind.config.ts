import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      keyframes: {
        "float-slow": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-10px, -10px)" },
        },
      },
      animation: {
        "float-slow": "float-slow 10s ease-in-out infinite",
      },
    },
  },
};

export default config;

