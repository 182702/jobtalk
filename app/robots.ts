import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/i/", "/invoices", "/new", "/settings", "/billing"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
