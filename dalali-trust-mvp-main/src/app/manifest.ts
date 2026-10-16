import type { MetadataRoute } from "next";

/** Lets phones install Dalali Trust from the browser ("Add to home screen"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dalali Trust",
    short_name: "Dalali Trust",
    description:
      "Rental homes in Tanzania with the full cost up front and listings reviewed by people. Nyumba za kupanga Tanzania zenye gharama kamili.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f3",
    theme_color: "#1a2639",
    lang: "sw",
    categories: ["lifestyle", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Find a home / Tafuta nyumba",
        url: "/properties",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "My dashboard / Dashibodi",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
