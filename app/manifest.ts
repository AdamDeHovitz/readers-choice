import type { MetadataRoute } from "next";

/** Installable web app (Add to Home Screen). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Readers' Choice",
    short_name: "Readers' Choice",
    description: "Pick, vote on and rank your book club's reads together.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#efecde",
    theme_color: "#949f7f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
