import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/dashboard", "/_next"],
    },
    sitemap: "https://taxi-project.vercel.app/sitemap.xml",
  };
}
