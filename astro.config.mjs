// @ts-check
import { defineConfig } from "astro/config";

import vercel from "@astrojs/vercel";

import tailwindcss from "@tailwindcss/vite";

import preact from "@astrojs/preact";

// https://astro.build/config
export default defineConfig({
  site: "https://literasibrebesan.my.id",
  output: "server",
  adapter: vercel(),

  vite: {
    plugins: [tailwindcss()],
  },

  security: {
    // Proteksi CSRF bawaan Astro: POST lintas-origin ke server action ditolak.
    checkOrigin: true,
  },

  prefetch: {
    prefetchAll: false, // Jangan semua link di-prefetch otomatis
    defaultStrategy: "load",
  },

  integrations: [preact()],
  image: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
});