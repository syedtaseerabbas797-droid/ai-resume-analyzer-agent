// Vercel SSR deployment — Nitro preset set to 'vercel' so TanStack Start
// emits a .vercel/output bundle instead of a Cloudflare Worker bundle.
// @lovable.dev/vite-tanstack-config already includes the Cloudflare plugin;
// by setting server.preset here we override its target without any extra package.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { preset: "vercel", entry: "server" },
  },
});
