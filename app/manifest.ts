import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quantum Club",
    short_name: "QC",
    description: "Web3 Super App on TON",
    start_url: "/home",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/png/qc-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/png/qc-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
