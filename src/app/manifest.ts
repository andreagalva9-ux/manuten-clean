import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Manuten & Clean · Fogli di lavoro",
    short_name: "Fogli di lavoro",
    description:
      "Compilazione e archivio digitale dei fogli di lavoro di Manuten & Clean.",
    start_url: "/nuovo",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#086660",
    lang: "it",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
