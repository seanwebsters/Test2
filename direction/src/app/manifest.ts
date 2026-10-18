import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DIRECTION",
    short_name: "Direction",
    description: "Find your path. Build your future.",
    start_url: "/home",
    display: "standalone",
    background_color: "#FBF8F3",
    theme_color: "#0EAA9C",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
