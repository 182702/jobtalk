import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VoiceBill Pro",
    short_name: "VoiceBill",
    description: "Talk through the job. Get the invoice.",
    start_url: "/new",
    display: "standalone",
    background_color: "#06102a",
    theme_color: "#06102a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
