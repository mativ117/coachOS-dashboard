import { defineConfig } from "vite";
import { pwa } from "./scripts/pwa.ts";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), pwa()],
  base: "/coachOS-dashboard/",
});
