import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

/** Public pages for search engines. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return ["", "/signup", "/login", "/support", "/privacy", "/terms"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
