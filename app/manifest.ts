import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobTalk",
    short_name: "JobTalk",
    description: "Talk through the job. Get the invoice.",
    start_url: "/new",
    display: "standalone",
    background_color: "#f6f5f1",
    theme_color: "#e8590c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
