// Cloudflare Workers deployment via @cloudflare/vite-plugin (included in
// @lovable.dev/vite-tanstack-config). The 'cloudflare' preset tells Nitro/
// TanStack Start to emit a Cloudflare Worker bundle to .wrangler/output/.
// wrangler.jsonc points 'main' at src/server.ts which is the worker entry.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { preset: "cloudflare", entry: "server" },
  },
});
